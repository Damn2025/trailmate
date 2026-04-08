import { verifyAccessToken } from "../auth.js";
export function requireAuth(req, res, next) {
    const header = req.header("authorization") || "";
    const match = header.match(/^Bearer\s+(.+)$/i);
    if (!match)
        return res.status(401).json({ error: "Missing Bearer token" });
    try {
        req.user = verifyAccessToken(match[1]);
        return next();
    }
    catch {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}
