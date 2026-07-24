import React from "react";

export function LoadingScreen() {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center space-y-4">
      <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 animate-spin rounded-full" />
      <p className="text-xs font-bold text-neutral-400">جاري الاتصال بالنظام السحابي ومزامنة مساحة العمل...</p>
    </div>
  );
}

export function WorkspaceErrorScreen({ error, onLogout }: { error: string; onLogout: () => void }) {
  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col items-center justify-center p-4" dir="rtl">
      <div className="bg-red-50 text-red-700 p-6 rounded-2xl max-w-md w-full border border-red-100 text-center space-y-4 shadow-sm">
        <h2 className="text-xl font-bold">خطأ في مساحة العمل</h2>
        <p className="text-sm">{error}</p>
        <button 
          onClick={onLogout}
          className="px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors cursor-pointer"
        >
          تسجيل الخروج
        </button>
      </div>
    </div>
  );
}
