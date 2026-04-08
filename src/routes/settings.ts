import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";
import { decryptString, encryptString } from "../crypto.js";

export const settingsRouter = Router();
settingsRouter.use(requireAuth);

settingsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const { data: settings, error } = await supabase
    .from('UserSetting')
    .select('*')
    .eq('userId', userId);

  if (error) return res.status(500).json({ error: error.message });

  const out: Record<string, string> = {};
  for (const s of settings) {
    try {
      out[s.key] = decryptString(s.valueEnc);
    } catch {
      // ignore bad entries
    }
  }
  return res.json({ settings: out });
});

const putSchema = z.object({
  key: z.string().min(1).max(100),
  value: z.string().max(10000),
});

settingsRouter.put("/", async (req: AuthedRequest, res) => {
  const parsed = putSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });
  const userId = req.user!.userId;

  const valueEnc = encryptString(parsed.data.value);
  const { error } = await supabase
    .from('UserSetting')
    .upsert({
      userId,
      key: parsed.data.key,
      valueEnc
    }, { onConflict: 'userId,key' });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

