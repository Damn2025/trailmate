import "dotenv/config";
import { z } from "zod";
const schema = z.object({
    DATABASE_URL: z.string().min(1),
    JWT_SECRET: z.string().min(16),
    ENCRYPTION_KEY: z.string().min(1),
    AI_API_KEY: z.string().optional(),
    GEMINI_MODEL: z.string().min(1).default("gemini-1.5-flash"),
    PORT: z.coerce.number().int().positive().default(8080),
    FRONTEND_ORIGIN: z.string().min(1).default("http://localhost:5173"),
});
export const env = schema.parse(process.env);
