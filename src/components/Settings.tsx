import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Shield, Bell, Sliders, LogOut, ChevronLeft, Cloud, KeyRound, Check, AlertCircle, X, Trash2 } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

export function Settings({ onLogoutReq }: { onLogoutReq: () => void }) {
  const { user, updateUserPassword, deleteUserAccount } = useAuth();
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error" | "success">("idle");
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");

  // Prevent background scrolling when password update modal is open
  React.useEffect(() => {
    if (showPasswordModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showPasswordModal]);

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [msg, setMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (newPassword.length < 6) {
      setMsg({ type: "error", text: "يجب أن تكون كلمة المرور 6 أحرف على الأقل." });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMsg({ type: "error", text: "كلمتا المرور غير متطابقتين." });
      return;
    }

    setIsSubmitting(true);
    try {
      const success = await updateUserPassword(newPassword);
      if (success) {
        setMsg({ type: "success", text: "تم تغيير كلمة المرور بنجاح!" });
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setShowPasswordModal(false);
          setMsg(null);
        }, 1800);
      } else {
        setMsg({ type: "error", text: "حدث خطأ غير متوقع. يرجى المحاولة لاحقاً." });
      }
    } catch (err: any) {
      setMsg({ type: "error", text: err?.message || "فشل تغيير كلمة المرور." });
    } finally {
      setIsSubmitting(false);
    }
  };

  const sections = [
    {
      title: "تفاصيل الحساب",
      icon: <User className="w-4 h-4 text-neutral-500" />,
      items: [
        { label: "البريد الإلكتروني", value: user?.email || "غير متوفر", action: false },
        { 
          label: "تغيير كلمة المرور", 
          value: "", 
          action: true, 
          onClick: () => {
            setMsg(null);
            setNewPassword("");
            setConfirmPassword("");
            setShowPasswordModal(true);
          }
        },
      ]
    },
    {
      title: "الربط والخدمات السحابية",
      icon: <Cloud className="w-4 h-4 text-emerald-500" />,
      items: [
        { label: "المزامنة السحابية (Firebase)", value: "متصل نشط", action: false },
      ]
    },
    {
      title: "الإشعارات والأمان",
      icon: <Bell className="w-4 h-4 text-blue-500" />,
      items: [
        { label: "إشعارات العمليات", value: "مفعل", action: true },
        { label: "التحقق بخطوتين", value: "غير مفعل", action: true },
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">الإعدادات</h2>
        <p className="text-sm text-neutral-500 mt-1 font-medium">إدارة تفضيلات حسابك وخيارات النظام</p>
      </div>

      <div className="space-y-5">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 p-4 bg-neutral-50/50 border-b border-neutral-100">
              {section.icon}
              <h3 className="font-bold text-neutral-900 text-sm">{section.title}</h3>
            </div>
            <div className="divide-y divide-neutral-50">
              {(section.items as any[]).map((item, itemIdx) => (
                <div 
                  key={itemIdx} 
                  onClick={item.onClick}
                  className={`p-4 flex items-center justify-between transition-colors ${item.action || item.onClick ? 'hover:bg-neutral-50/50 cursor-pointer group' : ''}`}
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold text-neutral-800">{item.label}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.value && (
                      <span className={`text-xs font-bold px-2 py-1 rounded-md ${
                        item.value === "مربوط" || item.value === "متصل نشط" 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-neutral-100 text-neutral-400"
                      }`}>{item.value}</span>
                    )}
                    {item.action && (
                      <ChevronLeft className="w-4 h-4 text-neutral-300 group-hover:text-neutral-900 transition-colors" />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="pt-4 space-y-3">
        <button
          onClick={onLogoutReq}
          className="w-full bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>تسجيل الخروج من الحساب</span>
        </button>

        <button
          onClick={() => {
            setDeleteErrorMsg("");
            setDeleteStatus("idle");
            setShowDeleteConfirm(true);
          }}
          className="w-full bg-red-50 text-red-600 hover:bg-red-100 hover:text-red-700 transition-colors rounded-2xl p-4 flex items-center justify-center gap-2 font-bold text-sm cursor-pointer border border-red-100"
        >
          <Trash2 className="w-4 h-4" />
          <span>حذف الحساب بالكامل وبشكل نهائي</span>
        </button>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-6 border border-neutral-100 shadow-2xl overflow-hidden text-center"
            >
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
                <AlertCircle className="w-7 h-7" />
              </div>

              <h3 className="text-lg font-black text-neutral-900 mb-2">تنويه هام قبل حذف حسابك</h3>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed mb-6">
                هل أنت متأكد من رغبتك في حذف حسابك بالكامل؟ 
                <br />
                <span className="text-red-500 font-bold block mt-2 text-xs">
                  تنبيه: سيتم مسح بياناتك السحابية والخروج نهائياً. لا يمكن التراجع عن هذا الإجراء، وسيتعين عليك التسجيل مجدداً لتتمكن من استخدام النظام وسيجري حذف كافة بياناتك.
                </span>
              </p>

              {deleteErrorMsg && (
                <div className="p-3 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100 text-right leading-relaxed mb-4 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{deleteErrorMsg}</span>
                </div>
              )}

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(false)}
                  disabled={deleteStatus === "deleting"}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 transition-colors text-neutral-800 font-extrabold text-xs py-3.5 rounded-xl cursor-pointer"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    setDeleteStatus("deleting");
                    setDeleteErrorMsg("");
                    try {
                      const success = await deleteUserAccount();
                      if (success) {
                        setDeleteStatus("success");
                        setShowDeleteConfirm(false);
                      } else {
                        setDeleteStatus("error");
                        setDeleteErrorMsg(
                          "أمنياً: انقضت فترة طويلة منذ آخر تسجيل دخول لك. يرجى تسجيل الخروج ثم إعادة تسجيل الدخول لتتمكن من حذف الحساب بشكل آمن."
                        );
                      }
                    } catch (err: any) {
                      setDeleteStatus("error");
                      setDeleteErrorMsg(err?.message || "فشل حذف الحساب. يرجى المحاولة وقت آخر.");
                    }
                  }}
                  disabled={deleteStatus === "deleting"}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer"
                >
                  {deleteStatus === "deleting" ? "جاري الحذف..." : "تأكيد حذف الحساب"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-[2rem] w-full max-w-md overflow-hidden shadow-2xl border border-neutral-100 animate-in fade-in-50 zoom-in-95 duration-200">
            {/* Header */}
            <div className="p-6 pb-4 border-b border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-neutral-50 rounded-xl text-neutral-700">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-neutral-900 text-lg">تغيير كلمة المرور</h3>
                  <p className="text-xs text-neutral-400 font-medium">قم بتحديث كلمة المرور الخاصة بحسابك</p>
                </div>
              </div>
              <button 
                onClick={() => setShowPasswordModal(false)}
                className="text-neutral-400 hover:text-neutral-900 hover:bg-neutral-50 p-1.5 rounded-xl transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {msg && (
                <div className={`p-4 rounded-2xl flex items-start gap-3 text-sm font-bold border ${
                  msg.type === "success" 
                    ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                    : "bg-red-50 border-red-100 text-red-700"
                }`}>
                  {msg.type === "success" ? (
                    <Check className="w-5 h-5 mt-0.5 shrink-0" />
                  ) : (
                    <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
                  )}
                  <span>{msg.text}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-black text-neutral-500 mb-1.5">كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all text-left"
                />
              </div>

              <div>
                <label className="block text-xs font-black text-neutral-500 mb-1.5">تأكيد كلمة المرور الجديدة</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 bg-neutral-50 border border-neutral-200 rounded-2xl text-sm font-bold text-neutral-800 placeholder-neutral-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-neutral-900/5 focus:border-neutral-900 transition-all text-left"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPasswordModal(false)}
                  className="flex-1 px-4 py-3.5 bg-neutral-100 hover:bg-neutral-200 transition-colors text-neutral-700 rounded-2xl font-bold text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 px-4 py-3.5 bg-neutral-900 hover:bg-neutral-800 disabled:opacity-50 transition-colors text-white rounded-2xl font-bold text-sm shadow-sm"
                >
                  {isSubmitting ? "جاري الحفظ..." : "تأكيد التغيير"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
