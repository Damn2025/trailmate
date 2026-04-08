import { Router } from "express";
import { z } from "zod";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { prisma } from "../prisma.js";
import { decryptString } from "../crypto.js";
import { env } from "../env.js";

export const aiRouter = Router();
aiRouter.use(requireAuth);

function toSafeAiError(e: unknown) {
  // @google/generative-ai throws GoogleGenerativeAIFetchError with helpful fields.
  const anyErr = e as any;
  const status = typeof anyErr?.status === "number" ? anyErr.status : undefined;
  const details = anyErr?.errorDetails;

  if (status === 400) {
    const invalidKey =
      Array.isArray(details) &&
      details.some((d: any) => d?.reason === "API_KEY_INVALID" || /API key not valid/i.test(d?.message || ""));
    if (invalidKey) return { http: 500, message: "Server AI key is invalid. Update AI_API_KEY in Backend/.env." };
    return { http: 400, message: "Bad request to AI provider." };
  }
  if (status === 401 || status === 403) return { http: 500, message: "Server AI key is invalid or lacks access." };
  if (status === 429) return { http: 503, message: "AI rate-limited. Try again in a moment." };

  return { http: 502, message: "AI provider error. Try again." };
}

async function getGeminiKeyForUser(userId: string) {
  const setting = await prisma.userSetting.findUnique({
    where: { userId_key: { userId, key: "geminiApiKey" } },
  });
  if (!setting) return null;
  try {
    return decryptString(setting.valueEnc);
  } catch {
    return null;
  }
}

async function getApiKey(userId: string) {
  // If server key is set, users don't need to provide anything.
  if (env.AI_API_KEY && env.AI_API_KEY.trim()) return env.AI_API_KEY.trim();
  return await getGeminiKeyForUser(userId);
}

aiRouter.post("/generate", async (req: AuthedRequest, res) => {
  const schema = z.object({
    system: z.string().optional(),
    prompt: z.string().min(1).max(20000),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const apiKey = await getApiKey(req.user!.userId);
  if (!apiKey) return res.status(400).json({ error: "AI is not configured on the server." });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });
    const textPrompt = parsed.data.system
      ? `${parsed.data.system}\n\n${parsed.data.prompt}`
      : parsed.data.prompt;

    const result = await model.generateContent(textPrompt);
    const text = result.response.text();
    return res.json({ text });
  } catch (e) {
    const safe = toSafeAiError(e);
    return res.status(safe.http).json({ error: safe.message });
  }
});

aiRouter.post("/chat", async (req: AuthedRequest, res) => {
  const schema = z.object({
    system: z.string().optional(),
    messages: z
      .array(
        z.object({
          role: z.enum(["user", "assistant"]),
          content: z.string().min(1).max(20000),
        })
      )
      .min(1)
      .max(30),
  });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const apiKey = await getApiKey(req.user!.userId);
  if (!apiKey) return res.status(400).json({ error: "AI is not configured on the server." });

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: env.GEMINI_MODEL });

    const history = parsed.data.messages.slice(0, -1).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));
    const last = parsed.data.messages[parsed.data.messages.length - 1]!;

    const chat = model.startChat({
      history,
      ...(parsed.data.system ? { systemInstruction: parsed.data.system } : {}),
    });
    const result = await chat.sendMessage(last.content);
    const text = result.response.text();
    return res.json({ text });
  } catch (e) {
    const safe = toSafeAiError(e);
    return res.status(safe.http).json({ error: safe.message });
  }
});

