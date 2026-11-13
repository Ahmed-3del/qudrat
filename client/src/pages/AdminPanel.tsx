import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Bot, Check, Clock3, Eye, EyeOff, KeyRound, LogOut, Mail, MessageSquare, Plus, Send, ShieldCheck, UserRound, UserX, Users, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type AdminTab = "complaints" | "admins" | "members" | "manus" | "messages";
type ComplaintStatus = "new" | "read" | "in_progress" | "resolved";

const statusLabels: Record<ComplaintStatus, string> = {
  new: "جديدة",
  read: "قُرئت",
  in_progress: "قيد المتابعة",
  resolved: "تمت المتابعة",
};

function formatDate(value: Date | string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export default function AdminPanel() {
  const me = trpc.admin.auth.me.useQuery();
  const [tab, setTab] = useState<AdminTab>("manus");
  const isSuper = me.data?.role === "superadmin";
  const canComplaints = Boolean(me.data && (me.data.role === "superadmin" || me.data.permissions.includes("complaints")));
  const complaintPreview = trpc.admin.complaints.list.useQuery(undefined, { enabled: canComplaints });
  const messagePreview = trpc.admin.messages.list.useQuery(undefined, { enabled: Boolean(me.data) });
  const logout = trpc.admin.auth.logout.useMutation({ onSuccess: () => { window.location.href = "/admin"; } });

  if (me.isLoading) return <AdminPageFrame><div className="admin-loading">جارٍ تجهيز لوحة الإدارة...</div></AdminPageFrame>;
  if (!me.data) return <AdminLogin onAuthenticated={() => me.refetch()} />;

  const canAdmins = isSuper || me.data.permissions.includes("admins");
  const canMembers = isSuper || me.data.permissions.includes("members");
  const availableTabs: AdminTab[] = ["manus", canComplaints && "complaints", canAdmins && "admins", canMembers && "members", isSuper && "messages"].filter(Boolean) as AdminTab[];
  const activeTab = availableTabs.includes(tab) ? tab : (availableTabs[0] ?? "complaints");
  const newCount = complaintPreview.data?.filter((item) => item.status === "new").length ?? 0;
  const unreadAdminMessages = messagePreview.data?.filter((item) => !item.readAt) ?? [];
  return (
    <AdminPageFrame>
      <header className="admin-header">
        <div><span className="section-kicker">سهلات · مساحة خاصة</span><h1>لوحة الإدارة</h1><p>أهلًا {me.data.name}، من هنا تتابع رسائل الطلاب وتحافظ على جودة المحتوى.</p>{unreadAdminMessages.length > 0 && <button className="admin-inbox-alert" onClick={() => setTab("messages")}><Mail size={15} /> جالك {unreadAdminMessages.length} رسالة جديدة {isSuper ? "من الأدمنز" : "من المدير"}</button>}</div>
        <div className="admin-header-actions"><button className="button button-quiet" onClick={() => { window.location.href = "/"; }}><ArrowRight size={16} /> الموقع</button><button className="button admin-logout" onClick={() => logout.mutate()} disabled={logout.isPending}><LogOut size={16} /> خروج</button></div>
      </header>
      <div className="admin-layout">
        <aside className="admin-sidebar">
          <div className="admin-profile"><span className="admin-profile-icon"><ShieldCheck size={20} /></span><div><b>{me.data.name}</b><small>{me.data.role === "superadmin" ? "مدير رئيسي" : "أدمن"}</small></div></div>
          <button className={activeTab === "manus" ? "active" : ""} onClick={() => setTab("manus")}><Bot size={17} /> مساعد Manus</button>
          {canComplaints && <button className={activeTab === "complaints" ? "active" : ""} onClick={() => setTab("complaints")}><MessageSquare size={17} /> الشكاوى والملحوظات{newCount > 0 && <span>{newCount}</span>}</button>}
          {canAdmins && <button className={activeTab === "admins" ? "active" : ""} onClick={() => setTab("admins")}><Users size={17} /> حسابات الأدمنز</button>}
          {canMembers && <button className={activeTab === "members" ? "active" : ""} onClick={() => setTab("members")}><UserRound size={17} /> الطلاب المسجلون</button>}
          <button className={activeTab === "messages" ? "active" : ""} onClick={() => setTab("messages")}><Mail size={17} /> {isSuper ? "رسائل الأدمنز" : "رسائل المدير"}{unreadAdminMessages.length > 0 && <span>{unreadAdminMessages.length}</span>}</button>
          <div className="admin-sidebar-note"><Clock3 size={15} /><p>بيانات الشكاوى محفوظة في قاعدة بيانات الموقع وليست على جهاز الطالب.</p></div>
        </aside>
        <main className="admin-content">{activeTab === "manus" ? <ManusPanel /> : activeTab === "messages" && isSuper ? <AdminMessagesPanel /> : activeTab === "complaints" && canComplaints ? <ComplaintsPanel /> : activeTab === "admins" && canAdmins ? <AdminsPanel canCreate={isSuper || me.data.permissions.includes("admins")} /> : activeTab === "members" && canMembers ? <MembersPanel /> : <div className="admin-empty"><ShieldCheck size={28} /><h3>لا توجد صلاحيات كافية</h3><p>اطلب من المدير الرئيسي إضافة صلاحية لهذا الحساب.</p></div>}</main>
      </div>
    </AdminPageFrame>
  );
}

function ManusPanel() {
  const me = trpc.admin.auth.me.useQuery();
  const isSuper = me.data?.role === "superadmin";
  const recipientsQuery = trpc.admin.messages.recipients.useQuery(undefined, { enabled: isSuper });
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [selectedRecipients, setSelectedRecipients] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const sendMessage = trpc.admin.messages.send.useMutation({ onSuccess: () => { setSubject(""); setMessage(""); setSelectedRecipients([]); } });
  function toggleRecipient(id: number) { setSelectedRecipients((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]); }
  async function ask(event: React.FormEvent) {
    event.preventDefault();
    if (!prompt.trim()) return;
    setLoading(true); setAnswer("");
    try {
      const response = await fetch("/api/ai/solve", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ question: prompt.trim() }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "تعذر الاتصال بالمساعد");
      setAnswer(data.answer || "لم يصل رد واضح.");
    } catch (error) { setAnswer(error instanceof Error ? error.message : "حدث خطأ غير متوقع."); }
    finally { setLoading(false); }
  }
  return <section><div className="admin-section-heading"><div><span className="section-kicker">مساحة فريق سهلات</span><h2><Bot size={22} /> مساعد Manus</h2><p>اسأل عن مشكلة في الموقع أو أرسل رسالة مباشرة. الأدمن يرسل للمدير، والمدير يختار أدمنًا واحدًا أو عدة أدمنز.</p></div></div><form className="manus-admin-card" onSubmit={ask}><label>سؤالك أو المشكلة التي تريد مراجعتها<textarea value={prompt} onChange={(event) => setPrompt(event.target.value)} placeholder="مثال: كيف أبلغ المدير عن مشكلة في سؤال الباب ٢؟" required /></label><button className="button button-primary" disabled={loading}>{loading ? "جارٍ التفكير..." : "اسأل Manus"} <Send size={16} /></button></form>{answer && <div className="manus-answer"><b>رد مساعد Manus</b><p>{answer}</p><button type="button" className="button button-quiet" onClick={() => { setSubject("مراجعة من مساعد Manus"); setMessage(answer); }}>تحويل الرد إلى رسالة للمدير</button></div>}<form className="manus-message-form" onSubmit={(event) => { event.preventDefault(); sendMessage.mutate({ subject: subject.trim(), message: message.trim(), recipientAdminIds: selectedRecipients }); }}><h3><Mail size={18} /> {isSuper ? "إرسال رسالة إلى الأدمنز" : "إرسال رسالة إلى المدير الرئيسي"}</h3>{isSuper && <fieldset className="recipient-picker"><legend>اختر المستلمين</legend>{recipientsQuery.isLoading ? <span>جارٍ تحميل الأدمنز...</span> : recipientsQuery.data?.length ? recipientsQuery.data.map((recipient) => <label key={recipient.id}><input type="checkbox" checked={selectedRecipients.includes(recipient.id)} onChange={() => toggleRecipient(recipient.id)} /> <span>{recipient.name}</span><small dir="ltr">{recipient.email}</small></label>) : <span>لا يوجد أدمنز نشطون.</span>}</fieldset>}<label>عنوان الرسالة<input value={subject} onChange={(event) => setSubject(event.target.value)} required maxLength={200} placeholder="عنوان واضح" /></label><label>نص الرسالة<textarea value={message} onChange={(event) => setMessage(event.target.value)} required maxLength={10000} placeholder="اكتب التفاصيل أو ألصق رد Manus هنا" /></label>{sendMessage.error && <p className="form-error">{sendMessage.error.message}</p>}{sendMessage.data && <p className="form-success">تم إرسال الرسالة بنجاح.</p>}<button className="button button-gold" disabled={sendMessage.isPending || (isSuper && selectedRecipients.length === 0)}>{sendMessage.isPending ? "جارٍ الإرسال..." : isSuper ? "إرسال للأدمنز المحددين" : "إرسال للمدير"} <Mail size={16} /></button></form></section>;
}

function AdminMessagesPanel() {
  const me = trpc.admin.auth.me.useQuery();
  const query = trpc.admin.messages.list.useQuery();
  const markRead = trpc.admin.messages.markRead.useMutation({ onSuccess: () => query.refetch() });
  const items = query.data ?? [];
  const isSuper = me.data?.role === "superadmin";
  return <section><div className="admin-section-heading"><div><span className="section-kicker">صندوق الرسائل</span><h2>{isSuper ? "رسائل الأدمنز" : "رسائل المدير"}</h2><p>{isSuper ? "كل رسالة توضح اسم وبريد الأدمن الذي أرسلها." : "هنا تظهر رسائل المدير الرئيسي الموجهة إليك."}</p></div><div className="admin-counts"><span><b>{items.length}</b> رسالة</span><span><b>{items.filter((item) => !item.readAt).length}</b> جديدة</span></div></div>{query.isLoading ? <div className="admin-empty">جارٍ تحميل الرسائل...</div> : query.error ? <div className="admin-error">تعذر تحميل الرسائل: {query.error.message}</div> : items.length === 0 ? <div className="admin-empty"><Mail size={28} /><h3>لا توجد رسائل {isSuper ? "من الأدمنز" : "من المدير"}</h3><p>ستظهر هنا الرسائل المرسلة من تبويب مساعد Manus.</p></div> : <div className="admin-messages-list">{items.map((item) => <article className={`admin-message-row ${item.readAt ? "is-read" : "is-new"}`} key={item.id}><div className="complaint-row-head"><div><span className="complaint-status-dot" /><b>{item.subject}</b><a href={`mailto:${item.senderEmail}`}>{item.senderName} · {item.senderEmail}</a></div><time>{formatDate(item.createdAt)}</time></div><p className="complaint-message">{item.message}</p>{!item.readAt && <button className="button button-quiet" onClick={() => markRead.mutate({ id: item.id })} disabled={markRead.isPending}><Check size={15} /> تحديد كمقروءة</button>}</article>)}</div>}</section>;
}

function AdminLogin({ onAuthenticated }: { onAuthenticated: () => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const login = trpc.admin.auth.login.useMutation({ onSuccess: onAuthenticated });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    login.mutate({ email: email.trim(), password });
  }
  return <AdminPageFrame><main className="admin-login-shell"><section className="admin-login-card"><span className="admin-login-mark"><ShieldCheck size={29} /></span><span className="section-kicker">سهلات · دخول آمن</span><h1>لوحة الإدارة</h1><p>هذه المنطقة مخصصة لفريق سهلات لمراجعة رسائل الطلاب.</p><form onSubmit={submit} className="admin-form"><label>البريد الإلكتروني<input type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder="admin@example.com" dir="ltr" autoComplete="username" /></label><label className="password-field">كلمة المرور<div><input type={showPassword ? "text" : "password"} required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" dir="ltr" autoComplete="current-password" /><button type="button" onClick={() => setShowPassword((value) => !value)} aria-label={showPassword ? "إخفاء كلمة المرور" : "إظهار كلمة المرور"}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>{login.error && <p className="form-error">{login.error.message}</p>}<button className="button button-primary" disabled={login.isPending}>{login.isPending ? "جارٍ التحقق..." : "دخول لوحة الإدارة"} <ArrowRight size={16} /></button></form><button className="admin-back-link" onClick={() => { window.location.href = "/"; }}>العودة إلى سهلات</button></section></main></AdminPageFrame>;
}

function ComplaintsPanel() {
  const query = trpc.admin.complaints.list.useQuery();
  const items = query.data ?? [];
  const counts = useMemo(() => ({ all: items.length, open: items.filter((item) => item.status !== "resolved").length, resolved: items.filter((item) => item.status === "resolved").length }), [items]);
  return <section><div className="admin-section-heading"><div><span className="section-kicker">صندوق الوارد</span><h2>الشكاوى والملحوظات</h2><p>راجع الرسائل، حدّد حالتها، وأضف ملاحظة داخلية عند الحاجة.</p></div><div className="admin-counts"><span><b>{counts.all}</b> الكل</span><span><b>{counts.open}</b> مفتوحة</span><span><b>{counts.resolved}</b> تمت المتابعة</span></div></div>{query.isLoading ? <div className="admin-empty">جارٍ تحميل الرسائل...</div> : query.error ? <div className="admin-error">تعذر تحميل الشكاوى: {query.error.message}</div> : items.length === 0 ? <div className="admin-empty"><MessageSquare size={28} /><h3>لا توجد شكاوى بعد</h3><p>عندما يرسل الطلاب رسائل من الفوتر ستظهر هنا.</p></div> : <div className="complaint-list">{items.map((item) => <ComplaintRow key={item.id} complaint={item} onSaved={() => query.refetch()} />)}</div>}</section>;
}

function ComplaintRow({ complaint, onSaved }: { complaint: { id: number; name: string | null; email: string | null; message: string; status: ComplaintStatus; adminNote: string | null; createdAt: Date; }; onSaved: () => void }) {
  const [status, setStatus] = useState<ComplaintStatus>(complaint.status);
  const [note, setNote] = useState(complaint.adminNote ?? "");
  const update = trpc.admin.complaints.update.useMutation({ onSuccess: onSaved });
  return <article className={`complaint-row status-${status}`}><div className="complaint-row-head"><div><span className="complaint-status-dot" /><b>{complaint.name || "زائر بدون اسم"}</b>{complaint.email && <a href={`mailto:${complaint.email}`}>{complaint.email}</a>}</div><time>{formatDate(complaint.createdAt)}</time></div><p className="complaint-message">{complaint.message}</p><div className="complaint-row-actions"><label>الحالة<select value={status} onChange={(event) => setStatus(event.target.value as ComplaintStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label className="complaint-note-field">ملاحظة داخلية<textarea value={note} onChange={(event) => setNote(event.target.value)} maxLength={3000} placeholder="اختياري" /></label><button className="button button-primary" onClick={() => update.mutate({ id: complaint.id, status, adminNote: note.trim() || undefined })} disabled={update.isPending}>{update.isPending ? "جارٍ الحفظ..." : "حفظ التعديل"} <Check size={15} /></button></div>{update.error && <p className="form-error">{update.error.message}</p>}</article>;
}

function AdminsPanel({ canCreate }: { canCreate: boolean }) {
  const query = trpc.admin.users.list.useQuery();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [permissions, setPermissions] = useState<Array<"complaints" | "members" | "admins">>(["complaints"]);
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const create = trpc.admin.users.create.useMutation({ onSuccess: () => { setName(""); setEmail(""); setPassword(""); setPermissions(["complaints"]); setShowForm(false); query.refetch(); } });
  const updatePermissions = trpc.admin.users.updatePermissions.useMutation({ onSuccess: () => query.refetch() });
  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    create.mutate({ name: name.trim(), email: email.trim(), password, permissions });
  }
  const togglePermission = (permission: "complaints" | "members" | "admins") => setPermissions((current) => current.includes(permission) ? current.filter((item) => item !== permission) : [...current, permission]);
  const permissionLabels = { complaints: "الشكاوى", members: "الطلاب والحسابات", admins: "الأدمنز" } as const;
  return <section><div className="admin-section-heading"><div><span className="section-kicker">صلاحيات الوصول</span><h2>حسابات الأدمنز</h2><p>اختر بدقة ما يستطيع كل أدمن مشاهدته أو إدارته.</p></div>{canCreate && <button className="button button-primary" onClick={() => setShowForm((value) => !value)}>{showForm ? <X size={16} /> : <Plus size={16} />} {showForm ? "إغلاق" : "إضافة أدمن"}</button>}</div>{showForm && <form className="admin-add-form" onSubmit={submit}><h3>إضافة حساب أدمن جديد</h3><div className="admin-form-grid"><label>الاسم<input required value={name} onChange={(event) => setName(event.target.value)} maxLength={120} /></label><label>البريد الإلكتروني<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} maxLength={320} dir="ltr" /></label><label className="password-field">كلمة المرور <span>٨ أحرف على الأقل</span><div><input required type={showCreatePassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} maxLength={200} dir="ltr" /><button type="button" onClick={() => setShowCreatePassword((value) => !value)}>{showCreatePassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label></div><div className="permission-picker"><b>الصلاحيات</b><div>{Object.entries(permissionLabels).map(([permission, label]) => <label key={permission}><input type="checkbox" checked={permissions.includes(permission as typeof permissions[number])} onChange={() => togglePermission(permission as typeof permissions[number])} /> {label}</label>)}</div></div>{create.error && <p className="form-error">{create.error.message}</p>}<button className="button button-gold" disabled={create.isPending || permissions.length === 0}>{create.isPending ? "جارٍ الإنشاء..." : "إنشاء الحساب"}</button></form>}{query.error ? <div className="admin-error">تعذر تحميل الحسابات: {query.error.message}</div> : <div className="admins-table"><div className="admins-table-head"><span>الاسم</span><span>البريد</span><span>الصلاحية</span><span>آخر دخول</span></div>{(query.data ?? []).map((admin) => { let current: string[] = []; try { current = JSON.parse(admin.permissions || "[]"); } catch {} const update = (permission: "complaints" | "members" | "admins") => updatePermissions.mutate({ id: admin.id, permissions: current.includes(permission) ? current.filter((item) => item !== permission) as Array<"complaints" | "members" | "admins"> : [...current, permission] as Array<"complaints" | "members" | "admins"> }); return <div className="admins-table-row" key={admin.id}><strong><span className="admin-small-avatar">{admin.name.slice(0, 1)}</span>{admin.name}</strong><span dir="ltr">{admin.email}</span><span className="admin-role">{admin.role === "superadmin" ? "كل الصلاحيات" : current.map((item) => permissionLabels[item as keyof typeof permissionLabels] || item).join("، ") || "بدون صلاحيات"}</span><span>{formatDate(admin.lastLoginAt)}</span>{canCreate && admin.role !== "superadmin" && <div className="admin-permission-edit"><span>تعديل:</span>{Object.entries(permissionLabels).map(([permission, label]) => <label key={permission}><input type="checkbox" checked={current.includes(permission)} onChange={() => update(permission as "complaints" | "members" | "admins")} disabled={updatePermissions.isPending} />{label}</label>)}</div>}</div>; })}</div>}</section>;
}

function MembersPanel() {
  const query = trpc.admin.members.list.useQuery();
  const ban = trpc.admin.members.setBanned.useMutation({ onSuccess: () => query.refetch() });
  const remove = trpc.admin.members.remove.useMutation({ onSuccess: () => query.refetch() });
  const changePassword = trpc.admin.members.changePassword.useMutation();
  const [passwordFor, setPasswordFor] = useState<number | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [showMemberPassword, setShowMemberPassword] = useState(false);
  const items = query.data ?? [];
  return <section><div className="admin-section-heading"><div><span className="section-kicker">قاعدة بيانات الطلاب</span><h2>الطلاب المسجلون</h2><p>تظهر الأسماء والبريد والحالة. كلمات المرور لا تُعرض أبدًا، ويمكن تعديل الأبواب والتقدم من زر إدارة التقدم.</p></div><div className="admin-counts"><span><b>{items.length}</b> حساب</span><span><b>{items.filter((item) => item.isBanned).length}</b> محظور</span></div></div>{query.isLoading ? <div className="admin-empty">جارٍ تحميل الحسابات...</div> : query.error ? <div className="admin-error">تعذر تحميل الطلاب: {query.error.message}</div> : <div className="members-list">{items.map((member) => <article className={`member-row ${member.isBanned ? "is-banned" : ""}`} key={member.id}><div className="member-info"><span className="admin-small-avatar"><UserRound size={15} /></span><div><b>{member.name}</b><a href={`mailto:${member.email}`} dir="ltr">{member.email}</a><small>انضم في {formatDate(member.createdAt)}</small></div></div><span className={`member-status ${member.isBanned ? "banned" : "active"}`}>{member.isBanned ? "محظور" : "نشط"}</span><div className="member-actions"><MemberProgressEditor memberId={member.id} /><button className="button button-quiet" onClick={() => { setPasswordFor(member.id); setNewPassword(""); setShowMemberPassword(false); }}><KeyRound size={14} /> تغيير الباسورد</button><button className="button button-quiet" onClick={() => ban.mutate({ id: member.id, banned: !member.isBanned })} disabled={ban.isPending}><UserX size={14} /> {member.isBanned ? "فك الحظر" : "حظر"}</button><button className="button danger-button" onClick={() => { if (window.confirm(`حذف حساب ${member.name} نهائيًا؟`)) remove.mutate({ id: member.id }); }} disabled={remove.isPending}><X size={14} /> حذف</button></div>{passwordFor === member.id && <form className="member-password-form" onSubmit={(event) => { event.preventDefault(); changePassword.mutate({ id: member.id, password: newPassword }, { onSuccess: () => { setPasswordFor(null); setNewPassword(""); } }); }}><div className="password-field"><input type={showMemberPassword ? "text" : "password"} required minLength={8} maxLength={200} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} placeholder="كلمة المرور الجديدة" dir="ltr" /><button type="button" onClick={() => setShowMemberPassword((value) => !value)}>{showMemberPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div><button className="button button-gold" disabled={changePassword.isPending}>{changePassword.isPending ? "جارٍ الحفظ..." : "حفظ"}</button><button type="button" className="admin-back-link" onClick={() => setPasswordFor(null)}>إلغاء</button>{changePassword.error && <p className="form-error">{changePassword.error.message}</p>}</form>}</article>)}</div>}</section>;
}

function MemberProgressEditor({ memberId }: { memberId: number }) {
  const [open, setOpen] = useState(false);
  const [doors, setDoors] = useState([false, false, false, false]);
  const progress = trpc.admin.members.progress.useQuery({ id: memberId }, { enabled: open });
  const save = trpc.admin.members.updateProgress.useMutation({ onSuccess: () => setOpen(false) });
  useEffect(() => {
    if (!progress.data) return;
    const data = progress.data as { completedPractice?: boolean[] };
    setDoors(Array.from({ length: 4 }, (_, index) => Boolean(data.completedPractice?.[index])));
  }, [progress.data]);
  function submit() {
    const data = progress.data && typeof progress.data === "object" ? { ...(progress.data as Record<string, unknown>), completedPractice: doors } : { completedPractice: doors, completedLessons: [], quizHistory: [], favorites: [] };
    save.mutate({ id: memberId, data: JSON.stringify(data) });
  }
  return <><button className="button button-quiet" onClick={() => setOpen((value) => !value)}>إدارة التقدم</button>{open && <div className="member-progress-editor"><b>الأبواب المفتوحة للطالب</b>{progress.isLoading ? <span>جارٍ التحميل...</span> : <div className="door-checks">{doors.map((checked, index) => <label key={index}><input type="checkbox" checked={checked} onChange={() => setDoors((current) => current.map((item, itemIndex) => itemIndex <= index ? !checked : false))} /> الباب {index}</label>)}</div>}<small>فتح باب متقدم يفتح الأبواب السابقة تلقائيًا حتى يظهر للطالب بالترتيب الصحيح.</small><div><button className="button button-gold" onClick={submit} disabled={save.isPending || progress.isLoading}>{save.isPending ? "جارٍ الحفظ..." : "حفظ التقدم"}</button><button className="admin-back-link" onClick={() => setOpen(false)}>إلغاء</button></div>{save.error && <p className="form-error">{save.error.message}</p>}</div>}</>;
}

function AdminPageFrame({ children }: { children: React.ReactNode }) {
  return <div className="admin-page" dir="rtl"><div className="admin-page-ornament" />{children}<footer className="admin-footer">سهلات · لوحة الإدارة <span>الدخول محمي بجلسة خاصة</span></footer></div>;
}
