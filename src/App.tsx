import React, { useState, useEffect } from "react";
import { Operation, ProjectWorkspace } from "./types";
import OperationForm from "./components/OperationForm";
import FinanceDashboard from "./components/FinanceDashboard";
import { PlusCircle, BarChart3, Bell, Landmark, Settings as SettingsIcon, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthScreens } from "./components/AuthScreens";
import { Settings } from "./components/Settings";
import { db } from "./firebase";
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, serverTimestamp, deleteDoc } from "firebase/firestore";

function MainApp() {
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"create" | "dashboard" | "settings">("dashboard");
  const [operations, setOperations] = useState<Operation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);

  // Prevent background scrolling when logout modal is open
  useEffect(() => {
    if (showLogoutConfirm) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [showLogoutConfirm]);
  
  // Collaborative workspace settings persistence
  const [activeProject, setActiveProject] = useState<ProjectWorkspace | null>(null);
  const [isLoadingProject, setIsLoadingProject] = useState(true);

  // 1. Resolve Active Shared Workspace Project dynamically
  useEffect(() => {
    if (!user) {
      setActiveProject(null);
      setIsLoadingProject(false);
      return;
    }

    const userEmailNormalized = user.email?.toLowerCase().trim() || "";
    setIsLoadingProject(true);

    const loadLocalProject = () => {
      const localProjectKey = `local_project_${userEmailNormalized}`;
      const savedProject = localStorage.getItem(localProjectKey);
      if (savedProject) {
        setActiveProject(JSON.parse(savedProject));
      } else {
        const dummyProject = {
          id: `local_proj_${user.id}`,
          name: `مشروع ${user.name || "الرئيسي"} (محلي)`,
          ownerEmail: userEmailNormalized,
          memberEmails: [userEmailNormalized],
          members: [
            {
              email: userEmailNormalized,
              name: user.name || "العضو",
              role: "مالك",
              status: "نشط"
            }
          ]
        };
        localStorage.setItem(localProjectKey, JSON.stringify(dummyProject));
        setActiveProject(dummyProject as any);
      }
      setIsLoadingProject(false);
    };

    if (user.id.startsWith("local_") || user.id === "offline_guest_user_id") {
      loadLocalProject();
      return;
    }

    const projectsRef = collection(db, "projects");
    const q = query(projectsRef, where("memberEmails", "array-contains", userEmailNormalized));

    const unsubscribe = onSnapshot(q, async (snapshot) => {
      if (!snapshot.empty) {
        const docSnap = snapshot.docs[0];
        const data = docSnap.data();
        setActiveProject({
          id: docSnap.id,
          ...data
        } as ProjectWorkspace);
        setIsLoadingProject(false);
      } else {
        // No shared workspace contains this user - bootstrap a new one with user details
        try {
          const genProjectId = user.id;
          const newProjectDoc = {
            name: `مشروع ${user.name || "الرئيسي"}`,
            ownerEmail: userEmailNormalized,
            memberEmails: [userEmailNormalized],
            members: [
              {
                email: userEmailNormalized,
                name: user.name || "العضو",
                role: "مالك",
                status: "نشط"
              }
            ]
          };
          // Persist in Firestore
          await setDoc(doc(db, "projects", genProjectId), newProjectDoc);
          setActiveProject({
            id: genProjectId,
            ...newProjectDoc
          } as ProjectWorkspace);
        } catch (e) {
          console.error("Critical: Failed to auto-bootstrap workspace, restoring local project instead:", e);
          loadLocalProject();
        }
        setIsLoadingProject(false);
      }
    }, (error) => {
      console.error("Firestore projects lookup error, falling back locally:", error);
      loadLocalProject();
    });

    return () => unsubscribe();
  }, [user]);

  // 2. Sync Shared Operations database from Firestore
  useEffect(() => {
    if (!user) {
      setOperations([]);
      setLoading(false);
      return;
    }

    if (isLoadingProject) {
      // Wait for workspace project details to load first so we query with the correct projectId
      return;
    }
    
    setLoading(true);
    const workspaceId = activeProject ? activeProject.id : user.id;
    
    const loadLocalOperations = () => {
      const localOpsKey = `local_ops_${workspaceId}`;
      const savedOps = localStorage.getItem(localOpsKey);
      if (savedOps) {
        try {
          const parsed = JSON.parse(savedOps);
          const filtered = Array.isArray(parsed) 
            ? parsed.filter((op: any) => op && op.id && !op.id.startsWith("default_"))
            : [];
          if (filtered.length !== parsed.length) {
            localStorage.setItem(localOpsKey, JSON.stringify(filtered));
          }
          setOperations(filtered);
        } catch (e) {
          localStorage.setItem(localOpsKey, JSON.stringify([]));
          setOperations([]);
        }
      } else {
        localStorage.setItem(localOpsKey, JSON.stringify([]));
        setOperations([]);
      }
      setLoading(false);
    };

    if (user.id.startsWith("local_") || user.id === "offline_guest_user_id" || workspaceId.startsWith("local_proj_")) {
      loadLocalOperations();
      return;
    }

    const opsRef = collection(db, "operations");
    // Listen for operations recorded under this workspace projectId
    const q = query(opsRef, where("projectId", "==", workspaceId));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOps: Operation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedOps.push({
          ...(data as any),
          id: doc.id,
          date: data.date || (data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : new Date().toISOString())
        } as Operation);
      });
      // Sort client-side to protect indexing constraints
      fetchedOps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOperations(fetchedOps);
      setLoading(false);
    }, (error) => {
      console.error("Firestore operations sync error, falling back locally:", error);
      loadLocalOperations();
    });

    return () => unsubscribe();
  }, [user, activeProject, isLoadingProject]);

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Local/Cloud handler to manage operations instantly
  const handleAddOperation = async (payload: any): Promise<boolean> => {
    if (!user) return false;
    const workspaceId = activeProject ? activeProject.id : user.id;

    // Local persistence saver helper
    const saveLocally = () => {
      try {
        const localOpsKey = `local_ops_${workspaceId}`;
        const savedOps = localStorage.getItem(localOpsKey);
        const opsList: Operation[] = savedOps ? JSON.parse(savedOps) : [];
        const newOp: Operation = {
          ...payload,
          id: `op_${Math.floor(100000 + Math.random() * 900000)}`,
          userId: user.id,
          projectId: workspaceId,
          date: new Date().toISOString()
        };
        opsList.unshift(newOp);
        localStorage.setItem(localOpsKey, JSON.stringify(opsList));
        setOperations(opsList);
        return true;
      } catch (locErr) {
        console.error("Failed to write to local storage:", locErr);
        return false;
      }
    };

    if (user.id.startsWith("local_") || user.id === "offline_guest_user_id" || workspaceId.startsWith("local_proj_")) {
      return saveLocally();
    }

    try {
      const dbPayload = {
        ...payload,
        userId: user.id,
        projectId: workspaceId,
        createdAt: serverTimestamp(),
        // Keep a string date for exact local time if needed by the app
        date: new Date().toISOString()
      };
      
      const opsRef = collection(db, "operations");
      await addDoc(opsRef, dbPayload);
      return true;
    } catch (e) {
      console.error("Firestore serialization failed:", e);
      return false;
    }
  };

  const handleDeleteOperation = async (opId: string): Promise<boolean> => {
    if (!user) return false;
    const workspaceId = activeProject ? activeProject.id : user.id;

    const deleteLocally = () => {
      try {
        const localOpsKey = `local_ops_${workspaceId}`;
        const savedOps = localStorage.getItem(localOpsKey);
        const opsList: Operation[] = savedOps ? JSON.parse(savedOps) : [];
        const filteredOps = opsList.filter(op => op.id !== opId);
        localStorage.setItem(localOpsKey, JSON.stringify(filteredOps));
        setOperations(filteredOps);
        return true;
      } catch (locErr) {
        console.error("Failed to delete local storage operation:", locErr);
        return false;
      }
    };

    if (user.id.startsWith("local_") || user.id === "offline_guest_user_id" || workspaceId.startsWith("local_proj_")) {
      return deleteLocally();
    }

    try {
      const opDocRef = doc(db, "operations", opId);
      await deleteDoc(opDocRef);
      // Immediately filter our local state to guarantee instantaneous update without any listener lags
      setOperations((prev) => prev.filter(op => op.id !== opId));
      return true;
    } catch (e) {
      console.error("Firestore delete failed:", e);
      return false;
    }
  };

  const isRealCloudUser = user && !user.id.startsWith("local_") && user.id !== "offline_guest_user_id";

  if (authLoading || (isRealCloudUser && isLoadingProject)) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 animate-spin rounded-full"></div>
        <p className="text-xs font-bold text-neutral-400">جاري الاتصال بالنظام السحابي ومزامنة مساحة العمل...</p>
      </div>
    );
  }

  if (!user) {
    return <AuthScreens />;
  }

  return (
    <div dir="rtl" className="min-h-screen bg-[#fafafa] text-neutral-900 pb-28 font-sans">
      
      <Header currentTab={activeTab} onNavigate={setActiveTab} onLogout={() => setShowLogoutConfirm(true)} />

      {/* Main Container Workspace */}
      <main className="px-4 lg:px-8 py-8 max-w-5xl mx-auto">
        <div className="relative font-sans">
          {activeTab === "create" && (
            <OperationForm 
              onAddOperation={handleAddOperation}
              onNavigateToDashboard={() => setActiveTab("dashboard")}
            />
          )}
          
          {activeTab === "dashboard" && (
            <FinanceDashboard 
              operations={operations}
              isLoading={loading}
              onNavigateToNew={() => setActiveTab("create")}
              onDeleteOperation={handleDeleteOperation}
            />
          )}

          {activeTab === "settings" && (
            <Settings 
              onLogoutReq={() => setShowLogoutConfirm(true)} 
              activeProject={activeProject}
            />
          )}
        </div>
      </main>

      {/* Logout Confirmation Modal */}
      <AnimatePresence>
        {showLogoutConfirm && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowLogoutConfirm(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-neutral-100 overflow-hidden text-center z-10"
            >
              <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto text-red-500">
                <LogOut className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-black text-neutral-950 tracking-tight mb-2">تأكيد الخروج</h3>
              <p className="text-sm text-neutral-500 font-medium mb-8">هل أنت متأكد من رغبتك في تسجيل الخروج من الحساب الحالي؟</p>
              
              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => setShowLogoutConfirm(false)}
                  className="bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors py-3.5 rounded-xl font-bold text-sm"
                >
                  تراجع
                </button>
                <button
                  onClick={() => {
                    logout();
                    setShowLogoutConfirm(false);
                  }}
                  className="bg-red-600 text-white hover:bg-red-700 transition-colors py-3.5 rounded-xl font-bold text-sm"
                >
                  تأكيد الخروج
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pristine Floating Bottom Navigation Bar with 3 actions */}
      <nav 
        className="fixed bottom-5 left-1/2 -translate-x-1/2 max-w-sm w-[94%] z-40 flex justify-between items-center p-1.5 bg-neutral-950/95 text-white shadow-xl rounded-2xl border border-white/15 backdrop-blur-md"
        id="navbar-operations-with-team"
      >
        <button
          onClick={() => setActiveTab("create")}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl transition-all cursor-pointer text-[10px] sm:text-xs font-bold leading-none ${
            activeTab === "create"
              ? "bg-white text-neutral-950 shadow-md font-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <PlusCircle className="w-4 h-4 shrink-0" />
          <span>تسجيل بيعة</span>
        </button>

        <button
          onClick={() => setActiveTab("dashboard")}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl transition-all cursor-pointer text-[10px] sm:text-xs font-bold leading-none ${
            activeTab === "dashboard"
              ? "bg-white text-neutral-950 shadow-md font-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <BarChart3 className="w-4 h-4 shrink-0" />
          <span>لوحة النتائج</span>
        </button>

        <button
          onClick={() => setActiveTab("settings")}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl transition-all cursor-pointer text-[10px] sm:text-xs font-bold leading-none ${
            activeTab === "settings"
              ? "bg-white text-neutral-950 shadow-md font-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <SettingsIcon className="w-4 h-4 shrink-0" />
          <span>الإعدادات</span>
        </button>
      </nav>

    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
