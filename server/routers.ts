import { COOKIE_NAME } from "@shared/const";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { adminOnlyProcedure, publicProcedure, router } from "./_core/trpc";
import {
  createAdmin,
  createAdminMessage,
  createComplaint,
  createMember,
  getAdminByEmail,
  getMemberById,
  getMemberByEmail,
  getMemberProgress,
  deleteMember,
  listAdmins,
  listAdminMessages,
  listAdminMessagesForAdmin,
  listActiveSuperadminIds,
  listMembers,
  listMessageRecipients,
  listComplaints,
  markAdminLogin,
  markAdminMessageRead,
  updateAdminPermissions,
  updateMember,
  saveMemberProgress,
  updatePendingMember,
  updateComplaint,
} from "./db";
import { endAdminSession, hashPassword, publicAdmin, startAdminSession, verifyPassword } from "./adminAuth";
import { endMemberSession, publicMember, startMemberSession } from "./memberAuth";

const emailSchema = z.string().trim().email("اكتب بريدًا إلكترونيًا صحيحًا.").max(320);
const passwordSchema = z.string().min(8, "كلمة المرور يجب أن تكون ٨ أحرف على الأقل.").max(200);
const permissionSchema = z.enum(["complaints", "members", "admins"]);
function canManage(admin: { role: string; permissions?: string }, permission: string) {
  if (admin.role === "superadmin") return true;
  try { return JSON.parse(admin.permissions || "[]").includes(permission); } catch { return false; }
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return { success: true } as const;
    }),
  }),

  complaints: router({
    submit: publicProcedure
      .input(z.object({
        name: z.string().trim().max(120).optional(),
        email: emailSchema,
        message: z.string().trim().min(3, "اكتب ملحوظة أو شكوى من ٣ أحرف على الأقل.").max(5000),
      }))
      .mutation(async ({ input }) => {
        const id = await createComplaint({
          name: input.name || null,
          email: input.email,
          message: input.message,
        });
        return { success: true, id } as const;
      }),
  }),

  member: router({
    auth: router({
      me: publicProcedure.query(({ ctx }) => ctx.member ? publicMember(ctx.member) : null),
      signup: publicProcedure
        .input(z.object({
          name: z.string().trim().min(2, "اكتب اسمًا من حرفين على الأقل.").max(120),
          email: emailSchema,
          password: passwordSchema,
        }))
        .mutation(async ({ ctx, input }) => {
          const email = input.email.toLowerCase();
          const existing = await getMemberByEmail(email);
          if (existing?.isVerified) {
            throw new TRPCError({ code: "CONFLICT", message: "هذا البريد مسجل بالفعل. استخدم تسجيل الدخول." });
          }
          const values = {
            name: input.name,
            email,
            passwordHash: await hashPassword(input.password),
            isVerified: 1,
          } as const;
          const memberId = existing ? (await updatePendingMember(existing.id, values), existing.id) : await createMember(values);
          await endAdminSession(ctx.req, ctx.res);
          await startMemberSession(memberId, ctx.res);
          return { success: true, requiresVerification: false } as const;
        }),
      login: publicProcedure
        .input(z.object({ email: emailSchema, password: z.string().min(1).max(200) }))
        .mutation(async ({ ctx, input }) => {
          const member = await getMemberByEmail(input.email.toLowerCase());
          if (!member || member.isBanned || !(await verifyPassword(input.password, member.passwordHash))) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "بيانات الدخول غير صحيحة." });
          }
          await endAdminSession(ctx.req, ctx.res);
          await startMemberSession(member.id, ctx.res);
          return { success: true, member: publicMember(member) } as const;
        }),
      loginAny: publicProcedure
        .input(z.object({ email: emailSchema, password: z.string().min(1).max(200) }))
        .mutation(async ({ ctx, input }) => {
          const email = input.email.toLowerCase();
          const admin = await getAdminByEmail(email);
          if (admin && admin.isActive && await verifyPassword(input.password, admin.passwordHash)) {
            await endMemberSession(ctx.req, ctx.res);
            await startAdminSession(admin.id, ctx.res);
            await markAdminLogin(admin.id);
            return { kind: "admin" as const, admin: publicAdmin(admin) };
          }
          const member = await getMemberByEmail(email);
          if (!member || member.isBanned || !(await verifyPassword(input.password, member.passwordHash))) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
          }
          await endAdminSession(ctx.req, ctx.res);
          await startMemberSession(member.id, ctx.res);
          return { kind: "member" as const, member: publicMember(member) };
        }),
      logout: publicProcedure.mutation(async ({ ctx }) => {
        await endMemberSession(ctx.req, ctx.res);
        return { success: true } as const;
      }),
    }),
    progress: router({
      get: publicProcedure.query(async ({ ctx }) => {
        if (!ctx.member) return null;
        const row = await getMemberProgress(ctx.member.id);
        return row ? JSON.parse(row.data) : null;
      }),
      save: publicProcedure.input(z.object({ data: z.string().max(500000) })).mutation(async ({ ctx, input }) => {
        if (!ctx.member) throw new TRPCError({ code: "UNAUTHORIZED", message: "سجّل دخولك لحفظ التقدم." });
        JSON.parse(input.data);
        await saveMemberProgress(ctx.member.id, input.data);
        return { success: true } as const;
      }),
    }),
  }),

  admin: router({
    auth: router({
      me: publicProcedure.query(({ ctx }) => ctx.admin ? publicAdmin(ctx.admin) : null),
      login: publicProcedure
        .input(z.object({ email: emailSchema, password: z.string().min(1).max(200) }))
        .mutation(async ({ ctx, input }) => {
          const admin = await getAdminByEmail(input.email.toLowerCase());
          if (!admin || !admin.isActive || !(await verifyPassword(input.password, admin.passwordHash))) {
            throw new TRPCError({ code: "UNAUTHORIZED", message: "البريد الإلكتروني أو كلمة المرور غير صحيحة." });
          }
          await endMemberSession(ctx.req, ctx.res);
          await startAdminSession(admin.id, ctx.res);
          await markAdminLogin(admin.id);
          return { success: true, admin: publicAdmin(admin) } as const;
        }),
      logout: publicProcedure.mutation(async ({ ctx }) => {
        await endAdminSession(ctx.req, ctx.res);
        return { success: true } as const;
      }),
    }),
    complaints: router({
      list: adminOnlyProcedure.query(({ ctx }) => {
        if (!canManage(ctx.admin, "complaints")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية مشاهدة الشكاوى." });
        return listComplaints();
      }),
      update: adminOnlyProcedure
        .input(z.object({
          id: z.number().int().positive(),
          status: z.enum(["new", "read", "in_progress", "resolved"]),
          adminNote: z.string().trim().max(3000).optional(),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!canManage(ctx.admin, "complaints")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تعديل الشكاوى." });
          await updateComplaint(input.id, { status: input.status, adminNote: input.adminNote || null });
          return { success: true } as const;
        }),
    }),
    messages: router({
      list: adminOnlyProcedure.query(async ({ ctx }) => {
        return ctx.admin.role === "superadmin" ? listAdminMessages() : listAdminMessagesForAdmin(ctx.admin.id);
      }),
      recipients: adminOnlyProcedure.query(() => listMessageRecipients()),
      send: adminOnlyProcedure
        .input(z.object({ subject: z.string().trim().min(2).max(200), message: z.string().trim().min(3).max(10000), recipientAdminIds: z.array(z.number().int().positive()).max(50).default([]) }))
        .mutation(async ({ ctx, input }) => {
          if (ctx.admin.role === "superadmin" && input.recipientAdminIds.length === 0) throw new TRPCError({ code: "BAD_REQUEST", message: "اختر أدمنًا واحدًا على الأقل لإرسال الرسالة." });
          if (ctx.admin.role !== "superadmin" && input.recipientAdminIds.length > 0) throw new TRPCError({ code: "FORBIDDEN", message: "اختيار المستلمين متاح للمدير الرئيسي فقط." });
          const available = await listMessageRecipients();
          const allowedIds = new Set(available.filter((item) => item.isActive).map((item) => item.id));
          if (input.recipientAdminIds.some((id) => !allowedIds.has(id))) throw new TRPCError({ code: "BAD_REQUEST", message: "يوجد مستلم غير متاح أو غير نشط." });
          const recipientIds = ctx.admin.role === "superadmin" ? input.recipientAdminIds : await listActiveSuperadminIds();
          if (recipientIds.length === 0) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "لا يوجد مدير رئيسي نشط لاستقبال الرسالة حاليًا." });
          const id = await createAdminMessage({ senderAdminId: ctx.admin.id, subject: input.subject, message: input.message }, recipientIds);
          return { success: true, id } as const;
      }),
      markRead: adminOnlyProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .mutation(async ({ ctx, input }) => {
          await markAdminMessageRead(input.id, ctx.admin.role === "superadmin" ? undefined : ctx.admin.id);
          return { success: true } as const;
        }),
    }),
    users: router({
      list: adminOnlyProcedure.query(({ ctx }) => {
        if (!canManage(ctx.admin, "admins")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية مشاهدة الأدمنز." });
        return listAdmins();
      }),
      create: adminOnlyProcedure
        .input(z.object({
          name: z.string().trim().min(2).max(120),
          email: emailSchema,
          password: passwordSchema,
          permissions: z.array(permissionSchema).min(1).max(3),
        }))
        .mutation(async ({ ctx, input }) => {
          if (!canManage(ctx.admin, "admins")) {
            throw new TRPCError({ code: "FORBIDDEN", message: "إضافة أدمن جديد متاحة للمدير الرئيسي فقط." });
          }
          const email = input.email.toLowerCase();
          if (await getAdminByEmail(email)) {
            throw new TRPCError({ code: "CONFLICT", message: "يوجد أدمن مسجل بهذا البريد بالفعل." });
          }
          const id = await createAdmin({
            name: input.name,
            email,
            passwordHash: await hashPassword(input.password),
            role: "admin",
            permissions: JSON.stringify(input.permissions),
            isActive: 1,
          });
          return { success: true, id } as const;
        }),
      updatePermissions: adminOnlyProcedure
        .input(z.object({ id: z.number().int().positive(), permissions: z.array(permissionSchema).max(3) }))
        .mutation(async ({ ctx, input }) => {
          if (!canManage(ctx.admin, "admins")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تعديل صلاحيات الأدمنز." });
          await updateAdminPermissions(input.id, input.permissions);
          return { success: true } as const;
        }),
    }),
    members: router({
      list: adminOnlyProcedure.query(({ ctx }) => {
        if (!canManage(ctx.admin, "members")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية إدارة الطلاب." });
        return listMembers();
      }),
      setBanned: adminOnlyProcedure.input(z.object({ id: z.number().int().positive(), banned: z.boolean() })).mutation(async ({ ctx, input }) => {
        if (!canManage(ctx.admin, "members")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية حظر الطلاب." });
        await updateMember(input.id, { isBanned: input.banned ? 1 : 0 });
        return { success: true } as const;
      }),
      changePassword: adminOnlyProcedure.input(z.object({ id: z.number().int().positive(), password: passwordSchema })).mutation(async ({ ctx, input }) => {
        if (!canManage(ctx.admin, "members")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تغيير كلمات المرور." });
        if (!(await getMemberById(input.id))) throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود." });
        await updateMember(input.id, { passwordHash: await hashPassword(input.password) });
        return { success: true } as const;
      }),
      remove: adminOnlyProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ ctx, input }) => {
        if (!canManage(ctx.admin, "members")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية حذف الطلاب." });
        await deleteMember(input.id);
        return { success: true } as const;
      }),
      progress: adminOnlyProcedure
        .input(z.object({ id: z.number().int().positive() }))
        .query(async ({ ctx, input }) => {
          if (!canManage(ctx.admin, "members")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية مشاهدة تقدم الطلاب." });
          const row = await getMemberProgress(input.id);
          return row ? JSON.parse(row.data) : null;
        }),
      updateProgress: adminOnlyProcedure
        .input(z.object({ id: z.number().int().positive(), data: z.string().max(500000) }))
        .mutation(async ({ ctx, input }) => {
          if (!canManage(ctx.admin, "members")) throw new TRPCError({ code: "FORBIDDEN", message: "لا تملك صلاحية تعديل تقدم الطلاب." });
          if (!(await getMemberById(input.id))) throw new TRPCError({ code: "NOT_FOUND", message: "الحساب غير موجود." });
          JSON.parse(input.data);
          await saveMemberProgress(input.id, input.data);
          return { success: true } as const;
        }),
    }),
  }),
});

export type AppRouter = typeof appRouter;
