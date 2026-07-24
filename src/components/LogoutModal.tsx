import React, { useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { LogOut } from "lucide-react";

interface LogoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function LogoutModal({ isOpen, onClose, onConfirm }: LogoutModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ scale: 0.95, opacity: 0, y: 10 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.95, opacity: 0, y: 10 }}
            className="relative bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl border border-neutral-100 overflow-hidden text-center z-10"
          >
            <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mb-4 mx-auto text-red-500">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-black text-neutral-950 tracking-tight mb-2">تأكيد الخروج</h3>
            <p className="text-sm text-neutral-500 font-medium mb-8">هل أنت متأكد من رغبتك في تسجيل الخروج من الحساب الحالي؟</p>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={onClose}
                className="bg-neutral-100 text-neutral-800 hover:bg-neutral-200 transition-colors py-3.5 rounded-xl font-bold text-sm cursor-pointer"
              >
                تراجع
              </button>
              <button
                onClick={onConfirm}
                className="bg-red-600 text-white hover:bg-red-700 transition-colors py-3.5 rounded-xl font-bold text-sm cursor-pointer"
              >
                تأكيد الخروج
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
