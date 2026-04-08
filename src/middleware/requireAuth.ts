import type { NextFunction, Request, Response } from "express";
import { supabase } from "../supabase.js";

export type AuthedRequest = Request & { user?: { userId: string; email: string } };

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.header("authorization") || "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) return res.status(401).json({ error: "Missing Bearer token" });

  const { data, error } = await supabase.auth.getUser(match[1]);
  if (error || !data.user) return res.status(401).json({ error: "Invalid or expired token" });

  req.user = { userId: data.user.id, email: data.user.email || '' };
  return next();
}

