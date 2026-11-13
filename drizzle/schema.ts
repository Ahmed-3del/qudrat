import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extend this file with additional tables as your product grows.
 * Columns use camelCase to match both database fields and generated types.
 */
export const users = mysqlTable("users", {
  /**
   * Surrogate primary key. Auto-incremented numeric value managed by the database.
   * Use this for relations between tables.
   */
  id: int("id").autoincrement().primaryKey(),
  /** Manus OAuth identifier (openId) returned from the OAuth callback. Unique per user. */
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

export const complaints = mysqlTable("complaints", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 120 }),
  email: varchar("email", { length: 320 }),
  message: text("message").notNull(),
  status: mysqlEnum("status", ["new", "read", "in_progress", "resolved"]).default("new").notNull(),
  adminNote: text("adminNote"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Complaint = typeof complaints.$inferSelect;
export type InsertComplaint = typeof complaints.$inferInsert;

export const adminUsers = mysqlTable("adminUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "superadmin"]).default("admin").notNull(),
  permissions: varchar("permissions", { length: 1000 }).default("[]").notNull(),
  isActive: int("isActive").default(1).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastLoginAt: timestamp("lastLoginAt"),
});

export type AdminUser = typeof adminUsers.$inferSelect;
export type InsertAdminUser = typeof adminUsers.$inferInsert;

export const adminSessions = mysqlTable("adminSessions", {
  id: int("id").autoincrement().primaryKey(),
  adminId: int("adminId").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminSession = typeof adminSessions.$inferSelect;

export const adminMessages = mysqlTable("adminMessages", {
  id: int("id").autoincrement().primaryKey(),
  senderAdminId: int("senderAdminId").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  subject: varchar("subject", { length: 200 }).notNull(),
  message: text("message").notNull(),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminMessage = typeof adminMessages.$inferSelect;
export type InsertAdminMessage = typeof adminMessages.$inferInsert;

export const adminMessageRecipients = mysqlTable("adminMessageRecipients", {
  id: int("id").autoincrement().primaryKey(),
  messageId: int("messageId").notNull().references(() => adminMessages.id, { onDelete: "cascade" }),
  recipientAdminId: int("recipientAdminId").notNull().references(() => adminUsers.id, { onDelete: "cascade" }),
  readAt: timestamp("readAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AdminMessageRecipient = typeof adminMessageRecipients.$inferSelect;

export const memberUsers = mysqlTable("memberUsers", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  name: varchar("name", { length: 120 }).notNull(),
  passwordHash: varchar("passwordHash", { length: 255 }).notNull(),
  isVerified: int("isVerified").default(0).notNull(),
  isBanned: int("isBanned").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MemberUser = typeof memberUsers.$inferSelect;
export type InsertMemberUser = typeof memberUsers.$inferInsert;

export const memberSessions = mysqlTable("memberSessions", {
  id: int("id").autoincrement().primaryKey(),
  memberId: int("memberId").notNull().references(() => memberUsers.id, { onDelete: "cascade" }),
  tokenHash: varchar("tokenHash", { length: 128 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type MemberSession = typeof memberSessions.$inferSelect;

export const memberProgress = mysqlTable("memberProgress", {
  memberId: int("memberId").primaryKey().references(() => memberUsers.id, { onDelete: "cascade" }),
  data: text("data").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type MemberProgress = typeof memberProgress.$inferSelect;
