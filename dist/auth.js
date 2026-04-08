import jwt from "jsonwebtoken";
import { env } from "./env.js";
export function signAccessToken(user) {
    return jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
}
export function verifyAccessToken(token) {
    return jwt.verify(token, env.JWT_SECRET);
}
