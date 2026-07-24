import { useState, useEffect } from "react";

export function useAppTabs() {
  const [activeTab, setActiveTab] = useState<"create" | "dashboard" | "profits" | "settings">(
    () => {
      try {
        const saved = localStorage.getItem("active_tab");
        if (["create", "dashboard", "profits", "settings"].includes(saved || "")) {
          return saved as any;
        }
      } catch (e) {}
      return "dashboard";
    }
  );

  const [dashboardSubTab, setDashboardSubTab] = useState<"overview" | "timeline">(
    () => {
      try {
        const saved = localStorage.getItem("dashboard_sub_tab");
        if (["overview", "timeline"].includes(saved || "")) {
          return saved as any;
        }
      } catch (e) {}
      return "overview";
    }
  );

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

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
  }, [activeTab]);

  return { activeTab, setActiveTab, dashboardSubTab, setDashboardSubTab };
}
