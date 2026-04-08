import { Router } from "express";
import { z } from "zod";
import { supabase } from "../supabase.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

export const tripsRouter = Router();

tripsRouter.use(requireAuth);

tripsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const { data: trips, error } = await supabase
    .from('Trip')
    .select('*')
    .eq('userId', userId)
    .order('updatedAt', { ascending: false });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ trips });
});

const upsertSchema = z.object({
  // clientId is Trip.id from the frontend (stable per user).
  clientId: z.string().min(1).max(200),
  title: z.string().min(1).max(200),
  data: z.any(),
});

tripsRouter.post("/upsert", async (req: AuthedRequest, res) => {
  const parsed = upsertSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const userId = req.user!.userId;
  const { data: trip, error } = await supabase
    .from('Trip')
    .upsert({
      userId,
      clientId: parsed.data.clientId,
      title: parsed.data.title,
      data: parsed.data.data
    }, { onConflict: 'userId,clientId' })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ trip });
});

const bulkSchema = z.object({
  trips: z.array(upsertSchema),
});

tripsRouter.post("/sync", async (req: AuthedRequest, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const userId = req.user!.userId;
  const upserts = parsed.data.trips.map(t => ({
    userId,
    clientId: t.clientId,
    title: t.title,
    data: t.data
  }));

  const { error } = await supabase
    .from('Trip')
    .upsert(upserts, { onConflict: 'userId,clientId' });

  if (error) return res.status(500).json({ error: error.message });
  return res.json({ ok: true });
});

tripsRouter.delete("/by-client/:clientId", async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const clientId = req.params.clientId;
  const { error } = await supabase
    .from('Trip')
    .delete()
    .eq('userId', userId)
    .eq('clientId', clientId);

  if (error) return res.status(500).json({ error: error.message });
  return res.status(204).send();
});

