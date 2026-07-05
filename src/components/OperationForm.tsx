import React, { useState } from "react";
import { createPortal } from "react-dom";
import { InstallmentProvider, PREDEFINED_GROUPS, PredefinedGroup } from "../types";
import { calculateOperationBreakdown } from "../utils/financeMath";
import { motion, AnimatePresence } from "motion/react";
import { 
  CreditCard, 
  Sparkles, 
  DollarSign, 
  CheckCircle, 
  ArrowRight, 
  Layers, 
  Sliders, 
  Banknote, 
  Loader2,
  Search,
  Info,
  Percent,
  Plus,
  Minus,
  Check,
  ShieldCheck,
  HelpCircle,
  TrendingUp,
  Coins,
  Calendar
} from "lucide-react";

interface OperationFormProps {
  onAddOperation: (payload: any) => Promise<boolean>;
  onNavigateToDashboard: () => void;
}

export default function OperationForm({ onAddOperation, onNavigateToDashboard }: OperationFormProps) {
  // 1. Provider State
  const [provider, setProvider] = useState<InstallmentProvider>("إمكان");

  // 2. Group State
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [groupSearchQuery, setGroupSearchQuery] = useState<string>("");
  const [groupFilterTab, setGroupFilterTab] = useState<"all" | "major" | "minor">("all");
  const [customPackageAmount, setCustomPackageAmount] = useState<string>("");
  const [customTotalInstallmentAmount, setCustomTotalInstallmentAmount] = useState<string>("");

  // 3. Down Payment State
  const [downPayment, setDownPayment] = useState<string>("");
  const [commissionFee, setCommissionFee] = useState<string>("");

  // 4. Date State (Mandatory)
  const [operationDate, setOperationDate] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successAnimation, setSuccessAnimation] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Prevent background scrolling when successAnimation is open
  React.useEffect(() => {
    if (successAnimation) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [successAnimation]);

  const selectedGroup = PREDEFINED_GROUPS.find(g => g.id === selectedGroupId);

  // Compute values reactively
  const packageAmount = selectedGroupId === "custom"
    ? Math.max(0, parseFloat(customPackageAmount) || 0)
    : (selectedGroup ? selectedGroup.packageAmount : 0);

  const totalInstallmentAmount = selectedGroupId === "custom"
    ? Math.max(0, parseFloat(customTotalInstallmentAmount) || 0)
    : (selectedGroup ? selectedGroup.totalInstallmentAmount : 0);

  const parsedDownPayment = Math.max(0, parseFloat(downPayment) || 0);
  const parsedCommissionFee = Math.max(0, parseFloat(commissionFee) || 0);
  
  const breakdown = calculateOperationBreakdown({
    packageAmount,
    totalInstallmentAmount,
    downPayment: parsedDownPayment,
    commissionFee: parsedCommissionFee,
    provider,
    durationMonths: 12,
  });

  const netTransferToClient = breakdown.netTransferToClient;
  const durationMonths = 12;
  const monthlyInstallment = breakdown.monthlyInstallment;
  
  // Calculations for the breakdown
  const providerFee = breakdown.providerFee;
  const netProfit = breakdown.profitWithDownPayment;

  // Handle group change with downpayment safety clamping
  const handleGroupChange = (id: string) => {
    setSelectedGroupId(id);
    const selected = PREDEFINED_GROUPS.find(g => g.id === id);
    if (selected) {
      // If the new group's total is smaller than current downpayment, clamp it or reset to 0
      if (parseFloat(downPayment) > selected.totalInstallmentAmount) {
        setDownPayment("");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!selectedGroupId) {
      setErrorMessage("يرجى اختيار مجموعة تجارية من القائمة أولاً لإتمام التسجيل المالي.");
      return;
    }

    if (selectedGroupId === "custom") {
      if (packageAmount <= 0) {
        setErrorMessage("يرجى إدخال مبلغ كاش صحيح أكبر من الصفر.");
        return;
      }
      if (totalInstallmentAmount <= 0) {
        setErrorMessage("يرجى إدخال إجمالي تقسيط صحيح أكبر من الصفر.");
        return;
      }
      if (packageAmount > totalInstallmentAmount) {
        setErrorMessage("صافي تمويل العميل (الكاش) لا يمكن أن يتجاوز إجمالي تمويل العميل.");
        return;
      }
    }

    if (parsedDownPayment > totalInstallmentAmount) {
      setErrorMessage("قيمة الدفعة الأولى لا يمكن أن تتجاوز القيمة الإجمالية للتقسيط.");
      return;
    }

    if (!operationDate) {
      setErrorMessage("يرجى تحديد تاريخ العملية لإتمام التسجيل المالي.");
      return;
    }

    setIsSubmitting(true);

    const groupLabel = selectedGroupId === "custom"
      ? `مخصصة (${packageAmount.toLocaleString()} ر.س)`
      : (selectedGroup ? selectedGroup.label : "مجموعة غير معروفة");

    const payload = {
      clientId: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: `عملية مبيعات ${groupLabel}`,
      date: operationDate,
      packageAmount,
      downPayment: parsedDownPayment,
      commissionFee: parsedCommissionFee,
      provider,
      status: "مكتمل",
      totalInstallmentAmount,
      monthlyInstallment
    };

    try {
      const success = await onAddOperation(payload);
      if (success) {
        setSuccessAnimation(true);
        setTimeout(() => {
          setSuccessAnimation(false);
          onNavigateToDashboard();
          // Reset form to default values for next transaction
          setSelectedGroupId(PREDEFINED_GROUPS[0]?.id || "3000");
          setDownPayment("");
          setCommissionFee("");
          setCustomPackageAmount("");
          setCustomTotalInstallmentAmount("");
          setOperationDate("");
        }, 500); 
      } else {
        setErrorMessage("فشل في إكمال وتسجيل العملية. يرجى التحقق من الخادم.");
      }
    } catch (err: any) {
      setErrorMessage(err?.message || "حدث خطأ ما أثناء حفظ البيانات.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter predefined groups based on search and tab
  const filteredGroupsList = PREDEFINED_GROUPS.filter(g => {
    // Tab filter
    let matchesTab = true;
    if (groupFilterTab === "major") matchesTab = g.packageAmount >= 3000;
    else if (groupFilterTab === "minor") matchesTab = g.packageAmount < 3000;

    // Search query matching
    const query = groupSearchQuery.trim().toLowerCase();
    const matchesSearch = query === "" || 
      g.label.toLowerCase().includes(query) || 
      g.packageAmount.toString().includes(query) ||
      g.totalInstallmentAmount.toString().includes(query);

    return matchesTab && matchesSearch;
  });

  // Calculate profit margin percentage for the visual gauge
  const profitMarginPercent = totalInstallmentAmount > 0 
    ? Math.max(0, Math.min(100, Math.round((netProfit / totalInstallmentAmount) * 100))) 
    : 0;

  // Presets handlers
  const handleApplyDownPaymentPreset = (value: number, isPercent = false) => {
    if (packageAmount <= 0) return;
    if (isPercent) {
      const calculated = Math.round(packageAmount * (value / 100));
      setDownPayment(calculated.toString());
    } else {
      setDownPayment(value.toString());
    }
  };

  const handleApplyCommissionPreset = (value: number) => {
    setCommissionFee(value.toString());
  };

  // Safe manual adjustments
  const adjustDownPayment = (amount: number) => {
    const current = parseFloat(downPayment) || 0;
    const next = Math.max(0, current + amount);
    if (next <= totalInstallmentAmount) {
      setDownPayment(next.toString());
    }
  };

  const adjustCommission = (amount: number) => {
    const current = parseFloat(commissionFee) || 0;
    const next = Math.max(0, current + amount);
    setCommissionFee(next.toString());
  };

  return (
    <div className="max-w-2xl lg:max-w-6xl mx-auto relative min-h-[600px] pb-12" id="operation-form-component" dir="rtl">
      
      {/* Success Animation Overlay - Highly polished */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {successAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#fafafa]/95 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.4, rotate: -25, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 15, stiffness: 180 }}
                className="w-24 h-24 bg-neutral-950 rounded-[2.2rem] flex items-center justify-center text-white mb-8 shadow-2xl relative border border-white/10"
              >
                <div className="absolute inset-0 bg-emerald-500/10 rounded-[2.2rem] animate-pulse" />
                <CheckCircle className="w-12 h-12 text-emerald-400 relative z-10" />
              </motion.div>
              <h3 className="text-2xl font-black text-neutral-950 font-sans tracking-tight">تم قيد وتسجيل العملية ماليًا!</h3>
              <p className="text-sm text-neutral-500 mt-3 font-medium max-w-[280px] leading-relaxed">
                جرى إدراج الصفقة بنجاح، وتحديث شاشات الأداء والخط الزمني والمؤشرات الكلية لمشروعك.
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* Decorative Top Banner Terminal Card */}
      <div className="bg-neutral-950 text-white rounded-3xl p-6 mb-6 relative overflow-hidden border border-white/5 shadow-xl">
        <div className="absolute -right-16 -top-16 w-48 h-48 bg-neutral-800 rounded-full blur-2xl opacity-40 pointer-events-none" />
        <div className="absolute left-6 top-6 flex items-center gap-1.5 bg-neutral-850 px-2.5 py-1 rounded-full border border-white/10 text-[9.5px] font-mono text-neutral-300">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>تشفير آمن للعملية</span>
        </div>
        <div className="space-y-1 relative z-10">
          <span className="text-[10px] bg-white/10 text-neutral-300 px-2 py-0.5 rounded-md font-bold inline-block mb-1">لوحة المدفوعات التفاعلية</span>
          <h2 className="text-xl font-black font-sans tracking-tight">تسجيل عملية بيع جديدة</h2>
          <p className="text-xs text-neutral-400 max-w-[380px] leading-relaxed">
            قم بتوثيق عقود مبيعات التقسيط وحساب صافي أرباحك وتتبع الحصص المالية بشكل دقيق ولحظي.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6 lg:space-y-0 lg:grid lg:grid-cols-12 lg:gap-8 lg:items-start">
        {errorMessage && (
          <div className="lg:col-span-12 p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 font-bold flex items-center gap-2">
            <span className="w-2 h-2 bg-red-600 rounded-full animate-ping"></span>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Form Inputs Column: Taking 7 columns out of 12 on desktop */}
        <div className="space-y-6 lg:col-span-7">

          {/* Step 1: Installment Provider Selector - Fully Branded */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-[10.5px] font-black">١</span>
              <h3 className="text-xs font-black text-neutral-900">بوابة التمويل والتقسيط</h3>
            </div>
            <span className="text-[10px] text-neutral-400 font-bold">بوابات التقسيط المعتمدة بالمشروع</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["إمكان", "تابي", "تمارا"] as InstallmentProvider[]).map((prov) => {
              const isSelected = provider === prov;
              
              // Get individual brand identity colors
              let brandColorClass = "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-300";
              let activeIndicator = null;

              if (isSelected) {
                if (prov === "تابي") {
                  brandColorClass = "border-neutral-950 bg-neutral-950 text-white ring-2 ring-[#05ffd2]/30 shadow-md shadow-neutral-950/10 scale-[1.01]";
                  activeIndicator = <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-[#05ffd2]" />;
                } else if (prov === "تمارا") {
                  brandColorClass = "border-neutral-950 bg-neutral-950 text-white ring-2 ring-amber-500/20 shadow-md shadow-neutral-950/10 scale-[1.01]";
                  activeIndicator = <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-amber-500" />;
                } else {
                  brandColorClass = "border-neutral-950 bg-neutral-950 text-white ring-2 ring-blue-500/20 shadow-md shadow-neutral-950/10 scale-[1.01]";
                  activeIndicator = <span className="absolute top-2 left-2 w-1.5 h-1.5 rounded-full bg-blue-500" />;
                }
              }

              return (
                <button
                  key={prov}
                  type="button"
                  onClick={() => setProvider(prov)}
                  className={`py-4 px-3 rounded-xl border text-center font-black text-xs transition-all duration-200 flex flex-col items-center justify-center gap-2 cursor-pointer h-22 relative overflow-hidden ${brandColorClass}`}
                >
                  {activeIndicator}
                  <div className={`p-1.5 rounded-lg ${isSelected ? "bg-white/10" : "bg-neutral-50"}`}>
                    <CreditCard className={`w-4 h-4 ${isSelected ? "text-white" : "text-neutral-500"}`} />
                  </div>
                  <span className="tracking-tight text-[11px]">{prov}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Groups Selector Panel - Active Search and Filters */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-neutral-50 pb-3 gap-2">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-[10.5px] font-black">٢</span>
              <h3 className="text-xs font-black text-neutral-900">اختيار الفئة التجارية</h3>
            </div>
            <p className="text-[10px] text-neutral-400 font-bold">حدد من الباقات التجارية الجاهزة أو أنشئ قيمة يدوية</p>
          </div>

          {/* Search and Filters Bar (UX Fix: Rendered and Fully Connected) */}
          <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center bg-neutral-50 p-2.5 rounded-xl border border-neutral-200/50">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-neutral-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="البحث بالاسم أو السعر (مثال: 3000)..."
                value={groupSearchQuery}
                onChange={(e) => setGroupSearchQuery(e.target.value)}
                className="w-full h-8 pr-9 pl-3 bg-white border border-neutral-200 rounded-lg outline-none text-[10.5px] font-medium focus:border-neutral-950 transition-colors text-right"
              />
            </div>
            <div className="flex bg-neutral-200/50 p-0.5 rounded-lg border border-neutral-200/10">
              <button
                type="button"
                onClick={() => setGroupFilterTab("all")}
                className={`px-3 py-1.5 rounded-md text-[9.5px] font-black transition-all ${
                  groupFilterTab === "all" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                الكل
              </button>
              <button
                type="button"
                onClick={() => setGroupFilterTab("major")}
                className={`px-3 py-1.5 rounded-md text-[9.5px] font-black transition-all ${
                  groupFilterTab === "major" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                كبرى (3K+)
              </button>
              <button
                type="button"
                onClick={() => setGroupFilterTab("minor")}
                className={`px-3 py-1.5 rounded-md text-[9.5px] font-black transition-all ${
                  groupFilterTab === "minor" ? "bg-white text-neutral-900 shadow-xs" : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                صغرى
              </button>
            </div>
          </div>

          {/* Group Card Options Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredGroupsList.map((g) => {
              const isSelected = selectedGroupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGroupChange(g.id)}
                  className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden shadow-xs hover:shadow-xs group/item ${
                    isSelected 
                      ? "border-neutral-950 bg-neutral-950 text-white ring-2 ring-neutral-950 ring-offset-2" 
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50/20"
                  }`}
                >
                  {/* Card top banner indicators */}
                  <div className="flex justify-between w-full items-center mb-1">
                    <Sparkles className={`w-3.5 h-3.5 ${isSelected ? "text-amber-300 animate-pulse" : "text-neutral-400"}`} />
                    <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black ${isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                      {g.ratioLabel}
                    </span>
                  </div>

                  {/* Card bottom details */}
                  <div className="space-y-0.5 mt-auto">
                    <p className={`text-[8.5px] font-bold ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}>
                      صافي الكاش للعميل
                    </p>
                    <p className={`text-base font-black tracking-tight ${isSelected ? "text-white" : "text-neutral-950"}`}>
                      {g.packageAmount.toLocaleString()} ر.س
                    </p>
                    <p className={`text-[9.5px] leading-tight font-bold ${isSelected ? "text-neutral-350" : "text-neutral-400"}`}>
                      الإجمالي: {g.totalInstallmentAmount.toLocaleString()} ر.س
                    </p>
                  </div>

                  {isSelected && (
                    <div className="absolute top-2 left-2 bg-white text-neutral-950 rounded-full p-0.5 shadow-sm">
                      <Check className="w-2.5 h-2.5 text-neutral-950 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}

            {/* Custom Interactive Commercial Group Card */}
            <button
              type="button"
              onClick={() => handleGroupChange("custom")}
              className={`p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between h-32 cursor-pointer relative overflow-hidden shadow-xs hover:shadow-xs group/item ${
                selectedGroupId === "custom" 
                  ? "border-neutral-950 bg-neutral-950 text-white ring-2 ring-neutral-950 ring-offset-2" 
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:bg-neutral-50/20"
              }`}
            >
              <div className="flex justify-between w-full items-center mb-1">
                <Sliders className={`w-3.5 h-3.5 ${selectedGroupId === "custom" ? "text-amber-300 animate-bounce" : "text-neutral-400"}`} />
                <span className={`text-[8.5px] px-2 py-0.5 rounded-full font-black ${selectedGroupId === "custom" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  مخصص
                </span>
              </div>
              <div className="space-y-0.5 mt-auto">
                <p className={`text-[8.5px] font-bold ${selectedGroupId === "custom" ? "text-neutral-400" : "text-neutral-500"}`}>
                  مجموعة تجارية يدوية
                </p>
                <p className={`text-base font-black tracking-tight ${selectedGroupId === "custom" ? "text-white" : "text-neutral-950"}`}>
                  تخصيص حر
                </p>
                <p className={`text-[9.5px] leading-tight font-bold ${selectedGroupId === "custom" ? "text-neutral-350" : "text-neutral-400"}`}>
                  إدخال مباشر للمبالغ
                </p>
              </div>
              {selectedGroupId === "custom" && (
                <div className="absolute top-2 left-2 bg-white text-neutral-950 rounded-full p-0.5 shadow-sm">
                  <Check className="w-2.5 h-2.5 text-neutral-950 stroke-[3]" />
                </div>
              )}
            </button>
          </div>

          {/* Dynamic empty state for search */}
          {filteredGroupsList.length === 0 && selectedGroupId !== "custom" && (
            <div className="text-center py-6 border border-dashed border-neutral-200 rounded-xl bg-neutral-50/50">
              <Search className="w-8 h-8 text-neutral-300 mx-auto mb-2 animate-pulse" />
              <p className="text-xs text-neutral-500 font-bold">لا توجد مجموعات تطابق بحثك حاليًا.</p>
              <button
                type="button"
                onClick={() => { setGroupSearchQuery(""); setGroupFilterTab("all"); }}
                className="text-[10px] text-blue-600 font-black underline mt-1 block mx-auto hover:text-blue-700"
              >
                إعادة ضبط مرشحات البحث
              </button>
            </div>
          )}

          {/* Custom Group Fields Panel */}
          {selectedGroupId === "custom" && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-4 rounded-xl border border-neutral-200 bg-neutral-50/70 space-y-4"
            >
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                <Sliders className="w-4 h-4 text-neutral-600" />
                <h4 className="text-xs font-black text-neutral-900">تخصيص مبالغ المجموعة التجارية</h4>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-black block">صافي التمويل للعميل (سعر الكاش)</label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      lang="en"
                      placeholder="0.00"
                      required={selectedGroupId === "custom"}
                      value={customPackageAmount}
                      onChange={(e) => setCustomPackageAmount(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-xl outline-none text-xs text-center font-black focus:border-neutral-950 transition-colors"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9.5px] text-neutral-400 font-bold">ر.س</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-neutral-500 font-black block">إجمالي تمويل العميل (بالأقساط)</label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      lang="en"
                      placeholder="0.00"
                      required={selectedGroupId === "custom"}
                      value={customTotalInstallmentAmount}
                      onChange={(e) => setCustomTotalInstallmentAmount(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-xl outline-none text-xs text-center font-black focus:border-neutral-950 transition-colors"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9.5px] text-neutral-400 font-bold">ر.س</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Step 3: Down Payment - With Increments & Presets */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-[10.5px] font-black">٣</span>
              <h3 className="text-xs font-black text-neutral-900">خصم الدفعة الأولى من التمويل</h3>
            </div>
            <span className="text-[10px] text-neutral-400 font-bold">يتحملها العميل ولا تخصم من أرباحك الصافية</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Decrement Button */}
            <button
              type="button"
              onClick={() => adjustDownPayment(-100)}
              className="w-11 h-11 rounded-xl border border-neutral-200 hover:border-neutral-400 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Input Field */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-neutral-400">
                <Banknote className="w-4 h-4" />
              </div>
              <input
                type="number"
                inputMode="decimal"
                lang="en"
                placeholder="0.00"
                value={downPayment}
                onChange={(e) => setDownPayment(e.target.value)}
                className="w-full text-base h-11 px-3 pr-10 text-center font-black rounded-xl border border-neutral-200 outline-none focus:border-neutral-950 bg-white"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-bold">ر.س</span>
            </div>

            {/* Increment Button */}
            <button
              type="button"
              onClick={() => adjustDownPayment(100)}
              className="w-11 h-11 rounded-xl border border-neutral-200 hover:border-neutral-400 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Presets Buttons (UX Enhancement) */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[9px] text-neutral-400 font-bold ml-1">اختصار سريع:</span>
            <button
              type="button"
              onClick={() => handleApplyDownPaymentPreset(0)}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              بون دفعة (0 ر.س)
            </button>
            <button
              type="button"
              disabled={packageAmount <= 0}
              onClick={() => handleApplyDownPaymentPreset(10, true)}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              10% من قيمة الكاش
            </button>
            <button
              type="button"
              disabled={packageAmount <= 0}
              onClick={() => handleApplyDownPaymentPreset(20, true)}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors disabled:opacity-50"
            >
              20% من قيمة الكاش
            </button>
          </div>
        </div>

        {/* Step 4: Commission Fee - With Increments & Presets */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-[10.5px] font-black">٤</span>
              <h3 className="text-xs font-black text-neutral-900">رسوم العمولة والتكلفة الإدارية</h3>
            </div>
            <span className="text-[10px] text-neutral-400 font-bold">تسجيل أي عمولات إضافية خاصة بالوسيط</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Decrement Button */}
            <button
              type="button"
              onClick={() => adjustCommission(-50)}
              className="w-11 h-11 rounded-xl border border-neutral-200 hover:border-neutral-400 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
            >
              <Minus className="w-4 h-4" />
            </button>

            {/* Input Field */}
            <div className="relative flex-1">
              <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-neutral-400">
                <DollarSign className="w-4 h-4" />
              </div>
              <input
                type="number"
                inputMode="decimal"
                lang="en"
                placeholder="0.00"
                value={commissionFee}
                onChange={(e) => setCommissionFee(e.target.value)}
                className="w-full text-base h-11 px-3 pr-10 text-center font-black rounded-xl border border-neutral-200 outline-none focus:border-neutral-950 bg-white"
              />
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] text-neutral-400 font-bold">ر.س</span>
            </div>

            {/* Increment Button */}
            <button
              type="button"
              onClick={() => adjustCommission(50)}
              className="w-11 h-11 rounded-xl border border-neutral-200 hover:border-neutral-400 flex items-center justify-center bg-neutral-50 hover:bg-neutral-100 text-neutral-600 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
            </button>
          </div>

          {/* Quick Commission Presets */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[9px] text-neutral-400 font-bold ml-1">اختصار سريع:</span>
            <button
              type="button"
              onClick={() => handleApplyCommissionPreset(0)}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              لا توجد عمولة (0)
            </button>
            <button
              type="button"
              onClick={() => handleApplyCommissionPreset(50)}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              50 ر.س
            </button>
            <button
              type="button"
              onClick={() => handleApplyCommissionPreset(100)}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              100 ر.س
            </button>
            <button
              type="button"
              onClick={() => handleApplyCommissionPreset(150)}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors"
            >
              150 ر.س
            </button>
          </div>
        </div>

        {/* Step 5: Transaction Date - REQUIRED */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-[10.5px] font-black">٥</span>
              <h3 className="text-xs font-black text-neutral-900">تاريخ العملية</h3>
            </div>
            <span className="text-[10px] text-red-500 font-black flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
              تحديد التاريخ إلزامي *
            </span>
          </div>

          <div className="relative w-full max-w-full">
            <div className="absolute inset-y-0 right-3.5 flex items-center pointer-events-none text-neutral-400">
              <Calendar className="w-4 h-4" />
            </div>
            <input
              type="date"
              required
              value={operationDate}
              onChange={(e) => setOperationDate(e.target.value)}
              className="w-full max-w-full min-w-0 block appearance-none -webkit-appearance-none box-border text-xs h-11 pl-3 pr-10 text-right font-black rounded-xl border border-neutral-200 outline-none focus:border-neutral-950 bg-white cursor-pointer"
            />
          </div>

          {/* Quick presets for today/yesterday */}
          <div className="flex items-center gap-1.5 flex-wrap pt-1">
            <span className="text-[9px] text-neutral-400 font-bold ml-1">تحديد سريع:</span>
            <button
              type="button"
              onClick={() => {
                const today = new Date().toISOString().split("T")[0];
                setOperationDate(today);
              }}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              اليوم
            </button>
            <button
              type="button"
              onClick={() => {
                const yesterday = new Date();
                yesterday.setDate(yesterday.getDate() - 1);
                const yesterdayStr = yesterday.toISOString().split("T")[0];
                setOperationDate(yesterdayStr);
              }}
              className="px-2.5 py-1 rounded-lg border border-neutral-200 bg-neutral-50 text-[9.5px] font-black text-neutral-600 hover:bg-neutral-100 transition-colors cursor-pointer"
            >
              أمس
            </button>
          </div>
        </div>

        {/* Closing Form Inputs Column */}
        </div>

        {/* Sticky Interactive Ledger Column: Taking 5 columns out of 12 on desktop */}
        <div className="space-y-6 lg:col-span-5 lg:sticky lg:top-24">

          {/* Live Interactive Financial Summary Ledger */}
        <div className="p-5 rounded-2xl border border-neutral-200 bg-white space-y-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between border-b border-neutral-100 pb-3">
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-emerald-600" />
              <h4 className="text-xs font-black text-neutral-900">هيكلة العقد والتدفقات المرتقبة</h4>
            </div>
            <span className="text-[9px] bg-neutral-100 text-neutral-600 px-2 py-0.5 rounded-md font-mono">البيان المحاسبي التفاعلي</span>
          </div>

          {!selectedGroupId ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3">
              <Sparkles className="w-9 h-9 text-neutral-300 animate-pulse" />
              <div>
                <p className="text-xs font-black text-neutral-700">بانتظار اختيار الفئة التجارية...</p>
                <p className="text-[10px] text-neutral-400 mt-1 max-w-[280px] leading-relaxed">
                  الرجاء اختيار أحد المجموعات المالية أو إدخال قيم مخصصة لبدء هيكلة وحساب توزيع الأرباح والرسوم.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              
              {/* Dynamic Warning Helper */}
              <div className="bg-amber-50/50 p-3 rounded-xl border border-amber-200/40 text-right space-y-1">
                <p className="text-[10.5px] text-amber-800 font-extrabold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                  لوحة مراجعة وحساب العقد ماليًا:
                </p>
                <p className="text-[9.5px] text-neutral-500 leading-relaxed font-medium">
                  الأرقام أدناه توضح توزيع المبيعات والأرباح ورسوم البوابة (6.99%). <span className="text-amber-800 font-bold">يرجى تأكيد التسجيل بالزر بالأسفل لإضافتها فعلياً للسجلات.</span>
                </p>
              </div>

              {/* Dynamic Real-time Profit Efficiency Gauge */}
              <div className="bg-neutral-50 p-4 rounded-xl border border-neutral-200/60 space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <span className="text-[10.5px] font-black text-neutral-800">معدل كفاءة وصافي الربح للمجموعة:</span>
                    <HelpCircle className="w-3 h-3 text-neutral-400 cursor-pointer" />
                  </div>
                  <span className="text-xs font-black font-mono text-emerald-700">
                    {profitMarginPercent}% صافي ربح
                  </span>
                </div>
                {/* Progress bar */}
                <div className="w-full h-2 bg-neutral-200/70 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${profitMarginPercent}%` }}
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className={`h-full rounded-full ${
                      profitMarginPercent > 35 
                        ? "bg-emerald-500" 
                        : profitMarginPercent > 20 
                          ? "bg-amber-400" 
                          : "bg-red-500"
                    }`}
                  />
                </div>
                <div className="flex justify-between items-center text-[9px] text-neutral-450 font-bold pt-0.5">
                  <span>رسوم البوابة والعمولات (مرتفع)</span>
                  <span>كفاءة ربح عالية (ممتاز)</span>
                </div>
              </div>

              {/* Financial Ledger Details Table */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3.5 pt-1 text-right">
                
                <div className="border-b border-neutral-100 pb-2.5">
                  <p className="text-[9.5px] text-neutral-400 font-bold">إجمالي تمويل العميل (بالأقساط)</p>
                  <p className="text-sm font-black text-neutral-950 font-mono mt-0.5">
                    {totalInstallmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                  </p>
                </div>

                <div className="border-b border-neutral-100 pb-2.5">
                  <p className="text-[9.5px] text-neutral-400 font-bold">صافي تمويل العميل (سعر الكاش)</p>
                  <p className="text-sm font-black text-neutral-950 font-mono mt-0.5">
                    {packageAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                  </p>
                </div>

                <div className="border-b border-neutral-100 pb-2.5">
                  <p className="text-[9.5px] text-neutral-400 font-bold">الدفعة المخصومة من العميل</p>
                  <p className="text-sm font-black text-neutral-700 font-mono mt-0.5">
                    {parsedDownPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                  </p>
                </div>

                <div className="border-b border-neutral-100 pb-2.5">
                  <p className="text-[9.5px] text-neutral-400 font-bold">الصافي للعميل بعد خصم الدفعة الأولى</p>
                  <p className="text-sm font-black text-amber-600 font-mono mt-0.5">
                    {netTransferToClient.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                  </p>
                </div>

                <div className="border-b border-neutral-100 pb-2.5">
                  <p className="text-[9.5px] text-neutral-400 font-bold">رسوم بوابة التقسيط (6.99%)</p>
                  <p className="text-sm font-black text-red-650 font-mono mt-0.5">
                    {providerFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                  </p>
                </div>

                <div className="border-b border-neutral-100 pb-2.5">
                  <p className="text-[9.5px] text-neutral-400 font-bold">رسوم عمولة الوساطة المسجلة</p>
                  <p className="text-sm font-black text-red-650 font-mono mt-0.5">
                    {parsedCommissionFee.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                  </p>
                </div>

                {/* Final Net Profit highlight box */}
                <div className="col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/30 text-center flex flex-col justify-center items-center space-y-1 shadow-inner mt-2">
                  <div className="flex items-center gap-1.5 text-emerald-800">
                    <Coins className="w-4 h-4" />
                    <p className="text-[10.5px] font-black">صافي أرباح التاجر النهائية المحققة</p>
                  </div>
                  <p className="text-xl font-black text-emerald-700 font-mono">
                    {netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                  </p>
                  <p className="text-[8.5px] text-neutral-450 font-medium">
                    * الدفعة الأولى يدفعها العميل مباشرة ولا تعتبر من خصوم أرباحك الصافية.
                  </p>
                </div>

              </div>

            </div>
          )}
        </div>

        {/* Form Submission Action Trigger */}
        <button
          type="submit"
          disabled={isSubmitting || successAnimation || !selectedGroupId}
          className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-200 text-white rounded-xl font-black text-xs flex items-center justify-center gap-2 duration-150 transition-all cursor-pointer shadow-lg shadow-neutral-900/10 active:scale-[0.99] touch-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white/50" />
              <span>جاري تسجيل وحفظ السجلات المالية...</span>
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4" />
              <span>تأكيد وتسجيل عملية البيع بالسجلات</span>
            </>
          )}
        </button>
        {/* Closing Sticky Interactive Ledger Column */}
        </div>
      </form>
    </div>
  );
}
