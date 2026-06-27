import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { Lock, Mail, ShieldCheck } from "lucide-react";

export function AuthScreens() {
  const { login, register, resetPassword } = useAuth();

  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode !== "reset" && (!email || !password)) {
      setMsg({ type: "error", text: "يرجى ملء كافة الحقول." });
      return;
    }
    if (mode === "reset" && !email) {
      setMsg({ type: "error", text: "يرجى كتابة البريد الإلكتروني." });
      return;
    }

    setLoading(true);
    setMsg({ type: "", text: "" });

    try {
      if (mode === "login") {
        await login(email, password);
      } else if (mode === "register") {
        if (password.length < 6) {
          throw new Error("يجب أن تكون كلمة المرور 6 أحرف على الأقل.");
        }
        try {
          await register(email, password);
          setMsg({ type: "success", text: "تم تسجيل الحساب بنجاح!" });
        } catch (regErr: any) {
          const regErrMsg = regErr?.message || regErr?.code || "";
          if (regErrMsg.includes("email-already-in-use")) {
            try {
              // Graceful auto-login attempt if the account already exists and they used the correct password
              await login(email, password);
              setMsg({ type: "success", text: "حسابك مسجل مسبقاً، تم تسجيل الدخول بنجاح!" });
            } catch (loginErr) {
              // Password didn't match or other error, propagate the original registration error
              throw regErr;
            }
          } else {
            throw regErr;
          }
        }
      } else {
        const res = await resetPassword(email);
        if (res.method === "local") {
          setMsg({ 
            type: "success", 
            text: `هذا الحساب محلي/تجريبي ومخزن في المتصفح فقط. تم إعادة تعيين كلمة المرور بنجاح ومباشرةً إلى: ${res.tempPassword}` 
          });
        } else {
          setMsg({ 
            type: "success", 
            text: "تم إرسال طلب إعادة تعيين كلمة المرور! إذا كان البريد مسجلاً في Firebase، فستصلك رسالة. يرجى مراجعة مجلد الرسائل غير المرغوب فيها (Spam/Junk) وتأكد من تفعيل موفر البريد في لوحة تحكم Firebase." 
          });
        }
      }
    } catch (err: any) {
      const errCode = err?.code || "";
      const errorMsg = err?.message || "";
      const isExpectedAuthError = 
        errCode === "auth/user-not-found" || 
        errCode === "auth/wrong-password" || 
        errCode === "auth/invalid-credential" || 
        errCode === "auth/email-already-in-use" ||
        errCode === "auth/invalid-email" ||
        errCode === "auth/weak-password" ||
        errorMsg.includes("user-not-found") ||
        errorMsg.includes("wrong-password") ||
        errorMsg.includes("invalid-credential") ||
        errorMsg.includes("email-already-in-use") ||
        errorMsg.includes("invalid-email") ||
        errorMsg.includes("weak-password") ||
        errorMsg.includes("password.length");

      if (!isExpectedAuthError) {
        console.error("Auth submit error:", err);
      } else {
        console.warn("Auth validation check:", errorMsg || errCode);
      }

      let arabicError = "حدث خطأ ما. يرجى المحاولة مرة أخرى.";
      if (errorMsg.includes("user-not-found") || errorMsg.includes("wrong-password") || errorMsg.includes("invalid-credential")) {
        arabicError = "البريد الإلكتروني أو كلمة المرور غير صحيحة.";
      } else if (errorMsg.includes("email-already-in-use")) {
        arabicError = "البريد الإلكتروني مسجل بالفعل بالنظام.";
      } else if (errorMsg.includes("invalid-email")) {
        arabicError = "صيغة البريد الإلكتروني غير صالحة.";
      } else if (err?.message) {
        arabicError = err.message;
      }
      setMsg({ type: "error", text: arabicError });
    }
    setLoading(false);
  };

  return (
    <div dir="rtl" className="min-h-screen bg-[#fafafa] flex items-center justify-center p-4 font-sans">
      <div className="w-full max-w-md">
        
        {/* Branding header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 bg-neutral-900 rounded-2xl mb-4 shadow-xl">
            <ShieldCheck className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h1 id="auth-title animate-fade-in" className="text-2xl font-black text-neutral-900 tracking-tight">
            SalesManager Pro
          </h1>
          <p className="text-sm text-neutral-500 mt-2 font-medium">
            منصة إدارة المبيعات وعمليات التقسيط
          </p>
        </div>

        <motion.div
          layout
          className="bg-white rounded-[2rem] p-6 shadow-[0px_0px_30px_rgba(0,0,0,0.03)] border border-neutral-100 overflow-hidden"
        >
          {/* Mode Tabs Selector */}
          <div className="flex bg-neutral-100 p-1.5 rounded-xl mb-6">
            <button
              type="button"
              onClick={() => { setMode("login"); setMsg({ type: "", text: "" }); }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${mode === "login" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              تسجيل الدخول
            </button>
            <button
              type="button"
              onClick={() => { setMode("register"); setMsg({ type: "", text: "" }); }}
              className={`flex-1 text-center py-2 text-xs font-bold rounded-lg transition-all ${mode === "register" ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-800"}`}
            >
              إنشاء حساب جديد
            </button>
          </div>

          <AnimatePresence mode="wait">
            {msg.text && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className={`p-3.5 rounded-xl mb-6 text-xs font-bold text-center leading-relaxed ${msg.type === "success" ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-red-50 text-red-600 border border-red-100"}`}
              >
                {msg.text}
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[11px] font-black text-neutral-500 mb-1.5 mr-1">
                البريد الإلكتروني
              </label>
              <div className="relative">
                <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                  <Mail className="w-4 h-4" />
                </span>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="yourname@domain.com"
                  className="w-full bg-neutral-50/50 focus:bg-white border border-neutral-200/80 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none rounded-xl py-3 pr-10 pl-4 text-xs font-medium transition-all"
                  required
                />
              </div>
            </div>

            {mode !== "reset" && (
              <div>
                <div className="flex justify-between items-center mb-1.5 mr-1">
                  <label className="block text-[11px] font-black text-neutral-500">
                    كلمة المرور
                  </label>
                  {mode === "login" && (
                    <button
                      type="button"
                      onClick={() => setMode("reset")}
                      className="text-[10px] text-neutral-500 hover:text-neutral-900 font-bold transition-colors cursor-pointer"
                    >
                      نسيت كلمة المرور؟
                    </button>
                  )}
                </div>
                <div className="relative">
                  <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-400">
                    <Lock className="w-4 h-4" />
                  </span>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full bg-neutral-50/50 focus:bg-white border border-neutral-200/80 focus:border-neutral-900 focus:ring-1 focus:ring-neutral-900 outline-none rounded-xl py-3 pr-10 pl-4 text-xs font-medium transition-all"
                    required
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-neutral-900 hover:bg-neutral-850 text-white rounded-xl py-3.5 font-bold text-xs transition-colors shadow-md disabled:opacity-75 cursor-pointer mt-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mx-auto"></div>
              ) : mode === "login" ? (
                "دخول"
              ) : mode === "register" ? (
                "إنشاء الحساب ودخول"
              ) : (
                "إرسال رابط استعادة المرور"
              )}
            </button>

            {mode === "reset" && (
              <button
                type="button"
                onClick={() => setMode("login")}
                className="w-full bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl py-3.5 font-bold text-xs transition-colors cursor-pointer"
              >
                تراجع لتسجيل الدخول
              </button>
            )}
          </form>

          {mode === "reset" && (
            <div className="mt-5 p-4 rounded-2xl bg-amber-50/50 border border-amber-100 text-[11px] leading-relaxed text-neutral-600 space-y-2 text-right" dir="rtl">
              <span className="font-black text-amber-800 block text-xs mb-1">
                💡 لماذا قد لا يصل بريد إعادة تعيين كلمة المرور؟
              </span>
              <ul className="list-disc list-inside space-y-1.5 pr-1 font-medium">
                <li>
                  <strong>مجلد الرسائل غير المرغوب فيها (Spam/Junk)</strong>: غالباً ما تصنف أنظمة البريد الإلكتروني رسائل Firebase التلقائية كرسائل غير مرغوب فيها. يرجى مراجعة هذا المجلد في بريدك.
                </li>
                <li>
                  <strong>حساب محلي / وضع تجريبي</strong>: إذا كنت تستخدم حساباً تجريبياً أو محلياً، فالحساب مخزن في متصفحك فقط. تم الآن تغيير كلمة المرور إلى <code className="bg-amber-100/60 px-1.5 py-0.5 rounded font-mono font-bold text-amber-900">123456</code> تلقائياً ومباشرة لتتمكن من الدخول.
                </li>
                <li>
                  <strong>حماية تعداد البريد (Email Protection)</strong>: تمنع إعدادات حماية Firebase إظهار خطأ إذا كان الإيميل غير مسجل بالنظام (لمنع جمع الإيميلات)، ولكنه لن يرسل بريداً في هذه الحالة. يرجى التأكد من كتابة البريد بشكل صحيح تماماً.
                </li>
                <li>
                  <strong>إعدادات موفر الخدمة في Firebase Console</strong>: يجب التأكد من تفعيل خيار <span className="underline">Email/Password</span> تحت تبويب Sign-in providers في صفحة Authentication داخل لوحة تحكم Firebase Console الخاصة بمشروعك حتى تعمل الخدمة بشكل سليم.
                </li>
              </ul>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}
