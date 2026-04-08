import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth, type AuthedRequest } from "../middleware/requireAuth.js";

export const tripsRouter = Router();

tripsRouter.use(requireAuth);

tripsRouter.get("/", async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const trips = await prisma.trip.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
  });
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
  const trip = await prisma.trip.upsert({
    where: { userId_clientId: { userId, clientId: parsed.data.clientId } },
    update: { title: parsed.data.title, data: parsed.data.data },
    create: { userId, clientId: parsed.data.clientId, title: parsed.data.title, data: parsed.data.data },
  });

  return res.json({ trip });
});

const bulkSchema = z.object({
  trips: z.array(upsertSchema),
});

tripsRouter.post("/sync", async (req: AuthedRequest, res) => {
  const parsed = bulkSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json({ error: "Invalid input" });

  const userId = req.user!.userId;
  await prisma.$transaction(
    parsed.data.trips.map((t) =>
      prisma.trip.upsert({
        where: { userId_clientId: { userId, clientId: t.clientId } },
        update: { title: t.title, data: t.data },
        create: { userId, clientId: t.clientId, title: t.title, data: t.data },
      })
    )
  );

  return res.json({ ok: true });
});

tripsRouter.delete("/by-client/:clientId", async (req: AuthedRequest, res) => {
  const userId = req.user!.userId;
  const clientId = req.params.clientId;
  await prisma.trip.delete({
    where: { userId_clientId: { userId, clientId } },
  }).catch(() => null);
  return res.status(204).send();
});

