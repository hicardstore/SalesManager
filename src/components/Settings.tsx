import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Shield, Bell, Sliders, LogOut, ChevronLeft, Cloud, KeyRound, Check, AlertCircle, X, Trash2, Laptop, Smartphone } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ProjectWorkspace } from "../types";

export function Settings({ 
  onLogoutReq,
  activeProject,
  devices = [],
  onDeleteDevice
}: { 
  onLogoutReq: () => void;
  activeProject: ProjectWorkspace | null;
  devices?: any[];
  onDeleteDevice?: (id: string) => void;
}) {
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

  const [newMemberEmail, setNewMemberEmail] = useState("");
  const [isUpdatingMembers, setIsUpdatingMembers] = useState(false);
  const [collabMsg, setCollabMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const isLocalMode = !user || user.id.startsWith("local_") || user.id === "offline_guest_user_id" || (activeProject && activeProject.id.startsWith("local_proj_"));

  const handleAddMember = async () => {
    if (!activeProject || !newMemberEmail.trim()) return;
    setCollabMsg(null);
    const emailToAdd = newMemberEmail.toLowerCase().trim();

    if (!emailToAdd.includes("@") || emailToAdd.length < 5) {
      setCollabMsg({ type: "error", text: "صيغة البريد الإلكتروني غير صالحة." });
      return;
    }

    const currentEmails = activeProject.memberEmails || [];
    if (currentEmails.some(e => e.toLowerCase() === emailToAdd)) {
      setCollabMsg({ type: "error", text: "هذا البريد الإلكتروني مضاف بالفعل في مساحة العمل." });
      return;
    }

    setIsUpdatingMembers(true);
    try {
      const projectRef = doc(db, "projects", activeProject.id);
      const updatedEmails = [...currentEmails, emailToAdd];
      const updatedMembers = [
        ...(activeProject.members || []),
        {
          email: emailToAdd,
          name: emailToAdd.split("@")[0],
          role: "عارض" as const,
          status: "نشط" as const
        }
      ];

      await updateDoc(projectRef, {
        memberEmails: updatedEmails,
        members: updatedMembers
      });

      setCollabMsg({ type: "success", text: `تمت إضافة العضو ${emailToAdd} بنجاح!` });
      setNewMemberEmail("");
    } catch (err: any) {
      console.error("Failed to add member to project:", err);
      setCollabMsg({ type: "error", text: "فشلت إضافة العضو. يرجى التحقق من اتصالك وصلاحياتك." });
    } finally {
      setIsUpdatingMembers(false);
    }
  };

  const handleRemoveMember = async (emailToRemove: string) => {
    if (!activeProject) return;
    setCollabMsg(null);
    setIsUpdatingMembers(true);
    try {
      const projectRef = doc(db, "projects", activeProject.id);
      const currentEmails = activeProject.memberEmails || [];
      const updatedEmails = currentEmails.filter(e => e.toLowerCase() !== emailToRemove.toLowerCase());
      const updatedMembers = (activeProject.members || []).filter(m => m.email.toLowerCase() !== emailToRemove.toLowerCase());

      await updateDoc(projectRef, {
        memberEmails: updatedEmails,
        members: updatedMembers
      });

      setCollabMsg({ type: "success", text: `تم حذف العضو ${emailToRemove} من مساحة العمل.` });
    } catch (err: any) {
      console.error("Failed to remove member from project:", err);
      setCollabMsg({ type: "error", text: "فشل حذف العضو. يرجى المحاولة لاحقاً." });
    } finally {
      setIsUpdatingMembers(false);
    }
  };

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
        { label: "المزامنة السحابية (Firebase)", value: "متصل نشط ✅", action: false },
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
                        item.value.includes("نشط") || item.value === "مربوط" 
                          ? "bg-emerald-50 text-emerald-600" 
                          : "bg-amber-50 text-amber-600"
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

        {/* 1. Cloud Sync Diagnostic Card */}
        <div className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)] p-5 space-y-4">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-50">
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-neutral-900 text-sm">حالة المزامنة السحابية والربط</h3>
              <p className="text-xs text-neutral-400 font-medium">التحقق من حالة الاتصال وقابلية مشاركة البيانات</p>
            </div>
          </div>

          <div className="space-y-3" dir="rtl">
            <div className="p-3 bg-emerald-50/70 border border-emerald-200/50 rounded-xl flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              <div className="space-y-1 text-right">
                <p className="text-xs font-black text-emerald-850">مزامنة سحابية نشطة ومباشرة (Firebase)</p>
                <p className="text-[11px] text-emerald-700 font-bold leading-relaxed">
                  حسابك متصل بقاعدة البيانات السحابية الحية بنجاح! جميع العمليات التي تسجلها تظهر في الوقت الفعلي على جميع الأجهزة المفتوحة بنفس الحساب دون أي تأخير.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* 2. Team Collaboration & Share Card */}
        {activeProject && (
          <div className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)] p-5 space-y-4" dir="rtl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-50">
              <div className="p-2 rounded-xl bg-neutral-900 text-white">
                <User className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-neutral-900 text-sm">مشاركة فريق العمل (التعاون السحابي)</h3>
                <p className="text-xs text-neutral-400 font-medium">دعوة أصدقائك أو شركائك لرؤية وتسجيل العمليات معك</p>
              </div>
            </div>

            <div className="space-y-3 text-right">
              <div className="flex flex-col gap-1 p-3 bg-neutral-50 rounded-xl border border-neutral-100">
                <span className="text-[10px] font-black text-neutral-400">اسم مساحة العمل الحالية</span>
                <span className="text-xs font-black text-neutral-800">{activeProject.name}</span>
                <span className="text-[10px] text-neutral-400 font-bold mt-0.5">المالك: {activeProject.ownerEmail}</span>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-neutral-700 block">الأعضاء الحاليين بمساحة العمل ({activeProject.memberEmails?.length || 0})</span>
                <div className="divide-y divide-neutral-50 border border-neutral-100 rounded-xl overflow-hidden bg-white">
                  {(activeProject.memberEmails || []).map((email) => {
                    const isOwner = email.toLowerCase().trim() === activeProject.ownerEmail.toLowerCase().trim();
                    const isMe = email.toLowerCase().trim() === (user?.email || "").toLowerCase().trim();
                    const canDelete = !isOwner && (user?.email || "").toLowerCase().trim() === activeProject.ownerEmail.toLowerCase().trim();
                    return (
                      <div key={email} className="p-3 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                        <div className="flex flex-col text-right">
                          <span className="text-xs font-bold text-neutral-800">{email}</span>
                          <span className="text-[9px] text-neutral-400 font-bold">
                            {isOwner ? "مالك المشروع" : "عضو مشارك"} {isMe && "(أنت)"}
                          </span>
                        </div>
                        {canDelete && (
                          <button
                            onClick={() => handleRemoveMember(email)}
                            disabled={isUpdatingMembers}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                            title="حذف العضو"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Add Member Form */}
              {((user?.email || "").toLowerCase().trim() === activeProject.ownerEmail.toLowerCase().trim()) && (
                <div className="pt-2 space-y-2">
                  <span className="text-xs font-black text-neutral-700 block">إضافة شريك/صديق لمساحة العمل</span>
                  <div className="flex gap-2">
                    <input
                      type="email"
                      placeholder="بريد صديقك الإلكتروني..."
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      disabled={isUpdatingMembers}
                      className="flex-1 px-3.5 py-2.5 bg-neutral-50/50 border border-neutral-200 focus:border-neutral-900 outline-none rounded-xl text-xs font-bold text-neutral-850 placeholder-neutral-400 text-left"
                    />
                    <button
                      onClick={handleAddMember}
                      disabled={isUpdatingMembers || !newMemberEmail}
                      className="bg-neutral-900 hover:bg-neutral-800 text-white text-xs font-bold px-4 py-2.5 rounded-xl transition-colors shrink-0 cursor-pointer disabled:opacity-50"
                    >
                      {isUpdatingMembers ? "جاري الإضافة..." : "دعوة وإضافة"}
                    </button>
                  </div>
                  {collabMsg && (
                    <p className={`text-[10px] font-black ${collabMsg.type === 'success' ? 'text-emerald-600' : 'text-red-500'}`}>
                      {collabMsg.text}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* 3. Devices Log Card (سجل الأجهزة المتصلة بالحساب) */}
        <div className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)] p-5 space-y-4" dir="rtl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-50">
            <div className="p-2 rounded-xl bg-neutral-900 text-white">
              <Laptop className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-neutral-900 text-sm">الأجهزة النشطة المتصلة بالحساب</h3>
              <p className="text-xs text-neutral-400 font-medium">قائمة بالأجهزة والمتصفحات التي سجلت دخولها لحسابك ومزامنتها نشطة حالياً</p>
            </div>
          </div>

          <div className="space-y-3 text-right">
            <div className="divide-y divide-neutral-100 border border-neutral-100 rounded-2xl overflow-hidden bg-white">
              {devices.map((device: any) => (
                <div key={device.id || device.docId} className="p-3.5 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl shrink-0 ${device.current ? 'bg-emerald-50 text-emerald-600' : 'bg-neutral-50 text-neutral-400'}`}>
                      {device.deviceName?.toLowerCase().includes("phone") || device.deviceName?.toLowerCase().includes("android") || device.deviceName?.toLowerCase().includes("ios") ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <Laptop className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex flex-col text-right">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-xs font-black text-neutral-850">{device.deviceName || "جهاز غير معروف"}</span>
                        {device.current && (
                          <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded-full">
                            الجهاز الحالي
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-neutral-400 font-bold mt-1 leading-none">
                        آخر نشاط: {device.lastActive ? new Date(device.lastActive).toLocaleString('ar-SA', { hour12: true }) : "نشط الآن"}
                      </span>
                    </div>
                  </div>
                  {!device.current && onDeleteDevice && (
                    <button
                      onClick={() => onDeleteDevice(device.docId || device.id)}
                      className="p-1.5 text-red-500 hover:bg-red-50 hover:text-red-600 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="إنهاء الجلسة وتسجيل الخروج"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
              {devices.length === 0 && (
                <div className="p-6 text-center text-xs text-neutral-400 font-bold">
                  لا توجد سجلات أجهزة متصلة مسجلة حالياً.
                </div>
              )}
            </div>
          </div>
        </div>
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
