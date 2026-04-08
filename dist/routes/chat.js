import { Router } from "express";
import { z } from "zod";
import { prisma } from "../prisma.js";
import { requireAuth } from "../middleware/requireAuth.js";
export const chatRouter = Router();
chatRouter.use(requireAuth);
chatRouter.get("/", async (req, res) => {
    const userId = req.user.userId;
    const messages = await prisma.chatMessage.findMany({
        where: { userId },
        orderBy: { createdAt: "asc" },
        take: 500,
    });
    return res.json({ messages });
});
const postSchema = z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(20000),
});
chatRouter.post("/", async (req, res) => {
    const parsed = postSchema.safeParse(req.body);
    if (!parsed.success)
        return res.status(400).json({ error: "Invalid input" });
    const userId = req.user.userId;
    const created = await prisma.chatMessage.create({
        data: { userId, role: parsed.data.role, content: parsed.data.content },
    });
    return res.status(201).json({ message: created });
});
