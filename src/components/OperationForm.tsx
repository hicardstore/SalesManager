import React, { useState } from "react";
import { createPortal } from "react-dom";
import { InstallmentProvider, PREDEFINED_GROUPS, PredefinedGroup } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { CreditCard, Sparkles, DollarSign, CheckCircle, ArrowRight, Layers, Sliders, Banknote, Loader2 } from "lucide-react";

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
  const netTransferToClient = Math.max(0, packageAmount - parsedDownPayment);
  const durationMonths = 12;
  const monthlyInstallment = parseFloat((netTransferToClient / durationMonths).toFixed(2));
  
  // New calculations for the requested breakdown
  const providerFee = netTransferToClient * 0.0699;
  const netProfit = totalInstallmentAmount - packageAmount - providerFee;

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

    setIsSubmitting(true);

    const groupLabel = selectedGroupId === "custom"
      ? `مخصصة (${packageAmount.toLocaleString()} ر.س)`
      : (selectedGroup ? selectedGroup.label : "مجموعة غير معروفة");

    const payload = {
      clientId: `CL-${Math.floor(1000 + Math.random() * 9000)}`,
      clientName: `عملية مبيعات ${groupLabel}`,
      packageAmount,
      downPayment: parsedDownPayment,
      provider,
      status: "مكتمل",
      totalInstallmentAmount,
      monthlyInstallment
    };

    try {
      const success = await onAddOperation(payload);
      if (success) {
        setSuccessAnimation(true);
        // Slightly shorter delay to feel more snappy while still showing the confirmation
        setTimeout(() => {
          setSuccessAnimation(false);
          onNavigateToDashboard();
          // Reset form to default values for next transaction
          setSelectedGroupId(PREDEFINED_GROUPS[0]?.id || "3000");
          setDownPayment("");
          setCustomPackageAmount("");
          setCustomTotalInstallmentAmount("");
        }, 400); 
      } else {
        setErrorMessage("فشل في إكمال وتسجيل العملية. يرجى التحقق من الخادم.");
      }
    } catch (err) {
      setErrorMessage("حدث خطأ ما أثناء حفظ البيانات.");
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

  return (
    <div className="max-w-2xl mx-auto relative min-h-[600px]" id="operation-form-component">
      {/* Success Animation Overlay - Optimized for immediate feedback */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {successAnimation && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] bg-[#fafafa]/90 backdrop-blur-sm flex flex-col items-center justify-center p-8 text-center"
            >
              <motion.div
                initial={{ scale: 0.5, rotate: -20, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                transition={{ type: "spring", damping: 12, stiffness: 200 }}
                className="w-24 h-24 bg-neutral-950 rounded-[2rem] flex items-center justify-center text-white mb-8 shadow-2xl"
              >
                <CheckCircle className="w-12 h-12 text-emerald-400" />
              </motion.div>
              <h3 className="text-2xl font-black text-neutral-950 font-sans tracking-tight">تم التسجيل بنجاح!</h3>
              <p className="text-sm text-neutral-500 mt-3 font-medium max-w-[240px] leading-relaxed">
                تمت معالجة البيانات المالية ونقلها للسجل العام للمجموعات...
              </p>
            </motion.div>
          )}
        </AnimatePresence>,
        document.body
      )}

      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-black text-neutral-950 tracking-tight font-sans">إنشاء عملية بيع فورية</h2>
          <p className="text-[11px] text-neutral-400">اختر من المجموعات المالية المعتمدة أو حدد قيماً مخصصة</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-100 rounded-xl text-xs text-red-800 font-bold flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-red-600 rounded-full"></span>
            <p>{errorMessage}</p>
          </div>
        )}

        {/* Step 1: Installment Provider Selector */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">1</span>
              <h3 className="text-xs font-bold text-neutral-900">اختيار مزود خدمة التقسيط</h3>
            </div>
            <span className="text-[10px] text-neutral-400">بوابات دفع تمويلية مرخصة</span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {(["إمكان", "تابي", "تمارا"] as InstallmentProvider[]).map((prov) => (
              <button
                key={prov}
                type="button"
                onClick={() => setProvider(prov)}
                className={`py-4 px-3 rounded-xl border text-center font-bold text-xs transition-all flex flex-col items-center justify-center gap-2 cursor-pointer h-20 ${
                  provider === prov 
                    ? "border-neutral-950 bg-neutral-950 text-white shadow-md shadow-neutral-950/10 scale-[1.02]" 
                    : "border-neutral-200 bg-white text-neutral-500 hover:border-neutral-300 hover:bg-[#fafafa]"
                }`}
              >
                <CreditCard className={`w-4 h-4 ${provider === prov ? "text-neutral-200" : "text-neutral-400"}`} />
                <span className="tracking-tight">{prov}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Step 2: NEW IMPROVED Groups Selector Panel */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-neutral-900 text-white flex items-center justify-center text-xs font-bold">2</span>
              <h3 className="text-xs font-bold text-neutral-900">اختيار المجموعة التجارية</h3>
            </div>
            <span className="text-[10px] text-neutral-400 font-bold">جميع الفئات المالية المعتمدة</span>
          </div>

          {/* Responsive Grid of all Predefined Groups */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {PREDEFINED_GROUPS.map((g) => {
              const isSelected = selectedGroupId === g.id;
              return (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => handleGroupChange(g.id)}
                  className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between h-30 cursor-pointer relative overflow-hidden shadow-sm ${
                    isSelected 
                      ? "border-neutral-950 bg-neutral-950 text-white ring-2 ring-neutral-950 ring-offset-1" 
                      : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:shadow-md"
                  }`}
                >
                  <div className="flex justify-between w-full items-center mb-1">
                    <Sparkles className={`w-4 h-4 ${isSelected ? "text-amber-300" : "text-neutral-400"}`} />
                    <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${isSelected ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                      {g.ratioLabel}
                    </span>
                  </div>
                  <div className="space-y-0.5 mt-auto">
                    <p className={`text-[9px] font-bold ${isSelected ? "text-neutral-400" : "text-neutral-500"}`}>
                      الصافي للعميل
                    </p>
                    <p className={`text-lg font-bold tracking-tight ${isSelected ? "text-white" : "text-neutral-950"}`}>
                      {g.packageAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                    <p className={`text-[10px] leading-tight font-medium ${isSelected ? "text-neutral-300" : "text-neutral-500"}`}>
                      الاجمالي: {g.totalInstallmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </p>
                  </div>
                </button>
              );
            })}

            {/* Custom Interactive Commercial Group Card */}
            <button
              type="button"
              onClick={() => handleGroupChange("custom")}
              className={`p-4 rounded-xl border text-right transition-all flex flex-col justify-between h-30 cursor-pointer relative overflow-hidden shadow-sm ${
                selectedGroupId === "custom" 
                  ? "border-neutral-950 bg-neutral-950 text-white ring-2 ring-neutral-950 ring-offset-1" 
                  : "border-neutral-200 bg-white text-neutral-800 hover:border-neutral-400 hover:shadow-md"
              }`}
            >
              <div className="flex justify-between w-full items-center mb-1">
                <Sliders className={`w-4 h-4 ${selectedGroupId === "custom" ? "text-amber-300" : "text-neutral-400"}`} />
                <span className={`text-[9px] px-2 py-0.5 rounded-full font-black ${selectedGroupId === "custom" ? "bg-white/20 text-white" : "bg-neutral-100 text-neutral-600"}`}>
                  مخصص
                </span>
              </div>
              <div className="space-y-0.5 mt-auto">
                <p className={`text-[9px] font-bold ${selectedGroupId === "custom" ? "text-neutral-400" : "text-neutral-500"}`}>
                  مجموعة تجارية مخصصة
                </p>
                <p className={`text-sm font-bold tracking-tight ${selectedGroupId === "custom" ? "text-white" : "text-neutral-950"}`}>
                  تخصيص يدوي
                </p>
                <p className={`text-[9.5px] leading-none font-medium ${selectedGroupId === "custom" ? "text-neutral-300" : "text-neutral-500"}`}>
                  أدخل مبالغ مخصصة
                </p>
              </div>
            </button>
          </div>

          {/* Custom Group Fields Card */}
          {selectedGroupId === "custom" && (
            <motion.div 
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-5 rounded-xl border border-neutral-250 bg-neutral-50/70 space-y-4"
              dir="rtl"
            >
              <div className="flex items-center gap-2 border-b border-neutral-200 pb-2">
                <Sliders className="w-4 h-4 text-neutral-600 animate-pulse" />
                <h4 className="text-xs font-black text-neutral-900">تخصيص مبالغ المجموعة التجارية</h4>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-bold block">صافي التمويل للعميل (سعر الكاش)</label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      lang="en"
                      placeholder="0.00"
                      required={selectedGroupId === "custom"}
                      value={customPackageAmount}
                      onChange={(e) => setCustomPackageAmount(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg outline-none text-xs text-center font-bold focus:border-neutral-950"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400 font-bold">ر.س</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] text-neutral-500 font-bold block">إجمالي تمويل العميل (بالأقساط)</label>
                  <div className="relative">
                    <input
                      type="number"
                      inputMode="decimal"
                      lang="en"
                      placeholder="0.00"
                      required={selectedGroupId === "custom"}
                      value={customTotalInstallmentAmount}
                      onChange={(e) => setCustomTotalInstallmentAmount(e.target.value)}
                      className="w-full h-11 px-3 bg-white border border-neutral-200 rounded-lg outline-none text-xs text-center font-bold focus:border-neutral-950"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[9px] text-neutral-400 font-bold">ر.س</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Step 3: Down Payment */}
        <div className="bg-white p-6 rounded-2xl border border-neutral-100 shadow-sm space-y-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-neutral-900 text-white flex items-center justify-center text-sm font-bold shadow-sm">3</div>
            <h3 className="text-sm font-bold text-neutral-900">خصم الدفعة الأولى</h3>
          </div>

          <div className="relative">
            <div className="absolute inset-y-0 right-3 flex items-center pointer-events-none text-neutral-400">
              <Banknote className="w-5 h-5" />
            </div>
            <input
              type="number"
              inputMode="decimal"
              lang="en"
              placeholder="0.00"
              required
              value={downPayment}
              onChange={(e) => setDownPayment(e.target.value)}
              className="w-full text-lg h-14 rounded-xl border border-neutral-200 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-900/5 bg-white font-black text-center"
            />
          </div>
        </div>

        {/* Live Interactive Financial Summary Card */}
        <div className="p-6 rounded-2xl border border-neutral-200 bg-white space-y-5 shadow-xs">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <h4 className="text-[11px] font-extrabold text-neutral-900 tracking-wider">هيكلة العقد والتدفقات المرتقبة</h4>
            <span className="text-[10px] text-neutral-400 font-mono">البيانات المالية للعقد</span>
          </div>

          {!selectedGroupId ? (
            <div className="flex flex-col items-center justify-center py-10 text-center space-y-3" dir="rtl">
              <Sparkles className="w-10 h-10 text-neutral-300 animate-pulse" />
              <div>
                <p className="text-xs font-black text-neutral-700">بانتظار اختيار المجموعة التجارية...</p>
                <p className="text-[10px] text-neutral-400 mt-1 max-w-[280px] leading-relaxed">
                  الرجاء اختيار أحد المجموعات المالية المتاحة أعلاه أو التخصيص اليدوي لبدء المعاينة والتسجيل المالي للمبيعات.
                </p>
              </div>
            </div>
          ) : (
            <>
              <div className="bg-amber-50/50 p-3.5 rounded-xl border border-amber-200/40 text-right space-y-1.5" dir="rtl">
                <p className="text-[11px] text-amber-800 font-extrabold flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-ping"></span>
                  حاسبة مبيعات تفاعلية - معاينة العقد المالي:
                </p>
                <p className="text-[10px] text-neutral-500 leading-relaxed font-medium">
                  الأرقام أدناه توضح توزيع الأرباح والرسوم والتدفقات النقدية المقدرة لهذه المجموعة. <span className="text-amber-800 font-bold">لم يتم حفظ أو تسجيل العملية في كشوفات المشروع حتى الآن</span>. اضغط على زر "اضغط لتسجيل العملية" بالأسفل لحفظها في التقارير المالية.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold">اجمالي تمويل العميل</p>
                  <p className="text-sm font-black text-neutral-950">{totalInstallmentAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold">صافي تمويل العميل</p>
                  <p className="text-sm font-black text-neutral-950">{packageAmount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold">الدفعة المخصومة من صافي تمويل العميل</p>
                  <p className="text-sm font-black text-neutral-950">{parsedDownPayment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold">الصافي للعميل بعد خصم الدفعة الأولى</p>
                  <p className="text-sm font-black text-amber-600">{netTransferToClient.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] text-neutral-400 font-bold">رسوم مزود الخدمة</p>
                  <p className="text-sm font-black text-red-600">{(providerFee).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                </div>
                <div className="space-y-1">
                  {/* Empty cell spacer to balance grid or provide info */}
                </div>
                
                <div className="space-y-1 col-span-2 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/40 text-center" dir="rtl">
                  <p className="text-[10px] text-[#059669] font-black">صافي أرباح التاجر النهائية المحققة</p>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">{netProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                  <p className="text-[8px] text-neutral-500 mt-1 leading-relaxed">
                    * الدفعة الأولى يتحملها العميل بالكامل وبالتالي لا تخصم من أرباحك الصافية.
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Done Button (Step 4) */}
        <button
          type="submit"
          disabled={isSubmitting || successAnimation}
          className="w-full h-12 bg-neutral-900 hover:bg-neutral-800 disabled:bg-neutral-300 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 duration-150 transition-all cursor-pointer shadow-lg shadow-neutral-900/10 active:scale-95 touch-none"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-white/50" />
              <span>جاري تسجيل البيانات المالية...</span>
            </>
          ) : (
            "اضغط لتسجيل العملية"
          )}
        </button>
      </form>
    </div>
  );
}
