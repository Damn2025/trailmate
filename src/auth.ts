import jwt from "jsonwebtoken";
import { env } from "./env.js";

export type JwtUser = { userId: string; email: string };

export function signAccessToken(user: JwtUser) {
  return jwt.sign(user, env.JWT_SECRET, { expiresIn: "7d" });
}

export function verifyAccessToken(token: string): JwtUser {
  return jwt.verify(token, env.JWT_SECRET) as JwtUser;
}

