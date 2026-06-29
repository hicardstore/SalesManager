import React, { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { ProjectWorkspace } from "../types";
import firebaseConfig from "../../firebase-applet-config.json";
import { collection, getDocs, query, limit } from "firebase/firestore";
import { db } from "../firebase";

interface DebugPageProps {
  activeProject: ProjectWorkspace | null;
}

interface ProjectDebugInfo {
  id: string;
  data: any;
  operationsCount: number;
  topOperations: string[];
}

export function DebugPage({ activeProject }: DebugPageProps) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<ProjectDebugInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchDebugData() {
      if (!user) {
        setLoading(false);
        return;
      }
      
      try {
        setLoading(true);
        const projectsRef = collection(db, "projects");
        const snapshot = await getDocs(projectsRef);
        
        const projectsData: ProjectDebugInfo[] = [];
        
        for (const docSnap of snapshot.docs) {
          const data = docSnap.data();
          const pId = docSnap.id;
          
          // fetch operations
          const opsRef = collection(db, "projects", pId, "operations");
          const opsSnap = await getDocs(opsRef); // To get count
          
          const q = query(opsRef, limit(5));
          const topOpsSnap = await getDocs(q);
          
          projectsData.push({
            id: pId,
            data,
            operationsCount: opsSnap.size,
            topOperations: topOpsSnap.docs.map(d => d.id)
          });
        }
        
        setProjects(projectsData);
      } catch (err: any) {
        console.error("Debug fetch error:", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchDebugData();
  }, [user]);

  // Compute warnings
  const emailsToProjects = new Map<string, string[]>();
  projects.forEach(p => {
    const email = p.data.ownerEmail || (p.data.memberEmails && p.data.memberEmails[0]); 
    if (email) {
      if (!emailsToProjects.has(email)) emailsToProjects.set(email, []);
      emailsToProjects.get(email)!.push(p.id);
    }
  });
  
  const multipleProjectsWarning = Array.from(emailsToProjects.entries())
    .filter(([_, pIds]) => pIds.length > 1)
    .map(([email, pIds]) => `User with email ${email} has multiple projects: ${pIds.join(', ')}`);

  const activeProjectMatches = projects.find(p => p.id === activeProject?.id);
  const activeProjectMissingReason = !activeProjectMatches 
    ? (activeProject ? `Workspace ID ${activeProject.id} was not found in the database. It might be local-only or was deleted.` : "No active workspace currently set in local state.")
    : null;

  const dbConnectionInfo = {
    projectId: firebaseConfig.projectId,
    databaseId: (firebaseConfig as any).firestoreDatabaseId || "(default)",
    appId: firebaseConfig.appId,
    dbInstanceName: db.app.name
  };

  return (
    <div className="p-6 bg-white rounded-2xl shadow-sm border border-neutral-100 max-w-4xl mx-auto space-y-6" dir="ltr">
      <h2 className="text-xl font-bold font-sans text-neutral-900 tracking-tight border-b pb-4 text-right">
        تقرير فحص قاعدة البيانات (Database Diagnostics)
      </h2>
      
      {/* Verification Test */}
      <section className="space-y-3 bg-emerald-50 p-5 rounded-2xl border border-emerald-200">
        <h3 className="text-lg font-black text-emerald-800 text-right">نتائج اختبار التحقق (Verification Test Logs)</h3>
        
        <p className="text-sm text-emerald-900 text-right leading-relaxed">
          يقوم هذا الجزء بمقارنة قيم مساحة العمل والعمليات قبل تسجيل الخروج وبعد تسجيل الدخول مرة أخرى للتحقق من المزامنة وضمان عدم تكرار مساحات العمل.
        </p>

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-left" dir="ltr">
          <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-2">
            <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider">Workspace ID Verification</h4>
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 font-medium">Before Logout:</span>
                <span className="font-mono text-neutral-800 font-semibold">{localStorage.getItem("test_workspace_before_logout") || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 font-medium">After Login:</span>
                <span className="font-mono text-neutral-800 font-semibold">{activeProject?.id || "N/A"}</span>
              </div>
              <div className="pt-2 border-t border-dashed border-neutral-100 flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Status:</span>
                {localStorage.getItem("test_workspace_before_logout") ? (
                  localStorage.getItem("test_workspace_before_logout") === activeProject?.id ? (
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">PASSED ✓ (Matched)</span>
                  ) : (
                    <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">FAILED ✗ (Mismatched)</span>
                  )
                ) : (
                  <span className="text-neutral-400 italic">Sign out and in again to trigger</span>
                )}
              </div>
            </div>
          </div>

          <div className="bg-white p-4 rounded-xl border border-emerald-100 space-y-2">
            <h4 className="font-bold text-xs text-neutral-500 uppercase tracking-wider">Operation Count Verification</h4>
            <div className="flex flex-col space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 font-medium">Before Logout:</span>
                <span className="font-mono text-neutral-800 font-semibold">{localStorage.getItem("test_ops_count_before_logout") || "N/A"}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-neutral-600 font-medium">After Login:</span>
                <span className="font-mono text-neutral-800 font-semibold">
                  {activeProjectMatches ? activeProjectMatches.operationsCount : "N/A"}
                </span>
              </div>
              <div className="pt-2 border-t border-dashed border-neutral-100 flex justify-between items-center text-xs">
                <span className="text-neutral-500 font-medium">Status:</span>
                {localStorage.getItem("test_ops_count_before_logout") ? (
                  parseInt(localStorage.getItem("test_ops_count_before_logout") || "0", 10) === (activeProjectMatches?.operationsCount || 0) ? (
                    <span className="bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded">PASSED ✓ (Matched)</span>
                  ) : (
                    <span className="bg-red-100 text-red-800 font-bold px-2 py-0.5 rounded">FAILED ✗ (Mismatched)</span>
                  )
                ) : (
                  <span className="text-neutral-400 italic">Sign out and in again to trigger</span>
                )}
              </div>
            </div>
          </div>
        </div>

        {localStorage.getItem("test_workspace_before_logout") && 
         localStorage.getItem("test_workspace_before_logout") === activeProject?.id && 
         parseInt(localStorage.getItem("test_ops_count_before_logout") || "0", 10) === (activeProjectMatches?.operationsCount || 0) ? (
          <div className="mt-4 p-3 bg-emerald-100 border border-emerald-300 rounded-xl text-emerald-950 text-xs font-black text-center">
            🎉 تم اجتياز جميع اختبارات التحقق بنجاح! القيم متطابقة تماماً ومسجلة في السجل.
          </div>
        ) : localStorage.getItem("test_workspace_before_logout") ? (
          <div className="mt-4 p-3 bg-red-100 border border-red-300 rounded-xl text-red-950 text-xs font-black text-center">
            ⚠️ الاختبار لم يكتمل بنجاح أو هناك اختلاف في القيم. يرجى مراجعة التفاصيل أعلاه.
          </div>
        ) : null}
      </section>

      {/* 8. Firestore Connection Info */}
      <section className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-800 text-right">بيانات الاتصال بـ Firestore</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div><span className="font-semibold text-xs text-neutral-600 block">Project ID:</span><p className="font-mono text-sm break-all">{dbConnectionInfo.projectId}</p></div>
          <div><span className="font-semibold text-xs text-neutral-600 block">Database ID:</span><p className="font-mono text-sm break-all">{dbConnectionInfo.databaseId}</p></div>
          <div><span className="font-semibold text-xs text-neutral-600 block">App ID:</span><p className="font-mono text-sm break-all">{dbConnectionInfo.appId}</p></div>
          <div><span className="font-semibold text-xs text-neutral-600 block">DB Instance Name:</span><p className="font-mono text-sm break-all">{dbConnectionInfo.dbInstanceName}</p></div>
        </div>
      </section>

      {/* Basic User Info */}
      <section className="space-y-3 bg-neutral-50 p-4 rounded-xl border border-neutral-200">
        <h3 className="text-lg font-semibold text-neutral-800 text-right">المستخدم الحالي (Current User)</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-left">
          <div><span className="font-semibold text-xs text-neutral-600 block">User UID:</span><p className="font-mono text-sm break-all">{user?.id || "N/A"}</p></div>
          <div><span className="font-semibold text-xs text-neutral-600 block">User Email:</span><p className="font-mono text-sm break-all">{user?.email || "N/A"}</p></div>
          <div className="sm:col-span-2"><span className="font-semibold text-xs text-neutral-600 block">Local Workspace ID:</span><p className="font-mono text-sm break-all">{activeProject?.id || "N/A"}</p></div>
        </div>
      </section>

      {loading ? (
        <div className="text-center py-10 animate-pulse text-neutral-500">جاري جلب البيانات من Firestore...</div>
      ) : error ? (
        <div className="bg-red-50 text-red-700 p-4 rounded-xl border border-red-200 text-right">
          <p className="font-bold">خطأ أثناء جلب البيانات:</p>
          <p className="font-mono text-sm mt-1 text-left" dir="ltr">{error}</p>
        </div>
      ) : (
        <>
          {/* Warnings */}
          {(multipleProjectsWarning.length > 0 || activeProjectMissingReason) && (
            <section className="space-y-3 bg-amber-50 p-4 rounded-xl border border-amber-200 text-right">
              <h3 className="text-lg font-semibold text-amber-800">تحذيرات (Warnings)</h3>
              <ul className="list-disc list-inside text-sm text-amber-900 space-y-1 text-left" dir="ltr">
                {multipleProjectsWarning.map((w, i) => <li key={i}>{w}</li>)}
                {activeProjectMissingReason && <li>{activeProjectMissingReason}</li>}
              </ul>
            </section>
          )}

          {/* 7. If query result is empty */}
          {projects.length === 0 && (
            <section className="space-y-3 bg-blue-50 p-4 rounded-xl border border-blue-200 text-right">
              <h3 className="text-lg font-semibold text-blue-800">لم يتم العثور على أي مشاريع (Empty Collection)</h3>
              <div className="space-y-2 text-sm text-blue-900">
                <p><strong>البريد الإلكتروني المستخدم في الاستعلام:</strong> <span className="font-mono" dir="ltr">{user?.email}</span></p>
                <p><strong>نص الاستعلام (تقريبي):</strong> <code dir="ltr">collection(db, "projects")</code></p>
                <p><strong>عدد المشاريع في القاعدة:</strong> 0</p>
                <p><strong>سبب إنشاء Project جديد محتمل:</strong> بسبب عدم وجود أي مشروع للمستخدم، يقوم الكود (أو يفترض به) إنشاء مشروع جديد (Fallback).</p>
              </div>
            </section>
          )}

          {/* All Projects */}
          {projects.length > 0 && (
            <section className="space-y-4 text-left" dir="ltr">
              <h3 className="text-lg font-semibold text-neutral-800 border-b pb-2 text-right">جميع المشاريع في القاعدة ({projects.length})</h3>
              
              <div className="space-y-4">
                {projects.map(p => (
                  <div key={p.id} className="border border-neutral-200 rounded-xl p-4 bg-white shadow-sm space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="font-mono font-bold text-indigo-700 break-all">ID: {p.id}</div>
                      {activeProject?.id === p.id && (
                        <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-md font-bold shrink-0 ml-2">Workspace الحالي</span>
                      )}
                    </div>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                      <div><span className="text-neutral-500 font-semibold">ownerId:</span> <span className="font-mono">{p.data.ownerId || "N/A"}</span></div>
                      <div><span className="text-neutral-500 font-semibold">ownerEmail:</span> <span className="font-mono">{p.data.ownerEmail || "N/A"}</span></div>
                      <div className="sm:col-span-2 break-all">
                        <span className="text-neutral-500 font-semibold block mb-1">memberEmails:</span> 
                        <span className="font-mono">{p.data.memberEmails ? JSON.stringify(p.data.memberEmails) : "N/A"}</span>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-neutral-500 font-semibold block mb-1">members:</span> 
                        <pre className="font-mono bg-neutral-50 p-2 rounded text-xs overflow-x-auto border border-neutral-200">
                          {p.data.members ? JSON.stringify(p.data.members, null, 2) : "N/A"}
                        </pre>
                      </div>
                      <div className="sm:col-span-2">
                        <span className="text-neutral-500 font-semibold">createdAt:</span> 
                        <span className="font-mono ml-2">
                          {p.data.createdAt?.toDate ? p.data.createdAt.toDate().toString() : JSON.stringify(p.data.createdAt)}
                        </span>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-neutral-100">
                      <h4 className="font-semibold text-neutral-700 text-sm mb-2">Subcollection: operations</h4>
                      <div className="text-sm">
                        <span className="text-neutral-500">Total Count:</span> <span className="font-bold">{p.operationsCount}</span>
                      </div>
                      {p.topOperations.length > 0 && (
                        <div className="text-sm mt-1">
                          <span className="text-neutral-500 block mb-1">First 5 Docs:</span>
                          <ul className="list-disc list-inside font-mono text-xs space-y-1 bg-neutral-50 p-2 rounded border border-neutral-200">
                            {p.topOperations.map(opId => (
                              <li key={opId}>{opId}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}

