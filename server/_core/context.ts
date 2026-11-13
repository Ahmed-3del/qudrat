import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { AdminUser, MemberUser, User } from "../../drizzle/schema";
import { getAdminFromRequest } from "../adminAuth";
import { getMemberFromRequest } from "../memberAuth";
import { sdk } from "./sdk";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  admin: AdminUser | null;
  member: MemberUser | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let admin: AdminUser | null = null;
  let member: MemberUser | null = null;

  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch (error) {
    // Authentication is optional for public procedures.
    user = null;
  }

  try {
    admin = await getAdminFromRequest(opts.req);
  } catch (error) {
    console.warn("[AdminAuth] Could not read admin session:", error);
    admin = null;
  }

  try {
    member = await getMemberFromRequest(opts.req);
  } catch (error) {
    console.warn("[MemberAuth] Could not read member session:", error);
    member = null;
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    admin,
    member,
  };
}
