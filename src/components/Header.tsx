import React, { useState } from "react";
import { Menu, Settings, FilePlus, BarChart3, X, LogOut, Users, Bug, Calendar, Coins } from "lucide-react";

export function Header({ currentTab, onNavigate, onLogout }: { currentTab: "create" | "dashboard" | "profits" | "settings"; onNavigate: (tab: "create" | "dashboard" | "profits" | "settings") => void; onLogout: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 border-b border-neutral-100 flex justify-between items-center w-full px-4 lg:px-8 h-16 sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-3 relative">
        {/* Menu Icon toggles menu - Mobile Only */}
        <button className="lg:hidden p-2 rounded-lg hover:bg-neutral-100 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="w-5 h-5 text-neutral-600" /> : <Menu className="w-5 h-5 text-neutral-600" />}
        </button>

        {/* Desktop Horizontal Navigation */}
        <div className="hidden lg:flex items-center gap-1" dir="rtl">
          <button
            onClick={() => onNavigate("create")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              currentTab === "create" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <FilePlus className="w-3.5 h-3.5" />
            <span>تسجيل بيعة</span>
          </button>
          <button
            onClick={() => onNavigate("dashboard")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              currentTab === "dashboard" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>لوحة القيادة</span>
          </button>
          <button
            onClick={() => onNavigate("profits")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              currentTab === "profits" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <Coins className="w-3.5 h-3.5" />
            <span>الأرباح</span>
          </button>
          <button
            onClick={() => onNavigate("settings")}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all ${
              currentTab === "settings" ? "bg-neutral-950 text-white shadow-sm" : "text-neutral-500 hover:text-neutral-800 hover:bg-neutral-50"
            }`}
          >
            <Settings className="w-3.5 h-3.5" />
            <span>الإعدادات</span>
          </button>
          <button
            onClick={() => onLogout()}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black text-red-600 hover:bg-red-50 transition-all"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>تسجيل الخروج</span>
          </button>
        </div>

        {isMenuOpen && (
          <div className="absolute top-12 right-0 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 z-50 animate-fade-in lg:hidden">
            <button
              onClick={() => { onNavigate("create"); setIsMenuOpen(false); }}
              className={`flex w-full items-center gap-2 p-2 hover:bg-neutral-100 rounded-lg text-sm ${currentTab === 'create' ? 'text-neutral-900 font-bold bg-neutral-50' : 'text-neutral-700'}`}
            >
              <FilePlus className="w-4 h-4" /> تنفيذ عملية بيع
            </button>
            <button
              onClick={() => { onNavigate("dashboard"); setIsMenuOpen(false); }}
              className={`flex w-full items-center gap-2 p-2 hover:bg-neutral-100 rounded-lg text-sm ${currentTab === 'dashboard' ? 'text-neutral-900 font-bold bg-neutral-50' : 'text-neutral-700'}`}
            >
              <BarChart3 className="w-4 h-4" /> لوحة القيادة
            </button>
            <button
              onClick={() => { onNavigate("profits"); setIsMenuOpen(false); }}
              className={`flex w-full items-center gap-2 p-2 hover:bg-neutral-100 rounded-lg text-sm ${currentTab === 'profits' ? 'text-neutral-900 font-bold bg-neutral-50' : 'text-neutral-700'}`}
            >
              <Coins className="w-4 h-4" /> الأرباح
            </button>
            <hr className="my-1.5 border-neutral-100" />
            <button 
              onClick={() => { onNavigate("settings"); setIsMenuOpen(false); }}
              className={`flex w-full items-center gap-2 p-2 hover:bg-neutral-100 rounded-lg text-sm ${currentTab === 'settings' ? 'text-neutral-900 font-bold bg-neutral-50' : 'text-neutral-700'}`}
            >
              <Settings className="w-4 h-4" /> الإعدادات
            </button>
            <button 
              onClick={() => { onLogout(); setIsMenuOpen(false); }}
              className="flex w-full items-center gap-2 p-2 hover:bg-red-50 rounded-lg text-sm text-red-600 font-bold"
            >
              <LogOut className="w-4 h-4" /> تسجيل الخروج
            </button>
          </div>
        )}
      </div>

      {/* Corporate branding & instant status marker */}
      <div className="flex items-center gap-3">
        <div className="h-2 w-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.8)] animate-pulse"></div>
        <div className="flex flex-col items-end border-r border-neutral-100 pr-3">
          <span className="text-[9px] font-black tracking-widest text-neutral-450 uppercase leading-none">بوابة العمليات</span>
          <span className="text-xs font-black text-neutral-950 mt-1">SalesManager</span>
        </div>
      </div>
    </header>
  );
}
