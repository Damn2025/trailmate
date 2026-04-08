import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

export const chatRouter = Router();
chatRouter.use(requireAuth);

chatRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const { data: messages, error } = await supabase
    .from('ChatMessage')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: true })
    .limit(500);

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ messages });
});

const postSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(20000),
});

chatRouter.post("/", async (req: AuthedRequest, res) => {
  const parsed = postSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const userId = req.user!.userId;
  const { data: created, error } = await supabase
    .from('ChatMessage')
    .insert({
      userId,
      role: parsed.data.role,
      content: parsed.data.content
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.status(201).json({ message: created });
});

