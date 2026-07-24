import { useState, useEffect } from "react";
import { User } from "../types";
import { ProjectWorkspace } from "../types";
import { db } from "../firebase";
import { collection, query, where, getDocs, setDoc, doc, onSnapshot } from "firebase/firestore";

export function useWorkspace(user: User | null) {
  // Load initial cached workspace project synchronously
  const [activeProject, setActiveProject] = useState<ProjectWorkspace | null>(() => {
    if (user) {
      try {
        const cachedProj = localStorage.getItem(`cached_project_${user.id}`);
        return cachedProj ? JSON.parse(cachedProj) : null;
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  const [isLoadingProject, setIsLoadingProject] = useState(true);
  const [workspaceError, setWorkspaceError] = useState<string | null>(null);

  // Load cached project immediately when user updates
  useEffect(() => {
    if (user) {
      try {
        const cachedProj = localStorage.getItem(`cached_project_${user.id}`);
        if (cachedProj) {
          setActiveProject(JSON.parse(cachedProj));
        }
      } catch (e) {
        console.error("Failed to load cached project:", e);
      }
    }
  }, [user]);

  // Resolve Active Shared Workspace Project dynamically from Firestore
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

        // Step B: If not found, try fallback (legacy lookup by memberEmails)
        if (snapshot.empty) {
          const userEmailNormalized = user.email?.toLowerCase().trim() || "";
          if (userEmailNormalized) {
            const emailQ = query(projectsRef, where("memberEmails", "array-contains", userEmailNormalized));
            snapshot = await getDocs(emailQ);

            if (!snapshot.empty) {
              let bestDoc = snapshot.docs[0];
              for (const docSnap of snapshot.docs) {
                if (docSnap.data().ownerEmail === userEmailNormalized) {
                  bestDoc = docSnap;
                  break;
                }
              }
              await setDoc(doc(db, "projects", bestDoc.id), { ownerId: user.id }, { merge: true });
              q = query(projectsRef, where("ownerId", "==", user.id));
            }
          }
        }

        // Step C: Subscribe to the resolved query
        unsubscribe = onSnapshot(q, async (snap) => {
          if (!snap.empty) {
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
            // Auto-create workspace if missing
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
            } catch (e) {
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

  return { activeProject, isLoadingProject, workspaceError, setWorkspaceError };
}
