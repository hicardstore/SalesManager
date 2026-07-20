import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { User, Shield, Bell, Sliders, LogOut, ChevronLeft, Cloud, KeyRound, Check, AlertCircle, X, Trash2, Laptop, Smartphone, Bug, Coins, Download } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { db } from "../firebase";
import { doc, updateDoc } from "firebase/firestore";
import { ProjectWorkspace, Operation } from "../types";
import { DebugPage } from "./DebugPage";
import { formatMoney, formatDate } from "../utils/financeMath";

export function Settings({ 
  onLogoutReq,
  activeProject,
  devices = [],
  onDeleteDevice,
  operations = []
}: { 
  onLogoutReq: () => void;
  activeProject: ProjectWorkspace | null;
  devices?: any[];
  onDeleteDevice?: (id: string) => void;
  operations?: Operation[];
}) {
  const { user, updateUserPassword, deleteUserAccount } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<"general" | "diagnostics">("general");
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteStatus, setDeleteStatus] = useState<"idle" | "deleting" | "error" | "success">("idle");
  const [deleteErrorMsg, setDeleteErrorMsg] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [invitedRole, setInvitedRole] = useState<"محرر" | "عارض">("عارض");

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

  // Rename workspace
  const [isEditingProjectName, setIsEditingProjectName] = useState(false);
  const [newProjectName, setNewProjectName] = useState("");
  const [isUpdatingProjectName, setIsUpdatingProjectName] = useState(false);

  const handleRenameProject = async () => {
    if (!activeProject || !newProjectName.trim() || newProjectName.trim() === activeProject.name) {
      setIsEditingProjectName(false);
      return;
    }
    
    setIsUpdatingProjectName(true);
    try {
      const projectRef = doc(db, "projects", activeProject.id);
      await updateDoc(projectRef, {
        name: newProjectName.trim()
      });
      setCollabMsg({ type: "success", text: "تم تغيير اسم مساحة العمل بنجاح." });
      setIsEditingProjectName(false);
    } catch (err) {
      console.error("Failed to rename project:", err);
      setCollabMsg({ type: "error", text: "فشل تغيير اسم مساحة العمل." });
    } finally {
      setIsUpdatingProjectName(false);
    }
  };

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
          role: invitedRole,
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

  // Export to CSV
  const handleExportCSV = () => {
    if (!operations || operations.length === 0) return;
    
    // CSV Header (UTF-8 with BOM for proper Arabic characters)
    let csvContent = "\uFEFF";
    csvContent += "المعرف,العميل,التاريخ,الحالة,قيمة الباقة (كاش),إجمالي التقسيط,الدفعة الأولى,المتبقي,مزود الخدمة,القسط الشهري,المدة بالأشهر,الرسوم المسجلة\n";
    
    operations.forEach(op => {
      const row = [
        op.id,
        `"${op.clientName?.replace(/"/g, '""') || ""}"`,
        op.date,
        op.status,
        op.packageAmount,
        op.totalInstallmentAmount,
        op.downPayment,
        op.remainingAmount,
        op.provider,
        op.monthlyInstallment,
        op.durationMonths,
        op.commissionFee || 0
      ].join(",");
      csvContent += row + "\n";
    });
    
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `سجل_العمليات_المالية_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to JSON
  const handleExportJSON = () => {
    if (!operations || operations.length === 0) return;
    const jsonString = JSON.stringify(operations, null, 2);
    const blob = new Blob([jsonString], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `نسخة_احتياطية_العمليات_${new Date().toISOString().slice(0, 10)}.json`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
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
        { label: "إشعارات العمليات", value: "مفعل", action: false, isToggle: true, checked: true },
        { label: "التحقق بخطوتين", value: "غير مفعل", action: false, isToggle: true, checked: false },
      ]
    }
  ];

  return (
    <div className="space-y-6 pb-6">
      <div className="mb-8">
        <h2 className="text-2xl font-black text-neutral-900 tracking-tight">الإعدادات</h2>
        <p className="text-sm text-neutral-500 mt-1 font-medium">إدارة تفضيلات حسابك وخيارات النظام</p>
      </div>

      {/* Sub-tab Selector inside Settings */}
      <div className="flex gap-1 bg-neutral-150/80 p-1 bg-neutral-100 rounded-2xl w-fit" dir="rtl">
        <button
          type="button"
          onClick={() => setActiveSubTab("general")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "general"
              ? "bg-white text-neutral-950 shadow-xs"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>إعدادات الحساب</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveSubTab("diagnostics")}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
            activeSubTab === "diagnostics"
              ? "bg-white text-neutral-950 shadow-xs"
              : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          <Bug className="w-3.5 h-3.5" />
          <span>فحص وتشخيص النظام</span>
        </button>
      </div>

      {activeSubTab === "general" ? (
        <>
          <div className="space-y-5">
        {sections.map((section, idx) => (
          <div key={idx} className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)]">
            <div className="flex items-center gap-2 p-4 bg-neutral-50/50 border-b border-neutral-100">
              {section.icon}
              <h3 className="font-bold text-neutral-900 text-sm">{section.title}</h3>
            </div>
             <div className="divide-y divide-neutral-50">
               {(section.items as any[]).map((item, itemIdx) => {
                 const isToggle = item.isToggle;
                 return (
                   <div 
                     key={itemIdx} 
                     onClick={item.onClick}
                     className={`p-4 flex items-center justify-between transition-colors ${item.action || item.onClick ? 'hover:bg-neutral-50/50 cursor-pointer group' : ''}`}
                   >
                     <div className="flex flex-col text-right">
                       <span className="text-sm font-bold text-neutral-800">{item.label}</span>
                     </div>
                     <div className="flex items-center gap-3">
                       {isToggle ? (
                         <div className="flex items-center gap-2" dir="ltr">
                           <span className="text-[10px] font-black text-neutral-400 bg-neutral-100 px-2 py-0.5 rounded-full">قريباً</span>
                           <div className={`w-8 h-4 rounded-full relative p-0.5 transition-colors cursor-not-allowed opacity-60 ${item.checked ? 'bg-neutral-300' : 'bg-neutral-200'}`}>
                             <div className={`w-3 h-3 bg-white rounded-full shadow-xs transition-transform ${item.checked ? 'translate-x-4' : 'translate-x-0'}`} />
                           </div>
                         </div>
                       ) : (
                         <>
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
                         </>
                       )}
                     </div>
                   </div>
                 );
               })}
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
                <div className="flex items-center justify-between">
                  {user?.email === activeProject.ownerEmail && !isEditingProjectName ? (
                    <button 
                      onClick={() => {
                        setNewProjectName(activeProject.name);
                        setIsEditingProjectName(true);
                      }} 
                      className="text-[10px] text-blue-600 font-bold hover:underline"
                    >
                      تعديل الاسم
                    </button>
                  ) : <div></div>}
                  <span className="text-[10px] font-black text-neutral-400">اسم مساحة العمل الحالية</span>
                </div>
                {isEditingProjectName ? (
                  <div className="flex items-center gap-2 mt-1">
                    <button 
                      onClick={handleRenameProject} 
                      disabled={isUpdatingProjectName}
                      className="bg-neutral-900 text-white text-[10px] px-3 py-1.5 rounded-lg font-bold disabled:opacity-50"
                    >
                      {isUpdatingProjectName ? "جاري الحفظ..." : "حفظ"}
                    </button>
                    <button 
                      onClick={() => setIsEditingProjectName(false)} 
                      className="bg-neutral-200 text-neutral-700 text-[10px] px-3 py-1.5 rounded-lg font-bold"
                    >
                      إلغاء
                    </button>
                    <input 
                      type="text" 
                      value={newProjectName} 
                      onChange={(e) => setNewProjectName(e.target.value)}
                      className="text-xs font-black text-neutral-800 bg-white border border-neutral-200 rounded-lg px-2 py-1.5 w-full text-right outline-none focus:border-blue-500"
                      dir="rtl"
                      autoFocus
                    />
                  </div>
                ) : (
                  <span className="text-xs font-black text-neutral-800">{activeProject.name}</span>
                )}
                <span className="text-[10px] text-neutral-400 font-bold mt-0.5">المالك: {activeProject.ownerEmail}</span>
              </div>

              <div className="space-y-2">
                <span className="text-xs font-black text-neutral-700 block">الأعضاء الحاليين بمساحة العمل ({activeProject.memberEmails?.length || 0})</span>
                <div className="divide-y divide-neutral-50 border border-neutral-100 rounded-xl overflow-hidden bg-white">
                  {(activeProject.memberEmails || []).map((email) => {
                    const isOwner = email.toLowerCase().trim() === activeProject.ownerEmail.toLowerCase().trim();
                    const isMe = email.toLowerCase().trim() === (user?.email || "").toLowerCase().trim();
                    const canDelete = !isOwner && (user?.email || "").toLowerCase().trim() === activeProject.ownerEmail.toLowerCase().trim();
                    const memberObj = (activeProject.members || []).find(m => m.email.toLowerCase().trim() === email.toLowerCase().trim());
                    const roleLabel = isOwner ? "مالك" : (memberObj?.role || "عارض");
                    return (
                      <div key={email} className="p-3 flex items-center justify-between hover:bg-neutral-50/50 transition-colors">
                        <div className="flex flex-col text-right">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-neutral-800">{email}</span>
                            <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-full ${
                              roleLabel === "مالك" 
                                ? "bg-neutral-950 text-white border border-neutral-800" 
                                : roleLabel === "محرر" 
                                  ? "bg-blue-50 text-blue-600 border border-blue-100" 
                                  : "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            }`}>
                              {roleLabel}
                            </span>
                            {isMe && (
                              <span className="text-[9px] bg-emerald-50 text-emerald-600 font-extrabold px-1.5 py-0.5 rounded-full border border-emerald-100">
                                أنت
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-neutral-400 font-bold mt-1">
                            {isOwner ? "مالك المشروع" : "عضو مشارك في مساحة العمل"}
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
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="email"
                      placeholder="بريد صديقك الإلكتروني..."
                      value={newMemberEmail}
                      onChange={(e) => setNewMemberEmail(e.target.value)}
                      disabled={isUpdatingMembers}
                      className="flex-1 px-3.5 py-2.5 bg-neutral-50/50 border border-neutral-200 focus:border-neutral-900 outline-none rounded-xl text-xs font-bold text-neutral-850 placeholder-neutral-400 text-left"
                    />
                    <select
                      value={invitedRole}
                      onChange={(e: any) => setInvitedRole(e.target.value)}
                      disabled={isUpdatingMembers}
                      className="px-3 py-2.5 bg-white border border-neutral-200 rounded-xl text-xs font-bold text-neutral-850 focus:outline-none focus:border-neutral-950"
                    >
                      <option value="عارض">عارض (رؤية فقط)</option>
                      <option value="محرر">محرر (تعديل وتسجيل)</option>
                    </select>
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
                        آخر نشاط: {device.lastActive ? formatDate(device.lastActive, activeProject) : "نشط الآن"}
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

      {/* Action Cards & Buttons */}
      <div className="space-y-5">
        {/* 4. Gateway Rates Customization Card */}
        {activeProject && (
          <div className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)] p-5 space-y-4" dir="rtl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-50">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Coins className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-neutral-900 text-sm">تفضيلات الرسوم وبوابات الدفع</h3>
                <p className="text-xs text-neutral-400 font-medium">تخصيص نسب الرسوم لكل بوابة تقسيط مستخدمة لحساب أرباح دقيقة</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
              {["تمارا", "تابي", "إمكان"].map((provider) => {
                const currentRate = activeProject.customRates?.[provider] !== undefined 
                  ? activeProject.customRates[provider] 
                  : 6.99;
                const currentFlatFee = activeProject.customFlatFees?.[provider] !== undefined
                  ? activeProject.customFlatFees[provider]
                  : 1.50;
                return (
                  <div key={provider} className="p-4 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-3">
                    <span className="text-xs font-black text-neutral-800 border-b border-neutral-100 pb-1.5">{provider}</span>
                    
                    {/* Rate (%) */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400 font-bold">نسبة العمولة (%)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-500">%</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="100"
                          value={currentRate}
                          onChange={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) return;
                            
                            // Save in Firestore
                            const projectRef = doc(db, "projects", activeProject.id);
                            const updatedRates = {
                              ...(activeProject.customRates || {}),
                              [provider]: val
                            };
                            try {
                              await updateDoc(projectRef, {
                                customRates: updatedRates
                              });
                            } catch (err) {
                              console.error("Failed to update custom rates:", err);
                            }
                          }}
                          className="w-full text-left font-black text-xs px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:border-neutral-950"
                        />
                      </div>
                    </div>

                    {/* Flat Fee (SAR) */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-neutral-400 font-bold">الرسم الثابت (ر.س)</span>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-neutral-500">ر.س</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          max="1000"
                          value={currentFlatFee}
                          onChange={async (e) => {
                            const val = parseFloat(e.target.value);
                            if (isNaN(val)) return;
                            
                            // Save in Firestore
                            const projectRef = doc(db, "projects", activeProject.id);
                            const updatedFlatFees = {
                              ...(activeProject.customFlatFees || {}),
                              [provider]: val
                            };
                            try {
                              await updateDoc(projectRef, {
                                customFlatFees: updatedFlatFees
                              });
                            } catch (err) {
                              console.error("Failed to update custom flat fees:", err);
                            }
                          }}
                          className="w-full text-left font-black text-xs px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:border-neutral-950"
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
              {/* Tax Rate Setting */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-2">
                <span className="text-xs font-black text-neutral-700">الضريبة (VAT) على الرسوم</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-500">%</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={activeProject.taxRate !== undefined ? activeProject.taxRate : 15}
                    onChange={async (e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val)) return;
                      
                      // Save in Firestore
                      const projectRef = doc(db, "projects", activeProject.id);
                      try {
                        await updateDoc(projectRef, {
                          taxRate: val
                        });
                      } catch (err) {
                        console.error("Failed to update tax rate:", err);
                      }
                    }}
                    className="w-full text-left font-black text-xs px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:border-neutral-950"
                  />
                </div>
              </div>

              {/* Profit Margin Setting */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-2">
                <span className="text-xs font-black text-neutral-700">نسبة هامش الربح الافتراضية (%)</span>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-neutral-500">%</span>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={activeProject.profitMarginPercent !== undefined ? activeProject.profitMarginPercent : 30}
                    onChange={async (e) => {
                      const val = parseFloat(e.target.value);
                      if (isNaN(val)) return;
                      
                      // Save in Firestore
                      const projectRef = doc(db, "projects", activeProject.id);
                      try {
                        await updateDoc(projectRef, {
                          profitMarginPercent: val
                        });
                      } catch (err) {
                        console.error("Failed to update profit margin percent:", err);
                      }
                    }}
                    className="w-full text-left font-black text-xs px-3 py-2 bg-white border border-neutral-200 rounded-lg outline-none focus:border-neutral-950"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 5. Preferences (Number System and Currency) Card */}
        {activeProject && (
          <div className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)] p-5 space-y-4" dir="rtl">
            <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-50">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <Sliders className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h3 className="font-bold text-neutral-900 text-sm">تفضيلات عرض الواجهة والتنسيق</h3>
                <p className="text-xs text-neutral-400 font-medium">تحديد نظام الأرقام والعملة الافتراضية لعرض البيانات عبر لوحات التحكم</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-right">
              {/* Number system preference */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-2">
                <span className="text-xs font-black text-neutral-700">نظام عرض الأرقام</span>
                <select
                  disabled
                  value="en"
                  className="w-full bg-neutral-100 border border-neutral-200 rounded-lg p-2.5 text-xs font-bold text-neutral-400 cursor-not-allowed"
                >
                  <option value="en">الأرقام الإنجليزية الغربية (12345) - افتراضي دائم</option>
                </select>
                <span className="text-[10px] text-neutral-400 font-bold mt-1">
                  معاينة التنسيق الحالي: <span className="text-neutral-700 font-black">{formatMoney(1500.5, activeProject)}</span>
                </span>
              </div>

              {/* Calendar system preference */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-2">
                <span className="text-xs font-black text-neutral-700">نظام التقويم</span>
                <select
                  value={activeProject.calendarSystem || "gregorian"}
                  onChange={async (e) => {
                    const projectRef = doc(db, "projects", activeProject.id);
                    try {
                      await updateDoc(projectRef, {
                        calendarSystem: e.target.value
                      });
                    } catch (err) {
                      console.error("Failed to update calendar system:", err);
                    }
                  }}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs font-bold text-neutral-850 focus:outline-none focus:border-neutral-950"
                >
                  <option value="gregorian">التقويم الميلادي (Gregorian)</option>
                  <option value="hijri">التقويم الهجري (Hijri)</option>
                </select>
                <span className="text-[10px] text-neutral-400 font-bold mt-1">
                  معاينة التنسيق: <span className="text-neutral-700 font-black">{formatDate(new Date(), activeProject)}</span>
                </span>
              </div>

              {/* Currency symbol preference */}
              <div className="p-3.5 bg-neutral-50 rounded-xl border border-neutral-100 flex flex-col gap-2">
                <span className="text-xs font-black text-neutral-700">العملة الافتراضية</span>
                <select
                  value={activeProject.currencySymbol || "ر.س"}
                  onChange={async (e) => {
                    const projectRef = doc(db, "projects", activeProject.id);
                    try {
                      await updateDoc(projectRef, {
                        currencySymbol: e.target.value
                      });
                    } catch (err) {
                      console.error("Failed to update currency symbol:", err);
                    }
                  }}
                  className="w-full bg-white border border-neutral-200 rounded-lg p-2.5 text-xs font-bold text-neutral-850 focus:outline-none focus:border-neutral-950"
                >
                  <option value="ر.س">ريال سعودي (ر.س)</option>
                  <option value="$">دولار أمريكي ($)</option>
                  <option value="د.ك">دينار كويتي (د.ك)</option>
                  <option value="د.إ">درهم إماراتي (د.إ)</option>
                  <option value="د.ب">دينار بحريني (د.ب)</option>
                  <option value="ج.م">جنيه مصري (ج.م)</option>
                </select>
              </div>
            </div>
          </div>
        )}

        {/* 6. Data Portability & Export Card */}
        <div className="bg-white rounded-[1.5rem] border border-neutral-100 overflow-hidden shadow-[0px_0px_10px_rgba(0,0,0,0.02)] p-5 space-y-4" dir="rtl">
          <div className="flex items-center gap-2.5 pb-3 border-b border-neutral-50">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Download className="w-5 h-5" />
            </div>
            <div className="text-right">
              <h3 className="font-bold text-neutral-900 text-sm">مركز إدارة وتصدير البيانات (النسخ الاحتياطي)</h3>
              <p className="text-xs text-neutral-400 font-medium">قم بتحميل نسخة كاملة من سجلات عملياتك للحفاظ عليها أو استخدامها في تطبيقات أخرى</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-right">
            <button
              type="button"
              onClick={handleExportCSV}
              disabled={!operations || operations.length === 0}
              className="flex items-center justify-center gap-2 bg-neutral-50 border border-neutral-200/80 hover:bg-neutral-100/70 transition-colors p-4 rounded-2xl text-xs font-black text-neutral-800 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              <span>تصدير السجل بصيغة جدول Excel (CSV)</span>
            </button>

            <button
              type="button"
              onClick={handleExportJSON}
              disabled={!operations || operations.length === 0}
              className="flex items-center justify-center gap-2 bg-neutral-50 border border-neutral-200/80 hover:bg-neutral-100/70 transition-colors p-4 rounded-2xl text-xs font-black text-neutral-850 disabled:opacity-50 cursor-pointer"
            >
              <Download className="w-4 h-4 text-neutral-500" />
              <span>تصدير نسخة احتياطية كاملة (JSON)</span>
            </button>
          </div>
          {!operations || operations.length === 0 ? (
            <p className="text-[10px] text-amber-600 font-bold bg-amber-50 p-2.5 rounded-xl border border-amber-100/50 text-center leading-relaxed">
              تنبيه: لا تتوفر أي عمليات مسجلة حالياً للتصدير. قم بإضافة عمليات أولاً لتتمكن من تصديرها.
            </p>
          ) : (
            <p className="text-[10px] text-neutral-400 font-bold text-center leading-relaxed">
              متاح حالياً تصدير عدد ({operations.length}) عملية مسجلة بشكل آمن وفوري.
            </p>
          )}
        </div>

        {/* Regular Action Buttons */}
        <div className="pt-4 text-right" dir="rtl">
          <button
            onClick={onLogoutReq}
            className="w-full bg-neutral-150 text-neutral-800 bg-neutral-100 hover:bg-neutral-200 transition-colors rounded-2xl p-4 flex items-center justify-center gap-2 font-black text-sm cursor-pointer shadow-xs border border-neutral-200/50"
          >
            <LogOut className="w-4.5 h-4.5" />
            <span>تسجيل الخروج من الحساب الحالي</span>
          </button>
        </div>

        {/* Danger Zone Block */}
        <div className="bg-red-50/40 border border-red-200/60 rounded-[1.5rem] p-6 mt-6 space-y-4 text-right" dir="rtl">
          <div>
            <h4 className="text-sm font-black text-red-600 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-600 animate-pulse"></span>
              منطقة الخطر والحذف النهائي
            </h4>
            <p className="text-xs text-neutral-500 font-medium mt-1 leading-relaxed">
              الإجراءات أدناه حساسة للغاية ولها تأثيرات دائمة لا يمكن التراجع عنها. يرجى توخي أقصى درجات الحذر والمسؤولية.
            </p>
          </div>
          <button
            onClick={() => {
              setDeleteErrorMsg("");
              setDeleteStatus("idle");
              setDeleteConfirmText("");
              setShowDeleteConfirm(true);
            }}
            className="w-full bg-red-600 hover:bg-red-700 text-white transition-colors rounded-2xl p-4 flex items-center justify-center gap-2 font-black text-sm cursor-pointer shadow-xs"
          >
            <Trash2 className="w-4.5 h-4.5" />
            <span>حذف حساب المستخدم وتصفير السجلات نهائياً</span>
          </button>
        </div>
      </div>

        </>
      ) : (
        <DebugPage activeProject={activeProject} />
      )}

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
              <p className="text-xs text-neutral-500 font-medium leading-relaxed mb-4">
                هل أنت متأكد من رغبتك في حذف حسابك بالكامل؟ 
                <br />
                <span className="text-red-500 font-bold block mt-2 text-xs">
                  تنبيه: سيتم مسح بياناتك السحابية والخروج نهائياً. لا يمكن التراجع عن هذا الإجراء، وسيتعين عليك التسجيل مجدداً لتتمكن من استخدام النظام وسيجري حذف كافة بياناتك.
                </span>
              </p>

              <div className="mt-4 mb-5 text-right" dir="rtl">
                <label className="block text-xs font-black text-neutral-600 mb-1.5 text-center">
                  لتأكيد الحذف النهائي، يرجى كتابة كلمة <span className="text-red-600 font-black">"حذف"</span> أدناه:
                </label>
                <input
                  type="text"
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="اكتب كلمة حذف لتأكيد الإجراء..."
                  className="w-full px-3.5 py-2.5 bg-red-50/20 border border-red-200 focus:border-red-500 outline-none rounded-xl text-xs font-bold text-neutral-850 placeholder-neutral-400 text-center"
                />
              </div>

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
                    if (deleteConfirmText !== "حذف") return;
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
                  disabled={deleteStatus === "deleting" || deleteConfirmText !== "حذف"}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer disabled:bg-neutral-200 disabled:text-neutral-400 disabled:cursor-not-allowed"
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
