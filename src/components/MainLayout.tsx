import React from "react";
import { Operation, ProjectWorkspace } from "../types";
import { Header } from "./Header";
import OperationForm from "./OperationForm";
import { DashboardView } from "./DashboardView";
import { ProfitsDashboard } from "./ProfitsDashboard";
import { Settings } from "./Settings";
import { LogoutModal } from "./LogoutModal";
import { BottomNavigation } from "./BottomNavigation";

interface MainLayoutProps {
  activeTab: "create" | "dashboard" | "profits" | "settings";
  setActiveTab: (tab: "create" | "dashboard" | "profits" | "settings") => void;
  dashboardSubTab: "overview" | "timeline";
  setDashboardSubTab: (tab: "overview" | "timeline") => void;
  activeProject: ProjectWorkspace | null;
  operations: Operation[];
  deletedOperations: Operation[];
  opsLoading: boolean;
  isLoadingProject: boolean;
  handleAddOperation: (payload: any) => Promise<boolean>;
  handleUpdateOperation: (id: string, payload: any) => Promise<boolean>;
  handleDeleteOperation: (id: string) => Promise<boolean>;
  handleRestoreOperation: (id: string) => Promise<boolean>;
  devices: any[];
  handleDeleteDevice: (id: string) => Promise<void>;
  editingOperation: Operation | null;
  setEditingOperation: (op: Operation | null) => void;
  showLogoutConfirm: boolean;
  setShowLogoutConfirm: (show: boolean) => void;
  logout: () => void;
}

export function MainLayout({
  activeTab,
  setActiveTab,
  dashboardSubTab,
  setDashboardSubTab,
  activeProject,
  operations,
  deletedOperations,
  opsLoading,
  isLoadingProject,
  handleAddOperation,
  handleUpdateOperation,
  handleDeleteOperation,
  handleRestoreOperation,
  devices,
  handleDeleteDevice,
  editingOperation,
  setEditingOperation,
  showLogoutConfirm,
  setShowLogoutConfirm,
  logout
}: MainLayoutProps) {
  return (
    <div dir="rtl" className="min-h-screen bg-[#fafafa] text-neutral-900 pb-28 font-sans">
      <Header 
        currentTab={activeTab} 
        onNavigate={(tab) => {
          if (tab !== "create") setEditingOperation(null);
          setActiveTab(tab);
        }} 
        onLogout={() => setShowLogoutConfirm(true)} 
        isSyncing={isLoadingProject || opsLoading}
      />

      <main className="px-4 lg:px-8 py-8 max-w-5xl lg:max-w-7xl mx-auto">
        <div className="relative font-sans">
          
          <div className={activeTab === "create" ? "block" : "hidden"}>
            <OperationForm 
              onAddOperation={handleAddOperation}
              onNavigateToDashboard={() => {
                setEditingOperation(null);
                setActiveTab("dashboard");
              }}
              activeProject={activeProject}
              editingOperation={editingOperation}
              onUpdateOperation={handleUpdateOperation}
              onCancelEdit={() => {
                setEditingOperation(null);
                setActiveTab("dashboard");
              }}
            />
          </div>
          
          <div className={activeTab === "dashboard" ? "block" : "hidden"}>
            <DashboardView 
              dashboardSubTab={dashboardSubTab}
              setDashboardSubTab={setDashboardSubTab}
              operations={operations}
              deletedOperations={deletedOperations}
              opsLoading={opsLoading}
              activeProject={activeProject}
              onNavigateToNew={() => {
                setEditingOperation(null);
                setActiveTab("create");
              }}
              onDeleteOperation={handleDeleteOperation}
              onRestoreOperation={handleRestoreOperation}
              onEditOperation={(op) => {
                setEditingOperation(op);
                setActiveTab("create");
              }}
            />
          </div>

          <div className={activeTab === "profits" ? "block" : "hidden"}>
            <ProfitsDashboard 
              operations={operations} 
              activeProject={activeProject}
            />
          </div>

          <div className={activeTab === "settings" ? "block" : "hidden"}>
            <Settings 
              onLogoutReq={() => setShowLogoutConfirm(true)} 
              activeProject={activeProject}
              devices={devices}
              onDeleteDevice={handleDeleteDevice}
            />
          </div>

        </div>
      </main>

      <LogoutModal 
        isOpen={showLogoutConfirm} 
        onClose={() => setShowLogoutConfirm(false)} 
        onConfirm={() => {
          logout();
          setShowLogoutConfirm(false);
        }} 
      />

      <BottomNavigation activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
