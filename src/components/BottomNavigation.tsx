import React from "react";
import { PlusCircle, BarChart3, Coins, Settings as SettingsIcon } from "lucide-react";

interface BottomNavigationProps {
  activeTab: "create" | "dashboard" | "profits" | "settings";
  setActiveTab: (tab: "create" | "dashboard" | "profits" | "settings") => void;
}

export function BottomNavigation({ activeTab, setActiveTab }: BottomNavigationProps) {
  return (
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
  );
}
