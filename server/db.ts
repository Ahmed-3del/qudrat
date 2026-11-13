import { and, desc, eq, gt } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { adminMessageRecipients, adminMessages, adminSessions, adminUsers, complaints, InsertAdminMessage, InsertAdminUser, InsertComplaint, InsertMemberUser, InsertUser, memberProgress, memberSessions, memberUsers, users } from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

// Lazily create the drizzle instance so local tooling can run without a DB.
export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    throw new Error("Database is not available");
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);

  return result.length > 0 ? result[0] : undefined;
}

export async function createComplaint(input: InsertComplaint) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(complaints).values(input);
  return Number(result[0].insertId);
}

export async function listComplaints() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select().from(complaints).orderBy(desc(complaints.createdAt));
}

export async function updateComplaint(id: number, input: { status?: "new" | "read" | "in_progress" | "resolved"; adminNote?: string | null }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(complaints).set(input).where(eq(complaints.id, id));
}

export async function getAdminByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);
  return result[0];
}

export async function getAdminById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(adminUsers).where(eq(adminUsers.id, id)).limit(1);
  return result[0];
}

export async function listAdmins() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({
    id: adminUsers.id,
    email: adminUsers.email,
    name: adminUsers.name,
    role: adminUsers.role,
    permissions: adminUsers.permissions,
    isActive: adminUsers.isActive,
    createdAt: adminUsers.createdAt,
    lastLoginAt: adminUsers.lastLoginAt,
  }).from(adminUsers).orderBy(desc(adminUsers.createdAt));
}

export async function listMessageRecipients() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({ id: adminUsers.id, name: adminUsers.name, email: adminUsers.email, isActive: adminUsers.isActive }).from(adminUsers).where(eq(adminUsers.role, "admin")).orderBy(adminUsers.name);
}

export async function listActiveSuperadminIds() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const rows = await db.select({ id: adminUsers.id }).from(adminUsers).where(and(eq(adminUsers.role, "superadmin"), eq(adminUsers.isActive, 1)));
  return rows.map((row) => row.id);
}

export async function updateAdminPermissions(id: number, permissions: string[]) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(adminUsers).set({ permissions: JSON.stringify(permissions) }).where(eq(adminUsers.id, id));
}

export async function createAdmin(input: InsertAdminUser) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(adminUsers).values(input);
  return Number(result[0].insertId);
}

export async function markAdminLogin(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(adminUsers).set({ lastLoginAt: new Date() }).where(eq(adminUsers.id, id));
}

export async function createAdminMessage(input: InsertAdminMessage, recipientAdminIds: number[] = []) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(adminMessages).values(input);
  const messageId = Number(result[0].insertId);
  if (recipientAdminIds.length) await db.insert(adminMessageRecipients).values(recipientAdminIds.map((recipientAdminId) => ({ messageId, recipientAdminId })));
  return messageId;
}

export async function listAdminMessages() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({
    id: adminMessages.id,
    senderAdminId: adminMessages.senderAdminId,
    senderName: adminUsers.name,
    senderEmail: adminUsers.email,
    subject: adminMessages.subject,
    message: adminMessages.message,
    readAt: adminMessages.readAt,
    createdAt: adminMessages.createdAt,
  }).from(adminMessages).innerJoin(adminUsers, eq(adminMessages.senderAdminId, adminUsers.id)).orderBy(desc(adminMessages.createdAt));
}

export async function listAdminMessagesForAdmin(adminId: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({
    id: adminMessages.id,
    senderAdminId: adminMessages.senderAdminId,
    senderName: adminUsers.name,
    senderEmail: adminUsers.email,
    subject: adminMessages.subject,
    message: adminMessages.message,
    readAt: adminMessageRecipients.readAt,
    createdAt: adminMessages.createdAt,
  }).from(adminMessageRecipients).innerJoin(adminMessages, eq(adminMessageRecipients.messageId, adminMessages.id)).innerJoin(adminUsers, eq(adminMessages.senderAdminId, adminUsers.id)).where(eq(adminMessageRecipients.recipientAdminId, adminId)).orderBy(desc(adminMessages.createdAt));
}

export async function markAdminMessageRead(id: number, adminId?: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  if (adminId) await db.update(adminMessageRecipients).set({ readAt: new Date() }).where(and(eq(adminMessageRecipients.messageId, id), eq(adminMessageRecipients.recipientAdminId, adminId)));
  else await db.update(adminMessages).set({ readAt: new Date() }).where(eq(adminMessages.id, id));
}

export async function createAdminSession(adminId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(adminSessions).values({ adminId, tokenHash, expiresAt });
}

export async function deleteAdminSessions(adminId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminSessions).where(eq(adminSessions.adminId, adminId));
}

export async function getAdminBySessionToken(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ admin: adminUsers }).from(adminSessions)
    .innerJoin(adminUsers, eq(adminSessions.adminId, adminUsers.id))
    .where(and(eq(adminSessions.tokenHash, tokenHash), gt(adminSessions.expiresAt, new Date())))
    .limit(1);
  const admin = result[0]?.admin;
  return admin?.isActive ? admin : undefined;
}

export async function deleteAdminSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(adminSessions).where(eq(adminSessions.tokenHash, tokenHash));
}

export async function getMemberByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(memberUsers).where(eq(memberUsers.email, email)).limit(1);
  return result[0];
}

export async function listMembers() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db.select({ id: memberUsers.id, name: memberUsers.name, email: memberUsers.email, isBanned: memberUsers.isBanned, createdAt: memberUsers.createdAt, updatedAt: memberUsers.updatedAt }).from(memberUsers).orderBy(desc(memberUsers.createdAt));
}

export async function getMemberById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(memberUsers).where(eq(memberUsers.id, id)).limit(1);
  return result[0];
}

export async function updateMember(id: number, input: { isBanned?: number; passwordHash?: string }) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(memberUsers).set(input).where(eq(memberUsers.id, id));
}

export async function deleteMember(id: number) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.delete(memberSessions).where(eq(memberSessions.memberId, id));
  await db.delete(memberUsers).where(eq(memberUsers.id, id));
  await db.delete(memberProgress).where(eq(memberProgress.memberId, id));
}

export async function getMemberProgress(memberId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(memberProgress).where(eq(memberProgress.memberId, memberId)).limit(1);
  return result[0];
}

export async function saveMemberProgress(memberId: number, data: string) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(memberProgress).values({ memberId, data }).onDuplicateKeyUpdate({ set: { data, updatedAt: new Date() } });
}

export async function createMember(input: InsertMemberUser) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  const result = await db.insert(memberUsers).values(input);
  return Number(result[0].insertId);
}

export async function updatePendingMember(id: number, input: Partial<InsertMemberUser>) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.update(memberUsers).set(input).where(eq(memberUsers.id, id));
}

export async function createMemberSession(memberId: number, tokenHash: string, expiresAt: Date) {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  await db.insert(memberSessions).values({ memberId, tokenHash, expiresAt });
}

export async function deleteMemberSessions(memberId: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(memberSessions).where(eq(memberSessions.memberId, memberId));
}

export async function getMemberBySessionToken(tokenHash: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select({ member: memberUsers }).from(memberSessions)
    .innerJoin(memberUsers, eq(memberSessions.memberId, memberUsers.id))
    .where(and(eq(memberSessions.tokenHash, tokenHash), gt(memberSessions.expiresAt, new Date())))
    .limit(1);
  const member = result[0]?.member;
  return member?.isVerified && !member.isBanned ? member : undefined;
}

export async function deleteMemberSession(tokenHash: string) {
  const db = await getDb();
  if (!db) return;
  await db.delete(memberSessions).where(eq(memberSessions.tokenHash, tokenHash));
}
