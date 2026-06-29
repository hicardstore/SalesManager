import React, { useState } from "react";
import { Menu, Settings, FilePlus, BarChart3, X, LogOut, Users, Bug } from "lucide-react";

export function Header({ currentTab, onNavigate, onLogout }: { currentTab: "create" | "dashboard" | "settings" | "debug"; onNavigate: (tab: "create" | "dashboard" | "settings" | "debug") => void; onLogout: () => void }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    <header className="bg-white/80 border-b border-neutral-100 flex justify-between items-center w-full px-4 lg:px-8 h-16 sticky top-0 z-40 backdrop-blur-md">
      <div className="flex items-center gap-3 relative">
        {/* Menu Icon toggles menu */}
        <button className="p-2 rounded-lg hover:bg-neutral-100 transition-colors" onClick={() => setIsMenuOpen(!isMenuOpen)}>
          {isMenuOpen ? <X className="w-5 h-5 text-neutral-600" /> : <Menu className="w-5 h-5 text-neutral-600" />}
        </button>

        {isMenuOpen && (
          <div className="absolute top-12 right-0 w-52 bg-white border border-neutral-200 rounded-xl shadow-xl p-2 z-50 animate-fade-in">
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
            <hr className="my-1.5 border-neutral-100" />
            <button 
              onClick={() => { onNavigate("settings"); setIsMenuOpen(false); }}
              className={`flex w-full items-center gap-2 p-2 hover:bg-neutral-100 rounded-lg text-sm ${currentTab === 'settings' ? 'text-neutral-900 font-bold bg-neutral-50' : 'text-neutral-700'}`}
            >
              <Settings className="w-4 h-4" /> الإعدادات
            </button>
            <button 
              onClick={() => { onNavigate("debug"); setIsMenuOpen(false); }}
              className={`flex w-full items-center gap-2 p-2 hover:bg-neutral-100 rounded-lg text-sm ${currentTab === 'debug' ? 'text-neutral-900 font-bold bg-neutral-50' : 'text-neutral-700'}`}
            >
              <Bug className="w-4 h-4" /> فحص النظام
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
