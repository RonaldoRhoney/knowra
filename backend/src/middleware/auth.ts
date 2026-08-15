import type { NextFunction, Request, Response } from "express";
import { supabaseForUser } from "../lib/supabase.js";

export interface AuthedRequest extends Request {
  userId?: string;
  userEmail?: string;
  supabase?: ReturnType<typeof supabaseForUser>;
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401).json({ error: "Não autenticado." });
    return;
  }

  const supabase = supabaseForUser(token);
  const { data, error } = await supabase.auth.getUser(token);

  if (error || !data.user) {
    res.status(401).json({ error: "Sessão inválida ou expirada." });
    return;
  }

  req.userId = data.user.id;
  req.userEmail = data.user.email;
  req.supabase = supabase;
  next();
}
