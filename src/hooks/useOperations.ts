import { useState, useEffect } from "react";
import { Operation, ProjectWorkspace, User } from "../types";
import { db, auth } from "../firebase";
import { collection, query, where, onSnapshot, addDoc, doc, setDoc, serverTimestamp, deleteDoc, getDocs, updateDoc } from "firebase/firestore";

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
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function useOperations(user: User | null, activeProject: ProjectWorkspace | null) {
  const [operations, setOperations] = useState<Operation[]>(() => {
    if (user) {
      try {
        const cachedOps = localStorage.getItem(`cached_operations_${user.id}`);
        return cachedOps ? JSON.parse(cachedOps) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [deletedOperations, setDeletedOperations] = useState<Operation[]>(() => {
    if (user) {
      try {
        const cachedDelOps = localStorage.getItem(`cached_deleted_operations_${user.id}`);
        return cachedDelOps ? JSON.parse(cachedDelOps) : [];
      } catch (e) {
        return [];
      }
    }
    return [];
  });

  const [loading, setLoading] = useState(true);

  // Load cached operations immediately when user changes
  useEffect(() => {
    if (user) {
      try {
        const cachedOps = localStorage.getItem(`cached_operations_${user.id}`);
        if (cachedOps) setOperations(JSON.parse(cachedOps));

        const cachedDelOps = localStorage.getItem(`cached_deleted_operations_${user.id}`);
        if (cachedDelOps) setDeletedOperations(JSON.parse(cachedDelOps));
      } catch (e) {
        console.error("Failed to load cached ops:", e);
      }
    }
  }, [user]);

  // Sync Shared Operations database from Firestore
  useEffect(() => {
    if (!user || !activeProject) {
      setOperations([]);
      setDeletedOperations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    const opsRef = collection(db, "projects", activeProject.id, "operations");
    const q = query(opsRef);

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedOps: Operation[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();

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
          resolvedDate = "2000-01-01T00:00:00.000Z";
        }

        fetchedOps.push({
          ...(data as any),
          id: doc.id,
          date: resolvedDate
        } as Operation);
      });

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

  // One-time Migration of local data and legacy records
  useEffect(() => {
    if (!user || !activeProject) return;

    const runMigration = async () => {
      if (activeProject.name.includes("مستخدم ضيف") || activeProject.name.includes("زائر تجريبي") || activeProject.name.includes("null")) {
        try {
          let baseName = user.name || "الرئيسي";
          if (baseName.includes("مستخدم ضيف") || baseName.includes("زائر تجريبي") || !user.name) {
            baseName = user.email?.split("@")[0] || "الرئيسي";
          }
          const newName = `مشروع ${baseName}`;
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
          for (const docSnap of legacySnap.docs) {
            const opData = docSnap.data();
            const newRef = doc(db, "projects", activeProject.id, "operations", docSnap.id);
            await setDoc(newRef, { ...opData, id: docSnap.id }, { merge: true });
            await deleteDoc(docSnap.ref);
          }
        }
      } catch (err) {
        console.error("Legacy root operations migration failed:", err);
      }

      try {
        const userOpsRef = collection(db, "users", user.id, "operations");
        const userOpsSnap = await getDocs(userOpsRef);
        if (!userOpsSnap.empty) {
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

      try {
        const keys = Object.keys(localStorage);
        for (const key of keys) {
          if (key.startsWith("local_ops_")) {
            const savedOps = localStorage.getItem(key);
            if (savedOps) {
              const parsed = JSON.parse(savedOps);
              if (Array.isArray(parsed) && parsed.length > 0) {
                for (const op of parsed) {
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
            localStorage.removeItem(key);
          }
        }
      } catch (err) {
        console.error("Local data migration failed:", err);
      }
    };

    runMigration();
  }, [user, activeProject]);

  const handleAddOperation = async (payload: any): Promise<boolean> => {
    if (!user) throw new Error("لم يتم تسجيل الدخول بعد.");
    if (!activeProject) throw new Error("لم يتم العثور على مساحة عمل نشطة لتسجيل العملية فيها.");

    const path = `projects/${activeProject.id}/operations`;
    try {
      const dbPayload = {
        ...payload,
        userId: user.id,
        createdAt: serverTimestamp(),
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

  const handleUpdateOperation = async (opId: string, payload: any): Promise<boolean> => {
    if (!user) throw new Error("لم يتم تسجيل الدخول بعد.");
    if (!activeProject) throw new Error("لم يتم العثور على مساحة عمل نشطة لتحديث العملية فيها.");

    const path = `projects/${activeProject.id}/operations/${opId}`;
    try {
      const dbPayload = {
        ...payload,
        userId: user.id,
        updatedAt: serverTimestamp(),
        date: payload.date || new Date().toISOString()
      };

      const opDocRef = doc(db, "projects", activeProject.id, "operations", opId);
      await updateDoc(opDocRef, dbPayload);
      return true;
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, path);
      return false;
    }
  };

  const handleDeleteOperation = async (opId: string): Promise<boolean> => {
    if (!user) throw new Error("لم يتم تسجيل الدخول بعد.");
    if (!activeProject) throw new Error("لم يتم العثور على مساحة عمل نشطة.");

    const deletePath = `projects/${activeProject.id}/operations/${opId}`;

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
          advancePaidBy: opToBackup.advancePaidBy || "كلنا",
          downPaymentPaidBy: opToBackup.downPaymentPaidBy || "العميل",
          transferFeePaidBy: opToBackup.transferFeePaidBy || "كلنا",
          deductDownPaymentFromFunding: opToBackup.deductDownPaymentFromFunding !== false,
          enableCommissionFee: opToBackup.enableCommissionFee !== false,
          userId: user.id
        };
        const deletedDocRef = doc(db, "projects", activeProject.id, "deleted_operations", opId);
        await setDoc(deletedDocRef, {
          ...cleanBackup,
          deletedAt: new Date().toISOString()
        });
      } catch (e) {
        console.error("Warning: Backup to deleted_operations failed:", e);
      }
    }

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
    const opToRestore = deletedOperations.find(o => o.id === opId);
    if (!opToRestore) return false;

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
        advancePaidBy: opToRestore.advancePaidBy || "كلنا",
        downPaymentPaidBy: opToRestore.downPaymentPaidBy || "العميل",
        transferFeePaidBy: opToRestore.transferFeePaidBy || "كلنا",
        deductDownPaymentFromFunding: opToRestore.deductDownPaymentFromFunding !== false,
        enableCommissionFee: opToRestore.enableCommissionFee !== false,
        userId: user.id,
        createdAt: serverTimestamp()
      };
      await setDoc(opDocRef, cleanOp);
    } catch (e) {
      handleFirestoreError(e, OperationType.WRITE, restorePath);
      return false;
    }

    try {
      const deletedDocRef = doc(db, "projects", activeProject.id, "deleted_operations", opId);
      await deleteDoc(deletedDocRef);
      return true;
    } catch (e) {
      console.error("Warning: Cleaning up restored document failed:", e);
      return true;
    }
  };

  return {
    operations,
    deletedOperations,
    loading,
    handleAddOperation,
    handleUpdateOperation,
    handleDeleteOperation,
    handleRestoreOperation
  };
}
