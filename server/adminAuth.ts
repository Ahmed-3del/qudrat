import crypto from "node:crypto";
import { promisify } from "node:util";
import type { CookieOptions, Request, Response } from "express";
import { parse } from "cookie";
import { createAdmin, createAdminSession, deleteAdminSession, deleteAdminSessions, getAdminByEmail, getAdminBySessionToken } from "./db";

export const ADMIN_SESSION_COOKIE = "sahlah_admin_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 14;
const scrypt = promisify(crypto.scrypt);

type PublicAdmin = {
  id: number;
  email: string;
  name: string;
  role: "admin" | "superadmin";
  permissions: string;
  isActive: number;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
};

export function publicAdmin(admin: PublicAdmin) {
  return { id: admin.id, email: admin.email, name: admin.name, role: admin.role, permissions: admin.permissions };
}

export async function hashPassword(password: string) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = (await scrypt(password, salt, 64)) as Buffer;
  return `scrypt$${salt}$${derived.toString("hex")}`;
}

export async function verifyPassword(password: string, encoded: string) {
  const [, salt, storedHex] = encoded.split("$");
  if (!salt || !storedHex) return false;
  try {
    const derived = (await scrypt(password, salt, 64)) as Buffer;
    const stored = Buffer.from(storedHex, "hex");
    return stored.length === derived.length && crypto.timingSafeEqual(stored, derived);
  } catch {
    return false;
  }
}

function tokenHash(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function getCookieOptions(): CookieOptions {
  return { httpOnly: true, path: "/", sameSite: "none", secure: true, maxAge: SESSION_MAX_AGE_MS };
}

function readSessionToken(req: Request) {
  return parse(req.headers.cookie ?? "")[ADMIN_SESSION_COOKIE];
}

export async function getAdminFromRequest(req: Request) {
  const token = readSessionToken(req);
  if (!token) return null;
  return (await getAdminBySessionToken(tokenHash(token))) ?? null;
}

export async function startAdminSession(adminId: number, res: Response) {
  const token = crypto.randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await deleteAdminSessions(adminId);
  await createAdminSession(adminId, tokenHash(token), expiresAt);
  res.cookie(ADMIN_SESSION_COOKIE, token, getCookieOptions());
}

export async function endAdminSession(req: Request, res: Response) {
  const token = readSessionToken(req);
  if (token) await deleteAdminSession(tokenHash(token));
  res.clearCookie(ADMIN_SESSION_COOKIE, getCookieOptions());
}

/**
 * Creates the first superadmin only when the owner explicitly supplies both
 * protected bootstrap environment values. There is no public first-run signup.
 */
export async function ensureBootstrapAdmin() {
  const email = process.env.SAHLAH_ADMIN_EMAIL?.trim().toLowerCase();
  const password = process.env.SAHLAH_ADMIN_PASSWORD;
  if (!email || !password) return;
  const existing = await getAdminByEmail(email);
  if (existing) return;
  if (password.length < 8) throw new Error("SAHLAH_ADMIN_PASSWORD must be at least 8 characters");
  const passwordHash = await hashPassword(password);
  await createAdmin({ email, name: "المدير الرئيسي", passwordHash, role: "superadmin", isActive: 1 });
  console.log(`[Admin] Bootstrap account created for ${email}`);
}
