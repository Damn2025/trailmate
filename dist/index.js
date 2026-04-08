import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { authRouter } from "./routes/auth.js";
import { tripsRouter } from "./routes/trips.js";
import { settingsRouter } from "./routes/settings.js";
import { chatRouter } from "./routes/chat.js";
import { aiRouter } from "./routes/ai.js";
const app = express();
app.use(cors({
    // Dev-friendly CORS: reflect any Origin (lets you use LAN IPs / different ports)
    origin: true,
    credentials: false,
}));
app.use(express.json({ limit: "2mb" }));
app.get("/health", (_req, res) => res.json({ ok: true }));
app.use("/auth", authRouter);
app.use("/trips", tripsRouter);
app.use("/settings", settingsRouter);
app.use("/chat", chatRouter);
app.use("/ai", aiRouter);
app.listen(env.PORT, () => {
    // eslint-disable-next-line no-console
    console.log(`Backend listening on http://localhost:${env.PORT}`);
});
