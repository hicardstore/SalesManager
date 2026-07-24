import React from "react";
import { BarChart3, Calendar } from "lucide-react";
import FinanceDashboard from "./FinanceDashboard";
import MonthlyTimeline from "./MonthlyTimeline";
import { Operation, ProjectWorkspace } from "../types";

interface DashboardViewProps {
  dashboardSubTab: "overview" | "timeline";
  setDashboardSubTab: (tab: "overview" | "timeline") => void;
  operations: Operation[];
  deletedOperations: Operation[];
  opsLoading: boolean;
  activeProject: ProjectWorkspace | null;
  onNavigateToNew: () => void;
  onDeleteOperation: (id: string) => Promise<boolean>;
  onRestoreOperation: (id: string) => Promise<boolean>;
  onEditOperation: (op: Operation) => void;
}

export function DashboardView({
  dashboardSubTab,
  setDashboardSubTab,
  operations,
  deletedOperations,
  opsLoading,
  activeProject,
  onNavigateToNew,
  onDeleteOperation,
  onRestoreOperation,
  onEditOperation
}: DashboardViewProps) {
  return (
    <div className="space-y-6">
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
          isLoading={opsLoading}
          onNavigateToNew={onNavigateToNew}
          onDeleteOperation={onDeleteOperation}
          onRestoreOperation={onRestoreOperation}
          activeProject={activeProject}
          onEditOperation={onEditOperation}
        />
      ) : (
        <MonthlyTimeline 
          operations={operations}
          activeProject={activeProject}
        />
      )}
    </div>
  );
}
