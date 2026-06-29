import React, { useState, useEffect } from "react";
import { Operation, ProjectWorkspace } from "./types";
import OperationForm from "./components/OperationForm";
import FinanceDashboard from "./components/FinanceDashboard";
import { PlusCircle, BarChart3, Bell, Landmark, Settings as SettingsIcon, LogOut, Bug } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthScreens } from "./components/AuthScreens";
import { Settings } from "./components/Settings";
import { DebugPage } from "./components/DebugPage";
import { db, auth } from "./firebase";
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, serverTimestamp, deleteDoc, getDocs } from "firebase/firestore";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

function MainApp() {
  const { user, logout, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<"create" | "dashboard" | "settings" | "debug">("dashboard");
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
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Devices active session log
  const [devices, setDevices] = useState<any[]>([]);

  // 1. Resolve Active Shared Workspace Project dynamically
  useEffect(() => {
    if (!user) {
      setActiveProject(null);
      setIsLoadingProject(false);
      return;
    }

    setIsLoadingProject(true);
    let unsubscribe: () => void = () => {};

    const resolveWorkspace = async () => {
      try {
        setWorkspaceError(null);
        const projectsRef = collection(db, "projects");
        
        // Step A: Search by ownerId (Primary Key)
        let q = query(projectsRef, where("ownerId", "==", user.id));
        let snapshot = await getDocs(q);
        
        // Step B: If not found, try fallback (legacy lookup by ownerEmail or memberEmails)
        if (snapshot.empty) {
          const userEmailNormalized = user.email?.toLowerCase().trim() || "";
          if (userEmailNormalized) {
            const emailQ = query(projectsRef, where("memberEmails", "array-contains", userEmailNormalized));
            snapshot = await getDocs(emailQ);
            
            if (!snapshot.empty) {
              // Find the oldest one owned by user email (or just the first one if none exactly match ownerEmail)
              let bestDoc = snapshot.docs[0];
              for (const docSnap of snapshot.docs) {
                 if (docSnap.data().ownerEmail === userEmailNormalized) {
                   bestDoc = docSnap;
                   break; // Found an exact legacy match
                 }
              }
              // Migrate it to have ownerId
              await setDoc(doc(db, "projects", bestDoc.id), { ownerId: user.id }, { merge: true });
              
              // Re-fetch by ownerId to subscribe properly
              q = query(projectsRef, where("ownerId", "==", user.id));
            }
          }
        }
        
        // Step C: Subscribe to the resolved query
        unsubscribe = onSnapshot(q, async (snap) => {
          if (!snap.empty) {
            // Pick the first one
            const docSnap = snap.docs[0];
            setActiveProject({
              id: docSnap.id,
              ...docSnap.data()
            } as ProjectWorkspace);
            setIsLoadingProject(false);
          } else {
             // Not found at all. Check if user is truly new.
             const currentUser = auth.currentUser;
             const creation = currentUser?.metadata.creationTime;
             const lastSignIn = currentUser?.metadata.lastSignInTime;
             
             // In Firebase, creationTime and lastSignInTime are strings.
             const isNewUser = (creation && lastSignIn) 
               ? Math.abs(Date.parse(lastSignIn) - Date.parse(creation)) < 5000 
               : false;
               
             if (isNewUser) {
               // Create workspace
               try {
                 const userEmailNormalized = user.email?.toLowerCase().trim() || "";
                 let baseName = user.name || "الرئيسي";
                 if (baseName.includes("مستخدم ضيف") || baseName.includes("زائر تجريبي") || !user.name) {
                    baseName = user.email?.split("@")[0] || "الرئيسي";
                 }
                 const newProjectDoc = {
                   name: `مشروع ${baseName}`,
                   ownerId: user.id,
                   ownerEmail: userEmailNormalized,
                   memberEmails: [userEmailNormalized],
                   members: [
                     {
                       email: userEmailNormalized,
                       name: baseName || "العضو",
                       role: "مالك",
                       status: "نشط"
                     }
                   ]
                 };
                 await setDoc(doc(db, "projects", user.id), newProjectDoc);
                 // The onSnapshot will trigger again and pick this up.
               } catch(e) {
                 console.error("Critical: Failed to auto-bootstrap workspace:", e);
                 setWorkspaceError("فشل إنشاء مساحة العمل الجديدة. يرجى المحاولة مرة أخرى.");
                 setIsLoadingProject(false);
               }
             } else {
                console.error("No workspace found for existing user. Not creating a new one.");
                setActiveProject(null);
                setWorkspaceError("لم يتم العثور على مساحة عمل لهذا الحساب. يرجى التأكد من تسجيل الدخول بالحساب الصحيح أو التواصل مع الدعم.");
                setIsLoadingProject(false);
             }
          }
        }, (error) => {
          console.error("Firestore projects lookup error:", error);
          setWorkspaceError("حدث خطأ أثناء جلب بيانات مساحة العمل.");
          setIsLoadingProject(false);
        });
        
      } catch (err) {
        console.error("Workspace resolution failed:", err);
        setWorkspaceError("حدث خطأ أثناء الاتصال بقاعدة البيانات.");
        setIsLoadingProject(false);
      }
    };
    
    resolveWorkspace();

    return () => unsubscribe();
  }, [user]);

  // 2. Sync Shared Operations database from Firestore
  useEffect(() => {
    if (!user || !activeProject) {
      setOperations([]);
      setLoading(false);
      return;
    }
    
    setLoading(true);
    
    // Listen for operations recorded under the shared project workspace
    const opsRef = collection(db, "projects", activeProject.id, "operations");
    const q = query(opsRef);
    
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
      console.error("Firestore operations sync error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.id, activeProject?.id]);

  // 3. One-time Migration of local data and bad project names
  useEffect(() => {
    if (!user || !activeProject) return;

    const runMigration = async () => {
      // a) Fix project name if it was created under "مستخدم ضيف" or "زائر تجريبي"
      if (activeProject.name.includes("مستخدم ضيف") || activeProject.name.includes("زائر تجريبي") || activeProject.name.includes("null")) {
        try {
          let baseName = user.name || "الرئيسي";
          if (baseName.includes("مستخدم ضيف") || baseName.includes("زائر تجريبي") || !user.name) {
            baseName = user.email?.split("@")[0] || "الرئيسي";
          }
          const newName = `مشروع ${baseName}`;
          // Make sure it doesn't accidentally set it to "مشروع مستخدم ضيف" again
          if (!newName.includes("مستخدم ضيف") && !newName.includes("زائر تجريبي")) {
            await setDoc(doc(db, "projects", activeProject.id), { name: newName }, { merge: true });
          }
        } catch (e) {
          console.error("Failed to rename project:", e);
        }
      }

      try {
        const legacyOpsRef = collection(db, "operations");
        const qLegacy = query(legacyOpsRef, where("userId", "==", user.id));
        const legacySnap = await getDocs(qLegacy);
        if (!legacySnap.empty) {
          console.log(`Found ${legacySnap.size} legacy operations in root collection, migrating to project subcollection...`);
          for (const docSnap of legacySnap.docs) {
            const opData = docSnap.data();
            const newRef = doc(db, "projects", activeProject.id, "operations", docSnap.id);
            await setDoc(newRef, { ...opData, id: docSnap.id }, { merge: true });
            await deleteDoc(docSnap.ref); // Delete the old root document
          }
        }
      } catch (err) {
        console.error("Legacy root operations migration failed:", err);
      }

      // Migrate from users/{userId}/operations to projects/{projectId}/operations
      try {
        const userOpsRef = collection(db, "users", user.id, "operations");
        const userOpsSnap = await getDocs(userOpsRef);
        if (!userOpsSnap.empty) {
          console.log(`Found ${userOpsSnap.size} operations in user subcollection, migrating to project...`);
          for (const docSnap of userOpsSnap.docs) {
            const opData = docSnap.data();
            const newRef = doc(db, "projects", activeProject.id, "operations", docSnap.id);
            await setDoc(newRef, { ...opData, id: docSnap.id }, { merge: true });
            await deleteDoc(docSnap.ref);
          }
        }
      } catch (err) {
        console.error("User ops to project ops migration failed:", err);
      }

      // b) Migrate any stuck local operations to Cloud Firestore
      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith("local_ops_")) {
            const savedOps = localStorage.getItem(key);
            if (savedOps) {
              const parsed = JSON.parse(savedOps);
              if (Array.isArray(parsed) && parsed.length > 0) {
                console.log("Migrating local operations to cloud for key:", key);
                for (const op of parsed) {
                  // Make sure we have an ID
                  const opId = op.id || `migrated_${Math.random().toString(36).substr(2, 9)}`;
                  const opRef = doc(db, "projects", activeProject.id, "operations", opId);
                  const dbPayload = {
                    ...op,
                    id: opId,
                    userId: user.id,
                    createdAt: serverTimestamp(),
                  };
                  await setDoc(opRef, dbPayload, { merge: true });
                }
              }
            }
            // Clear the local key once processed
            localStorage.removeItem(key);
          }
        }
      } catch (err) {
        console.error("Local data migration failed:", err);
      }
    };

    runMigration();
  }, [user, activeProject]);

  // Devices info helper
  const getDeviceName = () => {
    const ua = navigator.userAgent;
    let browser = "متصفح غير معروف";
    let os = "نظام تشغيل غير معروف";

    if (ua.includes("Firefox")) browser = "Firefox";
    else if (ua.includes("Chrome") && !ua.includes("Chromium") && !ua.includes("Edg")) browser = "Chrome";
    else if (ua.includes("Safari") && !ua.includes("Chrome")) browser = "Safari";
    else if (ua.includes("Edg")) browser = "Edge";
    else if (ua.includes("OPR") || ua.includes("Opera")) browser = "Opera";

    if (ua.includes("Windows NT")) os = "Windows";
    else if (ua.includes("Macintosh")) os = "macOS";
    else if (ua.includes("iPhone")) os = "iPhone";
    else if (ua.includes("iPad")) os = "iPad";
    else if (ua.includes("Android")) os = "Android";
    else if (ua.includes("Linux")) os = "Linux";

    return `${browser} (${os})`;
  };

  // 3. Register and Sync Active Device Sessions
  useEffect(() => {
    if (!user) {
      setDevices([]);
      return;
    }

    let deviceId = localStorage.getItem("device_id");
    if (!deviceId) {
      deviceId = `dev_${Math.floor(100000 + Math.random() * 900000)}`;
      localStorage.setItem("device_id", deviceId);
    }

    const myDeviceName = getDeviceName();
    const deviceDocId = `${user.id}_${deviceId}`;
    const deviceRef = doc(db, "devices", deviceDocId);

    let unsubCurrentDevice: () => void = () => {};

    const registerDevice = async () => {
      try {
        await setDoc(deviceRef, {
          id: deviceId,
          userId: user.id,
          deviceName: myDeviceName,
          lastActive: new Date().toISOString(),
          userAgent: navigator.userAgent
        }, { merge: true });

        // Only start checking for session revocation AFTER we are sure the device document is created
        let isInitial = true;
        unsubCurrentDevice = onSnapshot(deviceRef, (docSnap) => {
          if (isInitial) {
            isInitial = false;
            return;
          }
          if (!docSnap.exists()) {
            console.warn("This device session has been revoked from another device.");
            logout();
          }
        });
      } catch (err) {
        console.error("Failed to register device session:", err);
      }
    };

    registerDevice();

    // Subscribe to all active devices for this user
    const devicesRef = collection(db, "devices");
    const q = query(devicesRef, where("userId", "==", user.id));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const list: any[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        list.push({
          ...data,
          docId: doc.id,
          current: data.id === deviceId
        });
      });
      list.sort((a, b) => new Date(b.lastActive || 0).getTime() - new Date(a.lastActive || 0).getTime());
      setDevices(list);
    }, (err) => {
      console.error("Failed to subscribe to devices:", err);
    });

    return () => {
      unsubscribe();
      if (unsubCurrentDevice) unsubCurrentDevice();
    };
  }, [user]);

  const handleDeleteDevice = async (deviceDocId: string) => {
    if (!user) return;

    try {
      await deleteDoc(doc(db, "devices", deviceDocId));
    } catch (err) {
      console.error("Failed to delete device session:", err);
    }
  };

  // Scroll to top when tab changes
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [activeTab]);

  // Local/Cloud handler to manage operations instantly
  const handleAddOperation = async (payload: any): Promise<boolean> => {
    if (!user) throw new Error("لم يتم تسجيل الدخول بعد.");
    if (!activeProject) throw new Error("لم يتم العثور على مساحة عمل نشطة لتسجيل العملية فيها.");

    const path = `projects/${activeProject.id}/operations`;
    try {
      const dbPayload = {
        ...payload,
        userId: user.id,
        createdAt: serverTimestamp(),
        // Keep a string date for exact local time if needed by the app
        date: new Date().toISOString()
      };
      
      const opsRef = collection(db, "projects", activeProject.id, "operations");
      await addDoc(opsRef, dbPayload);
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      return false;
    }
  };

  const handleDeleteOperation = async (opId: string): Promise<boolean> => {
    if (!user) throw new Error("لم يتم تسجيل الدخول بعد.");
    if (!activeProject) throw new Error("لم يتم العثور على مساحة عمل نشطة.");

    const path = `projects/${activeProject.id}/operations/${opId}`;
    try {
      const opDocRef = doc(db, "projects", activeProject.id, "operations", opId);
      await deleteDoc(opDocRef);
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, path);
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

  if (workspaceError) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4" dir="rtl">
        <div className="bg-red-50 text-red-700 p-6 rounded-2xl max-w-md w-full border border-red-100 text-center space-y-4 shadow-sm">
          <h2 className="text-xl font-bold">خطأ في مساحة العمل</h2>
          <p className="text-sm">{workspaceError}</p>
          <button 
            onClick={() => {
              setWorkspaceError(null);
              logout();
            }}
            className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            تسجيل الخروج
          </button>
        </div>
      </div>
    );
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
              devices={devices}
              onDeleteDevice={handleDeleteDevice}
            />
          )}

          {activeTab === "debug" && (
            <DebugPage activeProject={activeProject} />
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
                    if (activeProject) {
                      localStorage.setItem("test_workspace_before_logout", activeProject.id);
                      localStorage.setItem("test_ops_count_before_logout", operations.length.toString());
                      console.log("LOG TEST: Saved Workspace ID before logout =", activeProject.id, ", operations count =", operations.length);
                    }
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

        <button
          onClick={() => setActiveTab("debug")}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl transition-all cursor-pointer text-[10px] sm:text-xs font-bold leading-none ${
            activeTab === "debug"
              ? "bg-white text-neutral-950 shadow-md font-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Bug className="w-4 h-4 shrink-0" />
          <span>فحص</span>
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
