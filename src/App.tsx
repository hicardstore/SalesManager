import React, { useState, useEffect, useMemo } from "react";
import { Operation, ProjectWorkspace } from "./types";
import OperationForm from "./components/OperationForm";
import FinanceDashboard from "./components/FinanceDashboard";
import MonthlyTimeline from "./components/MonthlyTimeline";
import { PlusCircle, BarChart3, Bell, Landmark, Settings as SettingsIcon, LogOut, Bug, Calendar, Coins } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Header } from "./components/Header";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthScreens } from "./components/AuthScreens";
import { Settings } from "./components/Settings";
import { ProfitsDashboard } from "./components/ProfitsDashboard";
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
  const [activeTab, setActiveTab] = useState<"create" | "dashboard" | "profits" | "settings">(() => {
    try {
      const saved = localStorage.getItem("active_tab");
      if (saved === "create" || saved === "dashboard" || saved === "profits" || saved === "settings") {
        return saved as any;
      }
    } catch (e) {}
    return "dashboard";
  });
  const [dashboardSubTab, setDashboardSubTab] = useState<"overview" | "timeline">(() => {
    try {
      const saved = localStorage.getItem("dashboard_sub_tab");
      if (saved === "overview" || saved === "timeline") {
        return saved as any;
      }
    } catch (e) {}
    return "overview";
  });

  // Keep tab and subtab options synced to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("active_tab", activeTab);
    } catch (e) {}
  }, [activeTab]);

  useEffect(() => {
    try {
      localStorage.setItem("dashboard_sub_tab", dashboardSubTab);
    } catch (e) {}
  }, [dashboardSubTab]);

  // Load initial cached user synchronously to fetch relevant project and operations with zero lag
  const cachedUser = useMemo(() => {
    try {
      const cached = localStorage.getItem("last_logged_in_user");
      return cached ? JSON.parse(cached) : null;
    } catch (e) {
      return null;
    }
  }, []);

  const [activeProject, setActiveProject] = useState<ProjectWorkspace | null>(() => {
    if (cachedUser) {
      try {
        const cachedProj = localStorage.getItem(`cached_project_${cachedUser.id}`);
        return cachedProj ? JSON.parse(cachedProj) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [operations, setOperations] = useState<Operation[]>(() => {
    if (cachedUser) {
      try {
        const cachedOps = localStorage.getItem(`cached_operations_${cachedUser.id}`);
        return cachedOps ? JSON.parse(cachedOps) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [deletedOperations, setDeletedOperations] = useState<Operation[]>(() => {
    if (cachedUser) {
      try {
        const cachedDelOps = localStorage.getItem(`cached_deleted_operations_${cachedUser.id}`);
        return cachedDelOps ? JSON.parse(cachedDelOps) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

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

  // Load cached project and operations immediately on user resolution
  useEffect(() => {
    if (user) {
      try {
        const cachedProj = localStorage.getItem(`cached_project_${user.id}`);
        if (cachedProj) {
          setActiveProject(JSON.parse(cachedProj));
        }
        
        const cachedOps = localStorage.getItem(`cached_operations_${user.id}`);
        if (cachedOps) {
          setOperations(JSON.parse(cachedOps));
        }

        const cachedDelOps = localStorage.getItem(`cached_deleted_operations_${user.id}`);
        if (cachedDelOps) {
          setDeletedOperations(JSON.parse(cachedDelOps));
        }
      } catch (e) {
        console.error("Failed to load cached data:", e);
      }
    }
  }, [user]);
  
  // Collaborative workspace settings persistence
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
            const resolvedProj = {
              id: docSnap.id,
              ...docSnap.data()
            } as ProjectWorkspace;
            setActiveProject(resolvedProj);
            setIsLoadingProject(false);
            try {
              localStorage.setItem(`cached_project_${user.id}`, JSON.stringify(resolvedProj));
            } catch (e) {
              console.error("Failed to cache project:", e);
            }
          } else {
            // If workspace is missing for any reason (e.g. account re-registration or deleted database document),
            // auto-create it instantly to prevent lockouts and ensure a lightning-fast initial load.
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
      setDeletedOperations([]);
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
        
        // Robustly parse the date field or createdAt timestamp
        let resolvedDate: string;
        if (data.date) {
          resolvedDate = data.date;
        } else if (data.createdAt) {
          if (typeof data.createdAt.toDate === "function") {
            resolvedDate = data.createdAt.toDate().toISOString();
          } else if (typeof data.createdAt.seconds === "number") {
            resolvedDate = new Date(data.createdAt.seconds * 1000).toISOString();
          } else {
            const parsed = new Date(data.createdAt);
            resolvedDate = !isNaN(parsed.getTime()) ? parsed.toISOString() : "2000-01-01T00:00:00.000Z";
          }
        } else {
          // Default historical baseline for dateless legacy documents so they don't dynamically pollute today's filter
          resolvedDate = "2000-01-01T00:00:00.000Z";
        }

        fetchedOps.push({
          ...(data as any),
          id: doc.id,
          date: resolvedDate
        } as Operation);
      });
      // Sort client-side to protect indexing constraints
      fetchedOps.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setOperations(fetchedOps);
      setLoading(false);
      try {
        localStorage.setItem(`cached_operations_${user.id}`, JSON.stringify(fetchedOps));
      } catch (e) {
        console.error("Failed to cache operations:", e);
      }
    }, (error) => {
      console.error("Firestore operations sync error:", error);
      setLoading(false);
    });

    // Listen for deleted operations recorded under the shared project workspace
    const deletedOpsRef = collection(db, "projects", activeProject.id, "deleted_operations");
    const qDeleted = query(deletedOpsRef);
    
    const unsubscribeDeleted = onSnapshot(qDeleted, (snapshot) => {
      const fetchedDeletedOps: Operation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        fetchedDeletedOps.push({
          ...(data as any),
          id: doc.id,
          date: data.date || new Date().toISOString()
        } as Operation);
      });
      // Sort deleted by date (most recently deleted first)
      fetchedDeletedOps.sort((a, b) => {
        const timeA = (a as any).deletedAt ? new Date((a as any).deletedAt).getTime() : new Date(a.date).getTime();
        const timeB = (b as any).deletedAt ? new Date((b as any).deletedAt).getTime() : new Date(b.date).getTime();
        return timeB - timeA;
      });
      setDeletedOperations(fetchedDeletedOps);
      try {
        localStorage.setItem(`cached_deleted_operations_${user.id}`, JSON.stringify(fetchedDeletedOps));
      } catch (e) {
        console.error("Failed to cache deleted operations:", e);
      }
    }, (error) => {
      console.error("Firestore deleted operations sync error:", error);
    });

    return () => {
      unsubscribe();
      unsubscribeDeleted();
    };
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
        date: payload.date || new Date().toISOString()
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

    const backupPath = `projects/${activeProject.id}/deleted_operations/${opId}`;
    const deletePath = `projects/${activeProject.id}/operations/${opId}`;

    // 1. Find the operation from current active state and attempt to back it up
    const opToBackup = operations.find(o => o.id === opId);
    if (opToBackup) {
      try {
        const cleanBackup = {
          clientId: opToBackup.clientId || "",
          clientName: opToBackup.clientName || "",
          date: opToBackup.date || new Date().toISOString(),
          status: opToBackup.status || "مكتمل",
          packageAmount: Number(opToBackup.packageAmount) || 0,
          totalInstallmentAmount: Number(opToBackup.totalInstallmentAmount) || 0,
          downPayment: Number(opToBackup.downPayment) || 0,
          remainingAmount: Number(opToBackup.remainingAmount) || 0,
          provider: opToBackup.provider || "إمكان",
          monthlyInstallment: Number(opToBackup.monthlyInstallment) || 0,
          durationMonths: Number(opToBackup.durationMonths) || 0,
          commissionFee: Number(opToBackup.commissionFee || 0),
          userId: user.id
        };
        const deletedDocRef = doc(db, "projects", activeProject.id, "deleted_operations", opId);
        await setDoc(deletedDocRef, {
          ...cleanBackup,
          deletedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Warning: Backup to deleted_operations subcollection failed:", e);
        // We log the error but still proceed with the deletion to prevent locking the app delete flow
      }
    }

    // 2. Perform the main deletion from operations collection
    try {
      const opDocRef = doc(db, "projects", activeProject.id, "operations", opId);
      await deleteDoc(opDocRef);
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.DELETE, deletePath);
      return false;
    }
  };

  const handleRestoreOperation = async (opId: string): Promise<boolean> => {
    if (!user) throw new Error("لم يتم تسجيل الدخول بعد.");
    if (!activeProject) throw new Error("لم يتم العثور على مساحة عمل نشطة.");

    const restorePath = `projects/${activeProject.id}/operations/${opId}`;
    const deleteBackupPath = `projects/${activeProject.id}/deleted_operations/${opId}`;

    const opToRestore = deletedOperations.find(o => o.id === opId);
    if (!opToRestore) return false;

    // 1. Copy back to operations subcollection
    try {
      const opDocRef = doc(db, "projects", activeProject.id, "operations", opId);
      const cleanOp = {
        clientId: opToRestore.clientId || "",
        clientName: opToRestore.clientName || "",
        date: opToRestore.date || new Date().toISOString(),
        status: opToRestore.status || "مكتمل",
        packageAmount: Number(opToRestore.packageAmount) || 0,
        totalInstallmentAmount: Number(opToRestore.totalInstallmentAmount) || 0,
        downPayment: Number(opToRestore.downPayment) || 0,
        remainingAmount: Number(opToRestore.remainingAmount) || 0,
        provider: opToRestore.provider || "إمكان",
        monthlyInstallment: Number(opToRestore.monthlyInstallment) || 0,
        durationMonths: Number(opToRestore.durationMonths) || 0,
        commissionFee: Number(opToRestore.commissionFee || 0),
        userId: user.id,
        createdAt: serverTimestamp()
      };
      await setDoc(opDocRef, cleanOp);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, restorePath);
      return false;
    }

    // 2. Delete from deleted_operations subcollection
    try {
      const deletedDocRef = doc(db, "projects", activeProject.id, "deleted_operations", opId);
      await deleteDoc(deletedDocRef);
      return true;
    } catch (e) {
      console.error("Warning: Cleaning up restored document from deleted_operations subcollection failed:", e);
      // Return true anyway because the document has been successfully restored to the main dashboard
      return true;
    }
  };

  const isRealCloudUser = user && !user.id.startsWith("local_") && user.id !== "offline_guest_user_id";

  if ((authLoading && !user) || (isRealCloudUser && isLoadingProject && !activeProject)) {
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
      
      <Header 
        currentTab={activeTab} 
        onNavigate={setActiveTab} 
        onLogout={() => setShowLogoutConfirm(true)} 
        isSyncing={isLoadingProject || loading}
      />

      {/* Main Container Workspace */}
      <main className="px-4 lg:px-8 py-8 max-w-5xl lg:max-w-7xl mx-auto">
        <div className="relative font-sans">
          {activeTab === "create" && (
            <OperationForm 
              onAddOperation={handleAddOperation}
              onNavigateToDashboard={() => setActiveTab("dashboard")}
              activeProject={activeProject}
            />
          )}
          
          {activeTab === "dashboard" && (
            <div className="space-y-6">
              {/* Premium Sub-tab Switcher */}
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 rounded-3xl border border-neutral-100 shadow-[0px_4px_20px_rgba(0,0,0,0.01)] gap-4" dir="rtl">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-neutral-950 text-white rounded-2xl shadow-sm">
                    <BarChart3 className="w-5 h-5" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-neutral-900 tracking-tight">بوابة المراقبة والتحليل المالي</h2>
                    <p className="text-xs text-neutral-500 font-medium mt-0.5">تابع المؤشرات المالية العامة أو تتبع تدفق العمليات على الخط الزمني الشهري</p>
                  </div>
                </div>

                <div className="flex gap-1 bg-neutral-50 p-1 rounded-2xl w-full sm:w-auto border border-neutral-100">
                  <button
                    onClick={() => setDashboardSubTab("overview")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      dashboardSubTab === "overview"
                        ? "bg-white text-neutral-950 shadow-xs"
                        : "text-neutral-550 hover:text-neutral-900"
                    }`}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>لوحة القيادة والتحليل</span>
                  </button>
                  <button
                    onClick={() => setDashboardSubTab("timeline")}
                    className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
                      dashboardSubTab === "timeline"
                        ? "bg-white text-neutral-950 shadow-xs"
                        : "text-neutral-550 hover:text-neutral-900"
                    }`}
                  >
                    <Calendar className="w-3.5 h-3.5" />
                    <span>الخط الزمني للعمليات</span>
                  </button>
                </div>
              </div>

              {dashboardSubTab === "overview" ? (
                <FinanceDashboard 
                  operations={operations}
                  deletedOperations={deletedOperations}
                  isLoading={loading}
                  onNavigateToNew={() => setActiveTab("create")}
                  onDeleteOperation={handleDeleteOperation}
                  onRestoreOperation={handleRestoreOperation}
                  activeProject={activeProject}
                />
              ) : (
                <MonthlyTimeline 
                  operations={operations}
                  activeProject={activeProject}
                />
              )}
            </div>
          )}

          {activeTab === "profits" && (
            <ProfitsDashboard 
              operations={operations} 
              activeProject={activeProject}
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

      {/* Pristine Floating Bottom Navigation Bar with 5 actions */}
      <nav 
        className="fixed bottom-5 left-1/2 -translate-x-1/2 max-w-md w-[94%] z-40 flex justify-between items-center p-1.5 bg-neutral-950/95 text-white shadow-xl rounded-2xl border border-white/15 backdrop-blur-md lg:hidden"
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
          <span>اللوحة</span>
        </button>

        <button
          onClick={() => setActiveTab("profits")}
          className={`flex-1 flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-2 py-2.5 rounded-xl transition-all cursor-pointer text-[10px] sm:text-xs font-bold leading-none ${
            activeTab === "profits"
              ? "bg-white text-neutral-950 shadow-md font-black"
              : "text-neutral-400 hover:text-white"
          }`}
        >
          <Coins className="w-4 h-4 shrink-0" />
          <span>الأرباح</span>
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
