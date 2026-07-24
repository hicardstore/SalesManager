import React, { useState } from "react";
import { Operation } from "./types";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AuthScreens } from "./components/AuthScreens";
import { LoadingScreen, WorkspaceErrorScreen } from "./components/StatusScreens";
import { MainLayout } from "./components/MainLayout";

import { useAppTabs } from "./hooks/useAppTabs";
import { useWorkspace } from "./hooks/useWorkspace";
import { useOperations } from "./hooks/useOperations";
import { useDevices } from "./hooks/useDevices";

function MainApp() {
  const { user, logout, loading: authLoading } = useAuth();
  const { activeTab, setActiveTab, dashboardSubTab, setDashboardSubTab } = useAppTabs();

  // Data & Workspace Hooks
  const { activeProject, isLoadingProject, workspaceError, setWorkspaceError } = useWorkspace(user);
  const {
    operations,
    deletedOperations,
    loading: opsLoading,
    handleAddOperation,
    handleUpdateOperation,
    handleDeleteOperation,
    handleRestoreOperation
  } = useOperations(user, activeProject);

  const { devices, handleDeleteDevice } = useDevices(user, logout);

  // Local UI State
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [editingOperation, setEditingOperation] = useState<Operation | null>(null);

  const isRealCloudUser = user && !user.id.startsWith("local_") && user.id !== "offline_guest_user_id";

  if ((authLoading && !user) || (isRealCloudUser && isLoadingProject && !activeProject)) {
    return <LoadingScreen />;
  }

  if (!user) {
    return <AuthScreens />;
  }

  if (workspaceError) {
    return (
      <WorkspaceErrorScreen 
        error={workspaceError} 
        onLogout={() => {
          setWorkspaceError(null);
          logout();
        }} 
      />
    );
  }

  return (
    <MainLayout
      activeTab={activeTab}
      setActiveTab={setActiveTab}
      dashboardSubTab={dashboardSubTab}
      setDashboardSubTab={setDashboardSubTab}
      activeProject={activeProject}
      operations={operations}
      deletedOperations={deletedOperations}
      opsLoading={opsLoading}
      isLoadingProject={isLoadingProject}
      handleAddOperation={handleAddOperation}
      handleUpdateOperation={handleUpdateOperation}
      handleDeleteOperation={handleDeleteOperation}
      handleRestoreOperation={handleRestoreOperation}
      devices={devices}
      handleDeleteDevice={handleDeleteDevice}
      editingOperation={editingOperation}
      setEditingOperation={setEditingOperation}
      showLogoutConfirm={showLogoutConfirm}
      setShowLogoutConfirm={setShowLogoutConfirm}
      logout={logout}
    />
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
