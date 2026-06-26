import React, { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { db } from "../firebase";
import { doc, getDoc, updateDoc, setDoc, collection, query, where, getDocs, onSnapshot } from "firebase/firestore";
import { ProjectWorkspace, ProjectMember } from "../types";
import { Search, Plus, MoreVertical, ShieldAlert, ExternalLink, Users, Database, HelpCircle, UserPlus, Trash2, Shield, Eye, Edit, AlertCircle, Check } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProjectSettingsProps {
  activeProject: ProjectWorkspace | null;
  isLoadingProject: boolean;
  onUpdateProject?: (project: ProjectWorkspace) => void;
}

export function ProjectSettings({ activeProject, isLoadingProject, onUpdateProject }: ProjectSettingsProps) {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState<"members" | "privacy" | "services">("members");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingMember, setEditingMember] = useState<ProjectMember | null>(null);
  const [editName, setEditName] = useState("");
  const [editRole, setEditRole] = useState<"مالك" | "محرر" | "عارض">("محرر");
  
  const [memberToDelete, setMemberToDelete] = useState<ProjectMember | null>(null);
  const [showDeleteMemberConfirm, setShowDeleteMemberConfirm] = useState(false);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  // Prevent background scrolling when add, edit or delete member modal is open
  useEffect(() => {
    if (showAddModal || showEditModal || showDeleteMemberConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showAddModal, showEditModal, showDeleteMemberConfirm]);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState<"مالك" | "محرر" | "عارض">("محرر");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [localMembers, setLocalMembers] = useState<ProjectMember[]>([]);

  useEffect(() => {
    if (activeProject) {
      setLocalMembers(activeProject.members || []);
    }
  }, [activeProject]);

  if (isLoadingProject) {
    return (
      <div className="bg-white rounded-3xl p-12 shadow-sm border border-neutral-100 flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-neutral-100 border-t-neutral-900 animate-spin rounded-full"></div>
        <p className="text-xs font-bold text-neutral-400">جاري تحميل إعدادات الأمان والتراخيص...</p>
      </div>
    );
  }

  // Filter members based on search bar
  const filteredMembers = localMembers.filter(
    (m) =>
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !user) return;
    setErrorMsg("");
    setSuccessMsg("");

    if (!newEmail.includes("@")) {
      setErrorMsg("يرجى كتابة بريد الكتروني صحيح");
      return;
    }

    // Check if member already exists
    if (localMembers.some((m) => m.email.toLowerCase() === newEmail.trim().toLowerCase())) {
      setErrorMsg("هذا العضو مضاف بالفعل في هذا المشروع");
      return;
    }

    const updatedMembers: ProjectMember[] = [
      ...localMembers,
      {
        email: newEmail.trim().toLowerCase(),
        name: newName.trim() || newEmail.split("@")[0],
        role: newRole,
        status: "نشط",
      },
    ];

    // Local / Offline mode fallback check
    if (activeProject.id.startsWith("local_") || !user || user.id === "offline_guest_user_id" || user.id.startsWith("local_")) {
      try {
        const updatedProject: ProjectWorkspace = {
          ...activeProject,
          members: updatedMembers,
          memberEmails: [...(activeProject.memberEmails || []), newEmail.trim().toLowerCase()]
        };
        const userEmailNormalized = user?.email?.toLowerCase().trim() || "";
        localStorage.setItem(`local_project_${userEmailNormalized}`, JSON.stringify(updatedProject));
        if (onUpdateProject) {
          onUpdateProject(updatedProject);
        }
        setSuccessMsg(`تمت إضافة ${newEmail} بنجاح كعضو (محلي)!`);
        setNewEmail("");
        setNewName("");
        setNewRole("محرر");
        setShowAddModal(false);
      } catch (e) {
        console.error(e);
        setErrorMsg("تعذر تحديث قاعدة البيانات المحلية.");
      }
      return;
    }

    try {
      const projectRef = doc(db, "projects", activeProject.id);
      await updateDoc(projectRef, {
        members: updatedMembers,
        memberEmails: updatedMembers.map((m) => m.email.toLowerCase().trim()),
      });

      const updatedProject: ProjectWorkspace = {
        ...activeProject,
        members: updatedMembers,
        memberEmails: updatedMembers.map((m) => m.email.toLowerCase().trim()),
      };
      if (onUpdateProject) {
        onUpdateProject(updatedProject);
      }

      setSuccessMsg(`تمت إضافة ${newEmail} بنجاح كعضو!`);
      setNewEmail("");
      setNewName("");
      setNewRole("محرر");
      setShowAddModal(false);
    } catch (e: any) {
      console.error("Firestore update failed, trying local fallback:", e);
      // Fallback local update
      try {
        const updatedProject: ProjectWorkspace = {
          ...activeProject,
          members: updatedMembers,
          memberEmails: [...(activeProject.memberEmails || []), newEmail.trim().toLowerCase()]
        };
        const userEmailNormalized = user?.email?.toLowerCase().trim() || "";
        localStorage.setItem(`local_project_${userEmailNormalized}`, JSON.stringify(updatedProject));
        if (onUpdateProject) {
          onUpdateProject(updatedProject);
        }
        setSuccessMsg(`تمت إضافة ${newEmail} بنجاح كعضو (حفظ احتياطي محلي)!`);
        setNewEmail("");
        setNewName("");
        setNewRole("محرر");
        setShowAddModal(false);
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setErrorMsg("تعذر تحديث قاعدة البيانات الفرعية. ربما لا تملك صلاحية تعديل.");
      }
    }
  };

  const handleDeleteMember = (member: ProjectMember) => {
    if (!activeProject || !user) return;
    
    // Safety check: Cannot delete the owner/creator
    if (member.email.toLowerCase() === activeProject.ownerEmail.toLowerCase()) {
      setErrorMsg("لا يمكن حذف المالك الأساسي للمشروع!");
      return;
    }

    setMemberToDelete(member);
    setShowDeleteMemberConfirm(true);
    setSuccessMsg("");
    setErrorMsg("");
  };

  const executeDeleteMember = async () => {
    if (!activeProject || !user || !memberToDelete) return;
    setErrorMsg("");
    setSuccessMsg("");
    setIsDeletingMember(true);

    const emailToDelete = memberToDelete.email;
    const updatedMembers = localMembers.filter((m) => m.email.toLowerCase() !== emailToDelete.toLowerCase());

    // Local / Offline mode fallback check
    if (activeProject.id.startsWith("local_") || user.id === "offline_guest_user_id" || user.id.startsWith("local_")) {
      try {
        const updatedProject: ProjectWorkspace = {
          ...activeProject,
          members: updatedMembers,
          memberEmails: updatedMembers.map(m => m.email)
        };
        const userEmailNormalized = user.email?.toLowerCase().trim() || "";
        localStorage.setItem(`local_project_${userEmailNormalized}`, JSON.stringify(updatedProject));
        if (onUpdateProject) {
          onUpdateProject(updatedProject);
        }
        setSuccessMsg(`تمت إزالة العضو ${memberToDelete.name} بنجاح (محلي).`);
        setMemberToDelete(null);
        setShowDeleteMemberConfirm(false);
      } catch (e) {
        console.error(e);
        setErrorMsg("حدث خطأ أثناء محاولة إزالة بريد العضو محلياً.");
      } finally {
        setIsDeletingMember(false);
      }
      return;
    }

    try {
      const projectRef = doc(db, "projects", activeProject.id);
      await updateDoc(projectRef, {
        members: updatedMembers,
        memberEmails: updatedMembers.map((m) => m.email.toLowerCase().trim()),
      });
      const updatedProject: ProjectWorkspace = {
        ...activeProject,
        members: updatedMembers,
        memberEmails: updatedMembers.map((m) => m.email.toLowerCase().trim()),
      };
      if (onUpdateProject) {
        onUpdateProject(updatedProject);
      }
      setSuccessMsg(`تمت إزالة العضو ${memberToDelete.name} بنجاح من المشروع.`);
      setMemberToDelete(null);
      setShowDeleteMemberConfirm(false);
    } catch (e) {
      console.error("Firestore delete failed, trying local fallback:", e);
      try {
        const updatedProject: ProjectWorkspace = {
          ...activeProject,
          members: updatedMembers,
          memberEmails: updatedMembers.map(m => m.email)
        };
        const userEmailNormalized = user.email?.toLowerCase().trim() || "";
        localStorage.setItem(`local_project_${userEmailNormalized}`, JSON.stringify(updatedProject));
        if (onUpdateProject) {
          onUpdateProject(updatedProject);
        }
        setSuccessMsg(`تمت إزالة العضو ${memberToDelete.name} بنجاح (حفظ احتياطي محلي).`);
        setMemberToDelete(null);
        setShowDeleteMemberConfirm(false);
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setErrorMsg("حدث خطأ أثناء محاولة إزالة بريد العضو.");
      }
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handleStartEdit = (member: ProjectMember) => {
    setEditingMember(member);
    setEditName(member.name);
    setEditRole(member.role);
    setSuccessMsg("");
    setErrorMsg("");
    setShowEditModal(true);
  };

  const handleEditMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject || !user || !editingMember) return;
    setErrorMsg("");
    setSuccessMsg("");

    const updatedMembers = localMembers.map((m) => {
      if (m.email.toLowerCase() === editingMember.email.toLowerCase()) {
        return {
          ...m,
          name: editName.trim() || m.name,
          role: editRole,
        };
      }
      return m;
    });

    // Local / Offline mode fallback check
    if (activeProject.id.startsWith("local_") || !user || user.id === "offline_guest_user_id" || user.id.startsWith("local_")) {
      try {
        const updatedProject: ProjectWorkspace = {
          ...activeProject,
          members: updatedMembers,
        };
        const userEmailNormalized = user?.email?.toLowerCase().trim() || "";
        localStorage.setItem(`local_project_${userEmailNormalized}`, JSON.stringify(updatedProject));
        if (onUpdateProject) {
          onUpdateProject(updatedProject);
        }
        setSuccessMsg("تم تعديل بيانات وصلاحيات العضو بنجاح (محلي)!");
        setNewEmail("");
        setNewName("");
        setEditingMember(null);
        setShowEditModal(false);
      } catch (e) {
        console.error(e);
        setErrorMsg("تعذر تحديث قاعدة البيانات المحلية.");
      }
      return;
    }

    try {
      const projectRef = doc(db, "projects", activeProject.id);
      await updateDoc(projectRef, {
        members: updatedMembers,
      });

      const updatedProject: ProjectWorkspace = {
        ...activeProject,
        members: updatedMembers,
      };
      if (onUpdateProject) {
        onUpdateProject(updatedProject);
      }

      setSuccessMsg("تم تعديل بيانات وصلاحيات العضو بنجاح!");
      setNewEmail("");
      setNewName("");
      setEditingMember(null);
      setShowEditModal(false);
    } catch (e: any) {
      console.error("Firestore update failed, trying local fallback:", e);
      try {
        const updatedProject: ProjectWorkspace = {
          ...activeProject,
          members: updatedMembers,
        };
        const userEmailNormalized = user?.email?.toLowerCase().trim() || "";
        localStorage.setItem(`local_project_${userEmailNormalized}`, JSON.stringify(updatedProject));
        if (onUpdateProject) {
          onUpdateProject(updatedProject);
        }
        setSuccessMsg("تم تعديل بيانات وصلاحيات العضو بنجاح (حفظ احتياطي محلي)!");
        setNewEmail("");
        setNewName("");
        setEditingMember(null);
        setShowEditModal(false);
      } catch (fallbackErr) {
        console.error(fallbackErr);
        setErrorMsg("تعذر تحديث بيانات العضوية. ربما لا تملك صلاحية تعديل.");
      }
    }
  };

  return (
    <div className="w-full font-sans transition-all">
      {/* Upper Main Heading Section */}
      <div className="mb-6">
        <h1 className="text-3xl font-black text-neutral-900 tracking-tight leading-none mb-1">
          إعدادات المشروع
        </h1>
        <p className="text-xs text-neutral-500 font-medium">إعدادات أمان ومشاركة البيانات للمشروع الحالي</p>
      </div>

      {/* Replicated Navigation Subtabs (Matching original Firebase UI look-and-feel completely) */}
      <div className="border-b border-neutral-200/80 mb-6 flex items-center gap-6 overflow-x-auto scrollbar-none">
        <button
          onClick={() => setSubTab("members")}
          className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            subTab === "members" ? "text-blue-600 font-extrabold" : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          المستخدمون والصلاحيات
          {subTab === "members" && (
            <motion.div layoutId="activeSubtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setSubTab("privacy")}
          className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            subTab === "privacy" ? "text-blue-600 font-extrabold" : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          خصوصية البيانات
          {subTab === "privacy" && (
            <motion.div layoutId="activeSubtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
        <button
          onClick={() => setSubTab("services")}
          className={`pb-3 text-sm font-bold transition-all relative whitespace-nowrap cursor-pointer ${
            subTab === "services" ? "text-blue-600 font-extrabold" : "text-neutral-500 hover:text-neutral-800"
          }`}
        >
          حسابات الخدمة
          {subTab === "services" && (
            <motion.div layoutId="activeSubtab" className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
          )}
        </button>
      </div>

      {/* Tab Context Switcher */}
      {subTab === "members" && (
        <div className="bg-white rounded-[1.5rem] border border-neutral-100/90 shadow-[0_4px_30px_rgba(0,0,0,0.02)] p-6">
          {successMsg && (
            <div className="mb-4 p-3.5 bg-emerald-50 text-emerald-700 text-xs font-bold rounded-xl border border-emerald-100/80 flex items-center gap-2 text-right justify-start" dir="rtl">
              <Check className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}
          {errorMsg && (
            <div className="mb-4 p-3.5 bg-red-50 text-red-700 text-xs font-bold rounded-xl border border-red-100/80 flex items-center gap-2 text-right justify-start" dir="rtl">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-600" />
              <span>{errorMsg}</span>
            </div>
          )}
          {/* Filter & Add Actions Row */}
          <div className="flex flex-col sm:flex-row gap-4 justify-between items-center mb-6">
            <div className="relative w-full sm:max-w-md">
              <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-400">
                <Search className="w-4 h-4" />
              </span>
              <input
                type="text"
                placeholder="البحث عن الأعضاء..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-neutral-50 border border-neutral-200/90 focus:border-neutral-900 focus:bg-white outline-none rounded-xl py-2.5 pr-11 pl-4 text-xs font-medium transition-all text-right"
              />
            </div>

            <button
              onClick={() => setShowAddModal(true)}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs px-5 py-2.5 rounded-xl flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-sm"
            >
              <UserPlus className="w-3.5 h-3.5" />
              إضافة عضو
            </button>
          </div>

          {/* Members Table */}
          <div className="overflow-x-auto rounded-xl border border-neutral-100">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-neutral-50/70 border-b border-neutral-100 text-[11px] font-black tracking-wider text-neutral-400 uppercase">
                  <th className="py-3 px-4">العضو</th>
                  <th className="py-3 px-4">الصلاحية</th>
                  <th className="py-3 px-4">الحالة</th>
                  <th className="py-3 px-4 text-left">الإجراءات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100/80">
                {filteredMembers.map((member, idx) => {
                  const isOwner = member.role === "مالك";
                  const isCurrentUser = member.email.toLowerCase() === user?.email?.toLowerCase();
                  
                  return (
                    <tr key={idx} className="hover:bg-neutral-50/50 transition-colors text-xs font-semibold text-neutral-800">
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-3">
                          {/* Profile Avatar circle */}
                          <div className={`w-9 h-9 rounded-full flex items-center justify-center font-black text-white shrink-0 shadow-sm ${
                            isOwner ? "bg-indigo-600" : isCurrentUser ? "bg-emerald-600" : "bg-neutral-700"
                          }`}>
                            {member.name ? member.name.charAt(0).toUpperCase() : member.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-neutral-900">{member.name}</span>
                              {isCurrentUser && (
                                <span className="text-[9px] bg-emerald-50 text-emerald-600 font-bold px-1.5 py-0.5 rounded-md border border-emerald-100">أنت</span>
                              )}
                            </div>
                            <span className="text-[10.5px] text-neutral-400 block mt-0.5">{member.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-bold text-neutral-700">
                        <div className="flex items-center gap-1.5 justify-start">
                          {isOwner ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600 text-[10px] bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-lg font-black">
                              <Shield className="w-3 h-3" />
                              المالك
                            </span>
                          ) : member.role === "محرر" ? (
                            <span className="inline-flex items-center gap-1 text-emerald-600 text-[10px] bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-lg font-black">
                              <Edit className="w-3 h-3" />
                              محرر
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-neutral-500 text-[10px] bg-neutral-100 border border-neutral-200 px-2 py-0.5 rounded-lg font-black">
                              <Eye className="w-3 h-3" />
                              عارض
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-4 px-4">
                        <span className="inline-block h-2 w-2 rounded-full bg-emerald-500 animate-pulse ml-1.5"></span>
                        <span className="text-neutral-500 text-[11px] font-bold">نشط</span>
                      </td>
                      <td className="py-4 px-4 text-left">
                        <div className="flex items-center gap-1.5 justify-end">
                          {!isOwner && (
                            <button
                              onClick={() => handleStartEdit(member)}
                              className="p-1.5 hover:bg-blue-50 text-neutral-400 hover:text-blue-600 rounded-lg transition-colors cursor-pointer"
                              title="تعديل العضو"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {!isOwner && (
                            <button
                              onClick={() => handleDeleteMember(member)}
                              className="p-1.5 hover:bg-red-50 text-neutral-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                              title="حذف العضو"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {filteredMembers.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-neutral-400 font-bold">
                      لا يوجد أعضاء في هذا المشروع يطابقون بحثك.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Subtitle count block matching screenshot footer */}
          <div className="mt-5 pt-4 border-t border-neutral-100 flex flex-col sm:flex-row justify-between items-center gap-2">
            <span className="text-[11px] text-neutral-400 font-bold flex items-center gap-1">
              <Database className="w-3.5 h-3.5" />
              <span>هناك 15 حساب خدمة يمتلكون أيضاً صلاحية الوصول لقاعدة البيانات هذه</span>
            </span>
            <a
              href="#"
              onClick={(e) => { e.preventDefault(); alert("الأذونات الموسعة مدمجة تلقائياً لتسهيل تجربة العميل."); }}
              className="text-[11px] text-blue-600 hover:text-blue-700 font-black flex items-center gap-1 transition-all"
            >
              إعدادات الأذونات المتقدمة
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>
      )}

      {subTab === "privacy" && (
        <div className="bg-white rounded-[1.5rem] border border-neutral-100 p-6 space-y-4">
          <div className="flex gap-3">
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl shrink-0 h-10 w-10 flex items-center justify-center">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black text-neutral-900">حماية الخصوصية والأمن المشترك</h3>
              <p className="text-[11px] text-neutral-500 mt-1 leading-relaxed">
                يتم إدارة البيانات والتقارير المالية بشكل كامل ومستقل عبر نظام تشفير Firestore. كل مشروع يتم تقسيمه بناءً على معرّف المشروع الأصلي، لضمان أمان عالي لجميع العمليات.
              </p>
            </div>
          </div>
        </div>
      )}

      {subTab === "services" && (
        <div className="bg-white rounded-[1.5rem] border border-neutral-100 p-6 text-center space-y-4">
          <Database className="w-8 h-8 text-neutral-400 mx-auto animate-bounce" />
          <h3 className="text-xs font-black text-neutral-900">حسابات الخدمة التلقائية (Automation Accounts)</h3>
          <p className="text-[11px] text-neutral-500 max-w-md mx-auto leading-relaxed">
            يتم تهيئة 15 حساب خدمة تلقائي بالخلفية لربط المزامنة الفورية وتحويل البيانات بين السيرفرات السحابية. لا داعي لإعدادها يدوياً.
          </p>
        </div>
      )}

      {/* Add Member Popup Modal (Fully Styled matching design architecture) */}
      <AnimatePresence>
        {showAddModal && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-6 border border-neutral-100 shadow-2xl overflow-hidden"
            >
              <div className="mb-4">
                <h3 className="text-base font-black text-neutral-950">إضافة عضو جديد للمشروع</h3>
                <p className="text-[11px] text-neutral-500 mt-1">امنح زملائك في العمل صلاحية الوصول الفوري لقاعدة عمليات البيع والتقسيط.</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs font-bold rounded-xl mb-4 leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleAddMember} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-black text-neutral-500 mb-1.5 mr-1">البريد الإلكتروني للزميل</label>
                  <input
                    type="email"
                    required
                    placeholder="example@gmail.com"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200/90 focus:border-neutral-900 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-500 mb-1.5 mr-1">الاسم بالكامل (أو الكنية)</label>
                  <input
                    type="text"
                    placeholder="مثل: عبد الله البديّري"
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200/90 focus:border-neutral-900 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-500 mb-1.5 mr-1">صلاحية العضو (Role)</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200/90 focus:border-neutral-950 focus:bg-white outline-none rounded-xl py-3 px-3 text-xs font-bold cursor-pointer transition-all"
                  >
                    <option value="محرر" className="font-bold">محرر (قراءة وتعديل وإضافة عمليات)</option>
                    <option value="عارض" className="font-bold">عارض (قراءة لوحة القيادة فقط بدون تعديل)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-xs py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    إضافة للعضوية
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); setErrorMsg(""); }}
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-xs py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء التراجع
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Member Popup Modal */}
      <AnimatePresence>
        {showEditModal && editingMember && (
          <div className="fixed inset-0 bg-neutral-950/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-6 border border-neutral-100 shadow-2xl overflow-hidden"
            >
              <div className="mb-4">
                <h3 className="text-base font-black text-neutral-950">تعديل بيانات وصلاحيات العضو</h3>
                <p className="text-[11px] text-neutral-500 mt-1">تحديث صلاحية والاسم التعريفي لـ {editingMember.email}</p>
              </div>

              {errorMsg && (
                <div className="p-3 bg-red-50 text-red-600 border border-red-100 text-xs font-bold rounded-xl mb-4 leading-relaxed">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleEditMember} className="space-y-4 text-right" dir="rtl">
                <div>
                  <label className="block text-[11px] font-black text-neutral-500 mb-1.5 mr-1">البريد الإلكتروني للزميل</label>
                  <input
                    type="email"
                    disabled
                    value={editingMember.email}
                    className="w-full bg-neutral-100 border border-neutral-200/90 text-neutral-400 outline-none rounded-xl py-3 px-4 text-xs font-semibold cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-500 mb-1.5 mr-1">الاسم بالكامل (أو الكنية)</label>
                  <input
                    type="text"
                    required
                    placeholder="الاسم كامل"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-neutral-50 border border-neutral-200/90 focus:border-neutral-950 focus:bg-white outline-none rounded-xl py-3 px-4 text-xs font-medium transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-black text-neutral-500 mb-1.5 mr-1">صلاحية العضو (Role)</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value as any)}
                    className="w-full bg-neutral-50 border border-neutral-200/90 focus:border-neutral-950 focus:bg-white outline-none rounded-xl py-3 px-3 text-xs font-bold cursor-pointer transition-all"
                  >
                    <option value="محرر" className="font-bold">محرر (قراءة وتعديل وإضافة عمليات)</option>
                    <option value="عارض" className="font-bold">عارض (قراءة لوحة القيادة فقط بدون تعديل)</option>
                  </select>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex-1 bg-neutral-950 hover:bg-neutral-800 text-white font-extrabold text-xs py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    حفظ التغييرات
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); setEditingMember(null); setErrorMsg(""); }}
                    className="flex-1 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 font-extrabold text-xs py-3.5 rounded-xl transition-colors cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Member Confirmation Modal */}
      <AnimatePresence>
        {showDeleteMemberConfirm && memberToDelete && (
          <div className="fixed inset-0 bg-neutral-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-[2rem] w-full max-w-md p-6 border border-neutral-100 shadow-2xl overflow-hidden text-center"
            >
              <div className="w-14 h-14 bg-red-50 text-red-600 rounded-2xl flex items-center justify-center mb-4 mx-auto animate-pulse">
                <Trash2 className="w-7 h-7" />
              </div>

              <h3 className="text-base font-black text-neutral-900 mb-2">تأكيد حذف العضو من المشروع</h3>
              <p className="text-xs text-neutral-500 font-medium leading-relaxed mb-6" dir="rtl">
                هل أنت متأكد من رغبتك في إزالة العضو <span className="font-extrabold text-neutral-900">“{memberToDelete.name || memberToDelete.email}”</span> من صلاحيات هذا المشروع؟ 
                <br />
                <span className="text-red-500 font-bold block mt-2 text-xs">
                  لن يتمكن من الوصول أو تعديل التقارير والعمليات المالية فور حذفه.
                </span>
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => { setShowDeleteMemberConfirm(false); setMemberToDelete(null); }}
                  disabled={isDeletingMember}
                  className="flex-1 bg-neutral-100 hover:bg-neutral-200 disabled:opacity-50 transition-colors text-neutral-800 font-extrabold text-xs py-3.5 rounded-xl cursor-pointer"
                >
                  إلغاء وتراجع
                </button>
                <button
                  type="button"
                  onClick={executeDeleteMember}
                  disabled={isDeletingMember}
                  className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 transition-colors text-white font-extrabold text-xs py-3.5 rounded-xl cursor-pointer"
                >
                  {isDeletingMember ? "جاري الحذف..." : "تأكيد واستبعاد العضو"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
