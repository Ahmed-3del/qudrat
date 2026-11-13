import { useState } from "react";
import { CheckCircle2, MessageSquare, Send, X } from "lucide-react";
import { trpc } from "@/lib/trpc";

type ComplaintDialogProps = { onClose: () => void; email?: string; beforeAuth?: boolean };

export default function ComplaintDialog({ onClose, email = "", beforeAuth = false }: ComplaintDialogProps) {
  const [name, setName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sent, setSent] = useState(false);
  const submit = trpc.complaints.submit.useMutation({
    onSuccess: () => setSent(true),
  });

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const contactEmail = beforeAuth ? manualEmail.trim() : email;
    submit.mutate({
      name: name.trim(),
      email: contactEmail,
      message: message.trim(),
    });
  }

  return (
    <div className="complaint-backdrop" onClick={onClose}>
      <section className="complaint-dialog" onClick={(event) => event.stopPropagation()} dir="rtl" aria-labelledby="complaint-title">
        <button className="complaint-close" onClick={onClose} aria-label="إغلاق"><X size={18} /></button>
        {sent ? (
          <div className="complaint-success">
            <span className="complaint-success-icon"><CheckCircle2 size={29} /></span>
            <h2>وصلت رسالتك</h2>
            <p>شكرًا لمساعدتنا على تحسين سهلات. سنراجع شكواك أو ملحوظتك باهتمام.</p>
            <button className="button button-primary" onClick={onClose}>تمام</button>
          </div>
        ) : (
          <>
            <div className="complaint-heading"><span className="complaint-icon"><MessageSquare size={20} /></span><div><span className="section-kicker">صوتك يهمنا</span><h2 id="complaint-title">إرسال شكوى أو ملحوظة</h2></div></div>
            <p className="complaint-description">اكتب لنا أي مشكلة أو اقتراح يساعدنا نخلي تجربة سهلات أفضل.{beforeAuth ? " اكتب بريدك حتى نقدر نتابع معك." : " سيظهر بريد حسابك المسجل لدى الإدارة للمتابعة."}</p>
            <form onSubmit={handleSubmit} className="complaint-form">
              <label>الاسم <span>اختياري</span><input value={name} onChange={(event) => setName(event.target.value)} maxLength={120} placeholder="اسمك" /></label>
              {beforeAuth && <label>البريد الإلكتروني <b>*</b><input required type="email" value={manualEmail} onChange={(event) => setManualEmail(event.target.value)} maxLength={320} placeholder="name@example.com" dir="ltr" autoComplete="email" /></label>}
              <label>الشكوى أو الملحوظة <b>*</b><textarea required value={message} onChange={(event) => setMessage(event.target.value)} maxLength={5000} minLength={3} placeholder="اكتب رسالتك هنا..." /></label>
              {submit.error && <p className="form-error">{submit.error.message}</p>}
              {!beforeAuth && !email && <p className="form-error">سجّل الدخول أولًا حتى يظهر بريدك لدى الإدارة.</p>}
              <button className="button button-primary complaint-submit" disabled={submit.isPending || message.trim().length < 3 || (!beforeAuth && !email) || (beforeAuth && !manualEmail.trim())}>{submit.isPending ? "جارٍ الإرسال..." : "إرسال الرسالة"} <Send size={16} /></button>
            </form>
          </>
        )}
      </section>
    </div>
  );
}
