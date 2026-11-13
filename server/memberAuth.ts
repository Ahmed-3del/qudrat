import crypto from "node:crypto";
import type { CookieOptions, Request, Response } from "express";
import { parse } from "cookie";
import type { MemberUser } from "../drizzle/schema";
import { createMemberSession, deleteMemberSession, deleteMemberSessions, getMemberBySessionToken } from "./db";

export const MEMBER_SESSION_COOKIE = "sahlah_member_session";
const SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 30;

export function publicMember(member: MemberUser) {
  return { id: member.id, email: member.email, name: member.name, isVerified: Boolean(member.isVerified) };
}

function hashSessionToken(token: string) {
  return crypto.createHash("sha256").update(token).digest("hex");
}

function cookieOptions(): CookieOptions {
  return { httpOnly: true, path: "/", sameSite: "none", secure: true, maxAge: SESSION_MAX_AGE_MS };
}

function readToken(req: Request) {
  return parse(req.headers.cookie ?? "")[MEMBER_SESSION_COOKIE];
}

export async function getMemberFromRequest(req: Request) {
  const token = readToken(req);
  if (!token) return null;
  return (await getMemberBySessionToken(hashSessionToken(token))) ?? null;
}

export async function startMemberSession(memberId: number, res: Response) {
  const token = crypto.randomBytes(32).toString("base64url");
  await deleteMemberSessions(memberId);
  await createMemberSession(memberId, hashSessionToken(token), new Date(Date.now() + SESSION_MAX_AGE_MS));
  res.cookie(MEMBER_SESSION_COOKIE, token, cookieOptions());
}

export async function endMemberSession(req: Request, res: Response) {
  const token = readToken(req);
  if (token) await deleteMemberSession(hashSessionToken(token));
  res.clearCookie(MEMBER_SESSION_COOKIE, cookieOptions());
}
