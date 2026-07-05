import React, { useState } from "react";
import { createPortal } from "react-dom";
import { Operation, InstallmentProvider, PREDEFINED_GROUPS } from "../types";
import { 
  getOperationFee as getOperationFeeCentral, 
  getOperationProfitWithDownPayment as getOperationProfitWithDownPaymentCentral, 
  getOperationProfitAfterDownPayment as getOperationProfitAfterDownPaymentCentral 
} from "../utils/financeMath";
import { motion, AnimatePresence } from "motion/react";
import { 
  TrendingUp, 
  Layers, 
  PlusCircle, 
  Sparkles, 
  DollarSign, 
  CheckCircle,
  Calculator,
  Banknote,
  Search,
  SlidersHorizontal,
  FileText,
  Printer,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  Sheet,
  Download,
  Calendar,
  Trash2
} from "lucide-react";
import { useAuth } from "../context/AuthContext";

const cleanClientName = (name: string): string => {
  if (!name) return "";
  return name.replace(/[0-9]\uFE0F?\u20E3/g, "").replace(/\s+/g, " ").trim();
};

interface FinanceDashboardProps {
  operations: Operation[];
  deletedOperations?: Operation[];
  onNavigateToNew: () => void;
  isLoading?: boolean;
  onDeleteOperation?: (opId: string) => Promise<boolean>;
  onRestoreOperation?: (opId: string) => Promise<boolean>;
}

export default function FinanceDashboard({ 
  operations, 
  deletedOperations = [], 
  onNavigateToNew, 
  isLoading, 
  onDeleteOperation,
  onRestoreOperation
}: FinanceDashboardProps) {
  const { user } = useAuth();
  // Advanced filters state
  const [filterGroup, setFilterGroup] = useState<"all" | "major" | "minor" | "custom">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedOp, setSelectedOp] = useState<Operation | null>(null);
  const [opToDelete, setOpToDelete] = useState<Operation | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // States for deleted records modal and restoration
  const [showDeletedModal, setShowDeletedModal] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | null>(null);
  const [restoreSuccess, setRestoreSuccess] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);

  // Interactive Trend Chart State
  const [trendMetric, setTrendMetric] = useState<"sales" | "profit">("sales");
  const [hoveredPointIdx, setHoveredPointIdx] = useState<number | null>(null);

  // Expanded toggles for UI sections
  const [isGroupsExpanded, setIsGroupsExpanded] = useState(false);
  const [isOpsExpanded, setIsOpsExpanded] = useState(false);

  // Prevent background scrolling when transaction details modal, delete confirmation, or deleted records modal is open
  React.useEffect(() => {
    if (selectedOp || opToDelete || showDeletedModal) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [selectedOp, opToDelete, showDeletedModal]);

  const handleRestoreClick = async (opId: string) => {
    if (!onRestoreOperation) return;
    setIsRestoringId(opId);
    setRestoreError(null);
    setRestoreSuccess(null);
    try {
      const success = await onRestoreOperation(opId);
      if (success) {
        setRestoreSuccess("تم استرجاع العملية بنجاح وإعادتها إلى سجل العمليات.");
        setTimeout(() => setRestoreSuccess(null), 3500);
      } else {
        setRestoreError("فشل استرجاع العملية. يرجى المحاولة مرة أخرى.");
      }
    } catch (err) {
      console.error("Error restoring operation:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      let displayError = "حدث خطأ أثناء استرجاع العملية.";
      try {
        if (errMsg.startsWith("{")) {
          const parsed = JSON.parse(errMsg);
          displayError = `خطأ في الاسترجاع: ${parsed.error || errMsg}`;
        } else {
          displayError = `خطأ في الاسترجاع: ${errMsg}`;
        }
      } catch (e) {
        displayError = `خطأ في الاسترجاع: ${errMsg}`;
      }
      setRestoreError(displayError);
    } finally {
      setIsRestoringId(null);
    }
  };
  const [isExporting, setIsExporting] = useState(false);
  
  // Date filter state
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "week" | "month" | "3months" | "6months" | "year" | "custom">("all");
  const [customDate, setCustomDate] = useState<string>("");

  const handleDeleteClick = (e: React.MouseEvent, op: Operation) => {
    e.stopPropagation();
    if (!onDeleteOperation) return;
    setDeleteError(null);
    setOpToDelete(op);
  };

  const handleConfirmDelete = async () => {
    if (!opToDelete || !onDeleteOperation) return;
    setIsDeleting(true);
    setDeleteError(null);
    try {
      const success = await onDeleteOperation(opToDelete.id);
      if (success) {
        if (selectedOp?.id === opToDelete.id) {
          setSelectedOp(null);
        }
        setOpToDelete(null);
      } else {
        setDeleteError("فشل حذف العملية، يرجى المحاولة مرة أخرى.");
      }
    } catch (err) {
      console.error("Error deleting operation:", err);
      const errMsg = err instanceof Error ? err.message : String(err);
      let displayError = "حدث خطأ غير متوقع، يرجى المحاولة لاحقاً.";
      try {
        if (errMsg.startsWith("{")) {
          const parsed = JSON.parse(errMsg);
          displayError = `خطأ في قاعدة البيانات: ${parsed.error || errMsg}`;
        } else {
          displayError = `فشل الحذف: ${errMsg}`;
        }
      } catch (e) {
        displayError = `خطأ: ${errMsg}`;
      }
      setDeleteError(displayError);
    } finally {
      setIsDeleting(false);
    }
  };

  // Helper method to resolve details of any package amount dynamically from the 11 groups
  const getGroupDetails = (packageAmount: number, totalInstallmentAmount?: number) => {
    const match = PREDEFINED_GROUPS.find(
      g => g.packageAmount === packageAmount && (totalInstallmentAmount ? g.totalInstallmentAmount === totalInstallmentAmount : true)
    );
    if (match) return match;
    
    // 2. Try to fallback on cash packageAmount match
    const matchPkg = PREDEFINED_GROUPS.find(g => g.packageAmount === packageAmount);
    if (matchPkg) return matchPkg;

    // 3. Backward compatible defaults for raw sample db entries
    if (packageAmount === 5700) {
      return { id: "5700", label: "مجموعة 5700 ريال", packageAmount: 5700, totalInstallmentAmount: 8230, ratioLabel: "1.44x" };
    }
    if (packageAmount === 3000) {
      return { id: "3000", label: "المجموعة الأساسية (3000 ريال)", packageAmount: 3000, totalInstallmentAmount: 4500, ratioLabel: "1.50x" };
    }

    // 4. Custom fallback
    return {
      id: "custom",
      label: `مجموعة مخصصة (${packageAmount} ر.س)`,
      packageAmount,
      totalInstallmentAmount: totalInstallmentAmount || Math.round(packageAmount * 1.45),
      ratioLabel: "مرن"
    };
  };

  const getOperationFee = (op: Operation) => {
    return getOperationFeeCentral(op);
  };

  const getOperationProfit = (op: Operation) => {
    return getOperationProfitWithDownPaymentCentral(op);
  };

  const getOperationProfitWithDownPayment = (op: Operation) => {
    return getOperationProfitWithDownPaymentCentral(op);
  };

  const getOperationProfitAfterDownPayment = (op: Operation) => {
    return getOperationProfitAfterDownPaymentCentral(op);
  };

  // Date filtering logic
  const filteredByDate = operations.filter(op => {
    const rawDate = op.date || (op as any).createdAt;
    if (!rawDate) return false;
    const opDate = new Date(rawDate);
    
    const now = new Date();
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    if (dateFilter === "all") {
      return true;
    }
    if (dateFilter === "today") {
      return opDate.toDateString() === now.toDateString();
    }
    if (dateFilter === "yesterday") {
      const yesterday = new Date(now);
      yesterday.setDate(now.getDate() - 1);
      return opDate.toDateString() === yesterday.toDateString();
    }
    if (dateFilter === "week") {
      const weekAgo = new Date(todayMidnight);
      weekAgo.setDate(todayMidnight.getDate() - 7);
      return opDate >= weekAgo;
    }
    if (dateFilter === "month") {
      const monthAgo = new Date(todayMidnight);
      monthAgo.setMonth(todayMidnight.getMonth() - 1);
      return opDate >= monthAgo;
    }
    if (dateFilter === "3months") {
      const monthsAgo = new Date(todayMidnight);
      monthsAgo.setMonth(todayMidnight.getMonth() - 3);
      return opDate >= monthsAgo;
    }
    if (dateFilter === "6months") {
      const monthsAgo = new Date(todayMidnight);
      monthsAgo.setMonth(todayMidnight.getMonth() - 6);
      return opDate >= monthsAgo;
    }
    if (dateFilter === "year") {
      const yearAgo = new Date(todayMidnight);
      yearAgo.setFullYear(todayMidnight.getFullYear() - 1);
      return opDate >= yearAgo;
    }
    if (dateFilter === "custom" && customDate) {
      return opDate.toDateString() === new Date(customDate).toDateString();
    }
    return true;
  });

  // Calculate general KPI statistics across all operations (using filtered data)
  const totalOperationsCount = filteredByDate.length;
  const totalSales = filteredByDate.reduce((sum, op) => sum + op.packageAmount, 0);
  const totalInstallmentAmount = filteredByDate.reduce((sum, op) => sum + op.totalInstallmentAmount, 0);
  const netProfitWithDownPayment = filteredByDate.reduce((sum, op) => sum + getOperationProfitWithDownPayment(op), 0);
  const netProfitAfterDownPayment = filteredByDate.reduce((sum, op) => sum + getOperationProfitAfterDownPayment(op), 0);
  const netProfit = netProfitAfterDownPayment;
  const totalDownPayments = filteredByDate.reduce((sum, op) => sum + op.downPayment, 0);
  const totalProviderFees = filteredByDate.reduce((sum, op) => sum + getOperationFee(op), 0);
  const totalCommissionFees = filteredByDate.reduce((sum, op) => sum + (op.commissionFee || 0), 0);

  // Dynamically analyze all groups
  const finalGroupsList = PREDEFINED_GROUPS;

  // Filter operations dynamically based on tabs and search text
  const filteredOperations = filteredByDate;

  // Trend Data for visual SVG chart
  const trendData = React.useMemo(() => {
    const sortedOps = [...filteredByDate].sort((a, b) => {
      const dateA = new Date(a.date || (a as any).createdAt).getTime();
      const dateB = new Date(b.date || (b as any).createdAt).getTime();
      return dateA - dateB;
    });

    const grouped: { [key: string]: { sales: number; profit: number; count: number } } = {};
    sortedOps.forEach(op => {
      const d = new Date(op.date || (op as any).createdAt);
      const dateStr = d.toLocaleDateString("ar-SA-u-nu-latn", {
        month: "short",
        day: "numeric",
      });
      if (!grouped[dateStr]) {
        grouped[dateStr] = { sales: 0, profit: 0, count: 0 };
      }
      grouped[dateStr].sales += op.packageAmount;
      grouped[dateStr].profit += getOperationProfit(op);
      grouped[dateStr].count += 1;
    });

    const keys = Object.keys(grouped);
    const result = keys.map(k => ({
      date: k,
      sales: grouped[k].sales,
      profit: grouped[k].profit,
      count: grouped[k].count,
      isReal: true,
    }));

    if (result.length === 0) {
      return [
        { date: "١ يوليو", sales: 12000, profit: 4200, count: 1, isReal: false },
        { date: "٧ يوليو", sales: 18500, profit: 6475, count: 2, isReal: false },
        { date: "١٤ يوليو", sales: 15000, profit: 5250, count: 1, isReal: false },
        { date: "٢١ يوليو", sales: 27400, profit: 9590, count: 3, isReal: false },
        { date: "٢٨ يوليو", sales: 34000, profit: 11900, count: 4, isReal: false },
      ];
    } else if (result.length < 5) {
      const pad = [
        { date: "البداية", sales: 3000, profit: 1050, count: 0, isReal: false },
        ...result,
        { date: "النهاية", sales: result[result.length - 1].sales * 1.2, profit: result[result.length - 1].profit * 1.2, count: 0, isReal: false }
      ];
      return pad;
    }

    return result;
  }, [filteredByDate]);

  const activeMetricMax = React.useMemo(() => {
    const vals = trendData.map(d => trendMetric === "sales" ? d.sales : d.profit);
    return Math.max(...vals, 1000);
  }, [trendData, trendMetric]);

  // Provider breakdown calculations
  const providerStats = React.useMemo(() => {
    const stats: { [key: string]: { sales: number; profit: number; count: number; fees: number } } = {
      "تمارا": { sales: 0, profit: 0, count: 0, fees: 0 },
      "تابي": { sales: 0, profit: 0, count: 0, fees: 0 },
      "إمكان": { sales: 0, profit: 0, count: 0, fees: 0 },
    };

    filteredByDate.forEach(op => {
      const p = op.provider;
      if (stats[p]) {
        stats[p].sales += op.packageAmount;
        stats[p].profit += getOperationProfit(op);
        stats[p].count += 1;
        stats[p].fees += getOperationFee(op);
      }
    });

    const totalSalesAll = Object.values(stats).reduce((sum, item) => sum + item.sales, 0) || 1;

    return Object.keys(stats).map(key => ({
      name: key,
      sales: stats[key].sales,
      profit: stats[key].profit,
      count: stats[key].count,
      fees: stats[key].fees,
      share: Math.round((stats[key].sales / totalSalesAll) * 100),
    }));
  }, [filteredByDate]);

  // Sparkline builder helper
  const getSparklinePath = (metricFn: (op: Operation) => number, width = 80, height = 32) => {
    if (filteredByDate.length < 2) {
      return `M 0 ${height / 2} L ${width} ${height / 2}`;
    }
    const sortedOps = [...filteredByDate].sort((a, b) => {
      const dateA = new Date(a.date || (a as any).createdAt).getTime();
      const dateB = new Date(b.date || (b as any).createdAt).getTime();
      return dateA - dateB;
    });

    const values = sortedOps.map(op => metricFn(op));
    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);
    const valRange = maxVal - minVal || 1;

    const points = values.map((val, idx) => {
      const x = (idx / (values.length - 1)) * width;
      const y = height - 2 - ((val - minVal) / valRange) * (height - 4);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(" L ")}`;
  };

  // Get brand colors/details depending on the provider
  const getProviderBadge = (provider: InstallmentProvider) => {
    switch (provider) {
      case "تابي":
        return {
          bg: "bg-[#05ffd2]/10 border-[#05ffd2]/30 text-neutral-950",
          brandColor: "bg-[#05ffd2]",
        };
      case "تمارا":
        return {
          bg: "bg-[#ffaa47]/10 border-[#ffaa47]/35 text-amber-955",
          brandColor: "bg-[#ffaa47]",
        };
      case "إمكان":
        return {
          bg: "bg-neutral-900 border-neutral-800 text-white",
          brandColor: "bg-blue-400",
        };
      default:
        return {
          bg: "bg-neutral-100 border-neutral-200 text-neutral-800",
          brandColor: "bg-neutral-400",
        };
    }
  };

  if (isLoading && operations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4">
        <div className="w-8 h-8 border-2 border-neutral-200 border-t-neutral-900 animate-spin rounded-full"></div>
        <p className="text-sm font-bold text-neutral-400">جاري تحميل لوحة النتائج...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="finance-dashboard-component">
      

      {/* Date Filter Bar */}
      <div className="bg-white p-2 rounded-2xl border border-neutral-200/50 flex flex-wrap justify-between gap-2 items-center">
        <div className="flex flex-wrap gap-2 items-center">
          {[
            { id: "all", label: "الكل" },
            { id: "today", label: "اليوم" },
            { id: "yesterday", label: "أمس" },
            { id: "week", label: "الأسبوع" },
            { id: "month", label: "الشهر" },
            { id: "3months", label: "3 أشهر" },
            { id: "6months", label: "6 أشهر" },
            { id: "year", label: "سنة" },
          ].map((f) => (
            <button
              key={f.id}
              onClick={() => setDateFilter(f.id as any)}
              className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                dateFilter === f.id ? "bg-neutral-900 text-white" : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700"
              }`}
            >
              {f.label}
            </button>
          ))}
          <div className="flex items-center gap-2 border-r border-neutral-100 pr-2">
            <div className={`relative flex items-center gap-1.5 transition-colors rounded-lg px-3 py-1.5 cursor-pointer border ${
              dateFilter === "custom" 
                ? "bg-neutral-900 text-white border-neutral-900" 
                : "bg-neutral-100 hover:bg-neutral-200 text-neutral-700 border-neutral-200"
            }`}>
              <Calendar className={`w-3.5 h-3.5 ${dateFilter === "custom" ? "text-neutral-200" : "text-neutral-500"}`} />
              <span className="text-[11px] font-bold">
                {customDate ? customDate : "تاريخ مخصص"}
              </span>
              <input
                type="date"
                value={customDate}
                onChange={(e) => {
                  setCustomDate(e.target.value);
                  setDateFilter("custom");
                }}
                className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Charts & Analytics Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="charts-and-analytics-dashboard">
        
        {/* Interactive SVG Trend Chart Panel (2/3 width on large screens) */}
        <div className="lg:col-span-2 bg-white rounded-3xl p-6 border border-neutral-200/50 shadow-xs flex flex-col justify-between relative overflow-hidden group">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 border-b border-neutral-50 pb-4 mb-4">
            <div>
              <h3 className="text-sm font-black text-neutral-950 font-sans tracking-tight">منحنى الأداء المالي التفاعلي</h3>
              <p className="text-[10px] text-neutral-400 mt-0.5">تتبع المبيعات والأرباح المحققة على امتداد فترة الفلترة المحددة</p>
            </div>
            
            {/* Metric Switcher buttons */}
            <div className="flex bg-neutral-100 p-1 rounded-xl self-start sm:self-auto border border-neutral-200/40">
              <button
                type="button"
                onClick={() => setTrendMetric("sales")}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all ${
                  trendMetric === "sales" 
                    ? "bg-white text-blue-600 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                المبيعات
              </button>
              <button
                type="button"
                onClick={() => setTrendMetric("profit")}
                className={`px-3 py-1.5 rounded-lg text-[10.5px] font-black transition-all ${
                  trendMetric === "profit" 
                    ? "bg-white text-emerald-600 shadow-sm" 
                    : "text-neutral-500 hover:text-neutral-900"
                }`}
              >
                الأرباح الصافية
              </button>
            </div>
          </div>

          {/* Interactive SVG Graph Area */}
          <div className="relative h-56 w-full pt-4">
            {/* Absolute positioning tooltips */}
            {hoveredPointIdx !== null && trendData[hoveredPointIdx] && (() => {
              const xPercent = (45 + (hoveredPointIdx * (480 - 45) / (trendData.length - 1))) / 500 * 100;
              return (
                <div 
                  className="absolute z-30 bg-neutral-950 text-white rounded-2xl p-3 shadow-xl border border-white/10 text-xs transition-all duration-150 pointer-events-none"
                  style={{ 
                    left: `${xPercent}%`, 
                    top: "0px",
                    transform: "translateX(-50%)",
                  }}
                >
                  <div className="space-y-1 text-center" dir="rtl">
                    <p className="text-[10px] text-neutral-400 font-bold">{trendData[hoveredPointIdx].date}</p>
                    <p className="font-mono font-black text-sm text-white">
                      {(trendMetric === "sales" ? trendData[hoveredPointIdx].sales : trendData[hoveredPointIdx].profit).toLocaleString("en-US")} ر.س
                    </p>
                    <p className="text-[9px] text-neutral-300 font-medium">
                      {trendMetric === "sales" ? "إجمالي المبيعات" : "الأرباح الصافية"} ({trendData[hoveredPointIdx].count} عملية)
                    </p>
                    {!trendData[hoveredPointIdx].isReal && (
                      <span className="text-[8px] bg-neutral-800 text-neutral-400 px-1.5 py-0.5 rounded block mt-1">توضيحي مكمل</span>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* SVG Elements */}
            <svg className="w-full h-full overflow-visible" viewBox="0 0 500 200" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor={trendMetric === "sales" ? "#3b82f6" : "#10b981"} stopOpacity="0.25"/>
                  <stop offset="100%" stopColor={trendMetric === "sales" ? "#3b82f6" : "#10b981"} stopOpacity="0.00"/>
                </linearGradient>
              </defs>

              {/* Grid Lines (Y axis helper lines) */}
              {[0, 0.33, 0.66, 1].map((ratio, i) => {
                const y = 25 + (150 * ratio);
                return (
                  <g key={i}>
                    <line 
                      x1="45" 
                      y1={y} 
                      x2="480" 
                      y2={y} 
                      stroke="#f3f4f6" 
                      strokeWidth="1" 
                    />
                    <text 
                      x="35" 
                      y={y + 4} 
                      textAnchor="end" 
                      className="text-[9px] font-mono fill-neutral-400 font-bold"
                    >
                      {Math.round((1 - ratio) * activeMetricMax).toLocaleString("en-US", { maximumFractionDigits: 0 })}
                    </text>
                  </g>
                );
              })}

              {/* Draw Area with Linear Gradient */}
              {trendData.length > 1 && (() => {
                const points = trendData.map((item, idx) => {
                  const x = 45 + (idx * (480 - 45) / (trendData.length - 1));
                  const val = trendMetric === "sales" ? item.sales : item.profit;
                  const y = 175 - (val / activeMetricMax * 150);
                  return { x, y };
                });

                const areaD = `M ${points[0].x} 175 ` + points.map(p => `L ${p.x} ${p.y}`).join(" ") + ` L ${points[points.length - 1].x} 175 Z`;
                const lineD = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");

                return (
                  <>
                    <path d={areaD} fill="url(#chartGrad)" />
                    <path d={lineD} fill="none" stroke={trendMetric === "sales" ? "#3b82f6" : "#10b981"} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                    
                    {/* Circle Vertex Nodes */}
                    {points.map((p, idx) => (
                      <g key={idx}>
                        <circle 
                          cx={p.x} 
                          cy={p.y} 
                          r={hoveredPointIdx === idx ? 5 : 3.5} 
                          fill={trendMetric === "sales" ? "#2563eb" : "#059669"} 
                          stroke="white" 
                          strokeWidth="1.5" 
                        />
                        {hoveredPointIdx === idx && (
                          <circle 
                            cx={p.x} 
                            cy={p.y} 
                            r="10" 
                            fill={trendMetric === "sales" ? "#3b82f6" : "#10b981"} 
                            fillOpacity="0.15" 
                            className="animate-ping" 
                          />
                        )}
                      </g>
                    ))}
                  </>
                );
              })()}

              {/* Invisible Catcher columns for smooth hovering */}
              {trendData.map((item, idx) => {
                const colWidth = (480 - 45) / trendData.length;
                const x = 45 + (idx * (480 - 45) / (trendData.length - 1)) - colWidth / 2;
                return (
                  <rect
                    key={idx}
                    x={x}
                    y="10"
                    width={colWidth}
                    height="175"
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredPointIdx(idx)}
                    onMouseLeave={() => setHoveredPointIdx(null)}
                  />
                );
              })}

              {/* Date labels under the chart */}
              {trendData.map((item, idx) => {
                if (trendData.length > 6 && idx % 2 !== 0 && idx !== trendData.length - 1) return null; // reduce label density
                const x = 45 + (idx * (480 - 45) / (trendData.length - 1));
                return (
                  <text
                    key={idx}
                    x={x}
                    y="192"
                    textAnchor="middle"
                    className="text-[9px] font-bold fill-neutral-450 font-sans"
                  >
                    {item.date}
                  </text>
                );
              })}
            </svg>
          </div>
        </div>

        {/* Provider Performance Panel (1/3 width on large screens) */}
        <div className="bg-white rounded-3xl p-6 border border-neutral-200/50 shadow-xs flex flex-col justify-between">
          <div className="border-b border-neutral-50 pb-4 mb-4">
            <h3 className="text-sm font-black text-neutral-950 font-sans tracking-tight">توزيع الحصة السوقية للمزودين</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">مقارنة أداء وتكاليف بوابات التقسيط (تمارا، تابي، إمكان)</p>
          </div>

          <div className="space-y-4 flex-1 flex flex-col justify-center">
            {providerStats.map((p) => {
              // Brand styles
              let brandColor = "bg-neutral-250";
              let textBrandColor = "text-neutral-805";
              let fillBarColor = "bg-neutral-900";
              
              if (p.name === "تابي") {
                brandColor = "bg-[#05ffd2]/15";
                textBrandColor = "text-neutral-950";
                fillBarColor = "bg-[#05ffd2]";
              } else if (p.name === "تمارا") {
                brandColor = "bg-[#ffaa47]/15";
                textBrandColor = "text-[#d97706]";
                fillBarColor = "bg-[#ffaa47]";
              } else if (p.name === "إمكان") {
                brandColor = "bg-neutral-900";
                textBrandColor = "text-neutral-950";
                fillBarColor = "bg-neutral-950";
              }

              return (
                <div key={p.name} className="space-y-1.5 p-3 rounded-2xl hover:bg-neutral-50 transition-colors">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2">
                      <span className={`px-2.5 py-0.5 rounded-lg text-[10.5px] font-black border border-neutral-250/10 ${p.name === "إمكان" ? "bg-neutral-950 text-white" : `${brandColor} ${textBrandColor}`}`}>
                        {p.name}
                      </span>
                      <span className="text-[10px] text-neutral-400 font-bold">{p.count} عملية</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-xs font-black text-neutral-950">{p.share}%</span>
                      <span className="text-[9px] text-neutral-400">من السوق</span>
                    </div>
                  </div>

                  {/* Proportional Bar */}
                  <div className="w-full h-2 bg-neutral-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${fillBarColor}`} 
                      style={{ width: `${p.share}%` }}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-2 pt-1 text-center text-[9px] font-bold">
                    <div>
                      <p className="text-neutral-400 leading-none">مبيعات</p>
                      <p className="text-neutral-800 mt-0.5 font-mono">{p.sales.toLocaleString("en-US")} ر.س</p>
                    </div>
                    <div>
                      <p className="text-neutral-400 leading-none">أرباح</p>
                      <p className="text-emerald-700 mt-0.5 font-mono">+{p.profit.toLocaleString("en-US")} ر.س</p>
                    </div>
                    <div>
                      <p className="text-neutral-400 leading-none">رسوم بوابة</p>
                      <p className="text-red-600 mt-0.5 font-mono">{p.fees.toLocaleString("en-US")} ر.س</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

      {/* Main KPI Stats Row Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4" id="kpi-stats-metrics-grid">
        
        {/* Stat 1: Sales */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs flex flex-col justify-between h-32 hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-neutral-400 text-[10px] font-black tracking-wider">المبيعات</span>
            <DollarSign className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex justify-between items-end gap-2">
            <div>
              <div className="flex items-baseline gap-1.5 text-neutral-950 font-black">
                <span className="text-xl lg:text-2xl tracking-tight leading-none text-neutral-950 font-black">{totalSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-sans font-bold text-neutral-450">ر.س</span>
              </div>
              <p className="text-[8.5px] text-neutral-400 mt-1 font-bold">إجمالي قيمة المبيعات</p>
            </div>
            <div className="w-20 h-8 opacity-80 self-end">
              <svg className="w-full h-full overflow-visible">
                <path
                  d={getSparklinePath((op) => op.packageAmount, 80, 32)}
                  fill="none"
                  stroke="#3b82f6"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Stat 2: Profits */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs flex flex-col justify-between h-32 hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-neutral-400 text-[10px] font-black tracking-wider">الأرباح الفردية والتجميعية</span>
            <TrendingUp className="w-4 h-4 text-emerald-600 animate-pulse" />
          </div>
          <div className="flex justify-between items-end gap-2">
            <div className="space-y-1">
              <div className="flex items-baseline gap-1 text-neutral-950 font-black">
                <span className={`text-lg lg:text-xl tracking-tight leading-none font-bold font-black ${netProfit >= 0 ? "text-emerald-700" : "text-red-600"}`}>
                  {netProfit >= 0 ? "+" : ""}{netProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-[10px] font-sans font-bold text-neutral-450">ر.س</span>
              </div>
              <p className="text-[8px] text-neutral-400 font-bold leading-none">صافي أرباح التاجر الصافية</p>
              <p className="text-[7px] text-emerald-600 font-extrabold">الدفعة الأولى يتحملها العميل</p>
            </div>
            <div className="w-20 h-8 opacity-80 self-end">
              <svg className="w-full h-full overflow-visible">
                <path
                  d={getSparklinePath((op) => getOperationProfit(op), 80, 32)}
                  fill="none"
                  stroke="#10b981"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Stat 3: Down Payment */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs flex flex-col justify-between h-32 hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-neutral-400 text-[10px] font-black tracking-wider">الدفعة الأولى</span>
            <Banknote className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex justify-between items-end gap-2">
            <div>
              <div className="flex items-baseline gap-1.5 text-neutral-950 font-black">
                <span className="text-xl lg:text-2xl tracking-tight leading-none text-neutral-950 font-black">{totalDownPayments.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-sans font-bold text-neutral-450">ر.س</span>
              </div>
              <p className="text-[8.5px] text-neutral-400 mt-1 font-bold">إجمالي الدفعات الأولى</p>
            </div>
            <div className="w-20 h-8 opacity-80 self-end">
              <svg className="w-full h-full overflow-visible">
                <path
                  d={getSparklinePath((op) => op.downPayment, 80, 32)}
                  fill="none"
                  stroke="#f59e0b"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Stat 4: Service Fees */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs flex flex-col justify-between h-32 hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-neutral-400 text-[10px] font-black tracking-wider">رسوم الخدمات</span>
            <Calculator className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex justify-between items-end gap-2">
            <div>
              <div className="flex items-baseline gap-1.5 text-neutral-950 font-black">
                <span className="text-xl lg:text-2xl tracking-tight leading-none text-neutral-950 font-black">{(totalInstallmentAmount - totalSales).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-sans font-bold text-neutral-450">ر.س</span>
              </div>
              <p className="text-[8.5px] text-neutral-400 mt-1 font-bold">إجمالي رسوم التقسيط</p>
            </div>
            <div className="w-20 h-8 opacity-80 self-end">
              <svg className="w-full h-full overflow-visible">
                <path
                  d={getSparklinePath((op) => op.totalInstallmentAmount - op.packageAmount, 80, 32)}
                  fill="none"
                  stroke="#6366f1"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Stat 5: Provider Fees */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs flex flex-col justify-between h-32 hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-neutral-400 text-[10px] font-black tracking-wider">رسوم مزودي الخدمة</span>
            <Calculator className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex justify-between items-end gap-2">
            <div>
              <div className="flex items-baseline gap-1.5 text-neutral-950 font-black">
                <span className="text-xl lg:text-2xl tracking-tight leading-none text-red-650 font-black">{totalProviderFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-sans font-bold text-neutral-450">ر.س</span>
              </div>
              <p className="text-[8.5px] text-neutral-400 mt-1 font-bold">إجمالي رسوم مزود الخدمة (6.99%)</p>
            </div>
            <div className="w-20 h-8 opacity-80 self-end">
              <svg className="w-full h-full overflow-visible">
                <path
                  d={getSparklinePath((op) => getOperationFee(op), 80, 32)}
                  fill="none"
                  stroke="#ef4444"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

        {/* Stat 6: Commission Fees */}
        <div className="bg-white p-5 rounded-2xl border border-neutral-200/50 shadow-xs flex flex-col justify-between h-32 hover:border-neutral-300 transition-colors">
          <div className="flex justify-between items-center w-full">
            <span className="text-neutral-400 text-[10px] font-black tracking-wider">رسوم العمولة</span>
            <Calculator className="w-4 h-4 text-neutral-400" />
          </div>
          <div className="flex justify-between items-end gap-2">
            <div>
              <div className="flex items-baseline gap-1.5 text-neutral-950 font-black">
                <span className="text-xl lg:text-2xl tracking-tight leading-none text-red-650 font-black">{totalCommissionFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-sans font-bold text-neutral-450">ر.س</span>
              </div>
              <p className="text-[8.5px] text-neutral-400 mt-1 font-bold">إجمالي رسوم العمولة المسجلة</p>
            </div>
            <div className="w-20 h-8 opacity-80 self-end">
              <svg className="w-full h-full overflow-visible">
                <path
                  d={getSparklinePath((op) => op.commissionFee || 0, 80, 32)}
                  fill="none"
                  stroke="#ec4899"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>
          </div>
        </div>

      </div>

      {/* Dynamic Group Financial Summaries Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-xs font-black text-neutral-950 font-sans tracking-tight">ملخص مالي مبسط لجميع المجموعات</h3>
            <p className="text-[10px] text-neutral-400 mt-0.5">يعرض كافة المجموعات المالية المتاحة وحالة مبيعات كل منها</p>
          </div>
          <span className="text-[9px] text-neutral-400">All groups status</span>
        </div>

        {(() => {
          const activeGroups = finalGroupsList.filter((g) => {
            const groupOps = filteredByDate.filter((op) => op.packageAmount === g.packageAmount);
            return groupOps.length > 0;
          });

          if (activeGroups.length === 0) {
            return (
              <div className="p-8 text-center bg-neutral-50 rounded-2xl border border-dashed border-neutral-200">
                <p className="text-neutral-400 text-xs">لا توجد مجموعات متاحة.</p>
              </div>
            );
          }

          const visibleGroups = isGroupsExpanded ? activeGroups : activeGroups.slice(0, 2);

          return (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
                {visibleGroups.map((g) => {
                  const groupOps = filteredByDate.filter((op) => op.packageAmount === g.packageAmount);
                  const totalGroupSales = groupOps.reduce((sum, op) => sum + op.totalInstallmentAmount, 0);
                  const totalGroupNet = groupOps.reduce((sum, op) => sum + op.packageAmount, 0);
                  const totalGroupDown = groupOps.reduce((sum, op) => sum + op.downPayment, 0);
                  const totalGroupTransfer = groupOps.reduce((sum, op) => sum + (op.packageAmount - op.downPayment), 0);
                  const totalGroupFees = groupOps.reduce((sum, op) => sum + getOperationFee(op), 0);
                  const totalGroupCommissions = groupOps.reduce((sum, op) => sum + (op.commissionFee || 0), 0);
                  const totalGroupProfitWithDown = totalGroupSales - totalGroupNet - totalGroupFees - totalGroupCommissions;

                  return (
                    <div 
                      key={g.id} 
                      className="bg-white rounded-2xl border border-neutral-200/50 p-5 shadow-xs flex flex-col justify-between space-y-5 hover:border-neutral-300 transition-colors animate-fadeIn"
                      id={`group-card-${g.id}`}
                    >
                      <div className="flex justify-between items-center border-b border-neutral-50 pb-3">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-lg bg-neutral-50 border border-neutral-100 flex items-center justify-center">
                            <Layers className="w-4 h-4 text-neutral-600" />
                          </div>
                          <h4 className="text-sm font-black text-neutral-950 font-sans">{`فئة ${g.packageAmount.toLocaleString("en-US")} ر.س`}</h4>
                        </div>
                        <span className="text-[9.5px] font-black bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded">
                          {groupOps.length} عملية{(groupOps.length > 2 && groupOps.length < 11) ? "ات" : ""}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-x-6 gap-y-4">
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-neutral-400 font-bold">اجمالي تمويل العميل</p>
                          <p className="text-xs font-black text-neutral-950">{totalGroupSales.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-neutral-400 font-bold">صافي تمويل العميل</p>
                          <p className="text-xs font-black text-neutral-950">{totalGroupNet.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-neutral-400 font-bold">الدفعة المخصومة</p>
                          <p className="text-xs font-black text-neutral-950">{totalGroupDown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                        </div>
                        <div className="space-y-0.5">
                          <p className="text-[9px] text-neutral-400 font-bold">الصافي للعملاء</p>
                          <p className="text-xs font-black text-amber-600">{totalGroupTransfer.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                        </div>
                        <div className="space-y-0.5 border-t border-neutral-50 pt-3">
                          <p className="text-[9px] text-neutral-400 font-bold">رسوم مزود الخدمة (6.99%)</p>
                          <p className="text-xs font-black text-red-600">{totalGroupFees.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                        </div>
                        <div className="space-y-0.5 border-t border-neutral-50 pt-3">
                          <p className="text-[9px] text-neutral-400 font-bold">رسوم العمولة</p>
                          <p className="text-xs font-black text-red-600">{totalGroupCommissions.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                        </div>
                        <div className="space-y-1 bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/40 col-span-2 text-center" dir="rtl">
                          <p className="text-[10px] text-emerald-700 font-black">صافي أرباح التاجر النهائية المحققة</p>
                          <p className="font-black text-emerald-700 text-sm mt-0.5">
                            {totalGroupProfitWithDown.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                          </p>
                          <p className="text-[7.5px] text-neutral-400 mt-0.5 leading-relaxed">
                            * الدفعة الأولى يتحملها العميل ولا تخصم من أرباحك الصافية.
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {activeGroups.length > 2 && (
                <div className="flex justify-center pt-2">
                  <button
                    type="button"
                    onClick={() => setIsGroupsExpanded(!isGroupsExpanded)}
                    className="flex items-center gap-1.5 px-5 py-2.5 bg-white hover:bg-neutral-50 text-neutral-800 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs border border-neutral-200/60"
                  >
                    {isGroupsExpanded ? (
                      <>
                        <ChevronUp className="w-4 h-4 text-neutral-500 animate-bounce" />
                        <span>أقل</span>
                      </>
                    ) : (
                      <>
                        <ChevronDown className="w-4 h-4 text-neutral-500 animate-bounce" />
                        <span>المزيد ({activeGroups.length - 2})</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>
          );
        })()}
      </div>

      {/* Recent Activity Dashboard Section */}
      <div className="bg-white rounded-2xl border border-neutral-200/60 overflow-hidden shadow-xs hover:shadow-sm transition-all duration-200">
        
        {/* Expanded Header with filters & title */}
        <div className="p-5 border-b border-neutral-100 space-y-4">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3">
            <div className="flex items-center gap-2.5">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-neutral-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-neutral-950"></span>
              </span>
              <div>
                <h3 className="text-xs font-black text-neutral-950 font-sans tracking-tight">سجل العمليات المضافة الأخيرة</h3>
                <p className="text-[10px] text-neutral-400 mt-0.5 font-sans">انقر على أي عملية لمعاينة تفاصيل العقد والوصولات كاملة طباعياً</p>
              </div>
            </div>

            {/* Deleted operations log button & Operations Count badge */}
            <div className="flex flex-wrap items-center gap-2.5 self-end sm:self-auto">
              <button
                type="button"
                onClick={() => {
                  setRestoreError(null);
                  setRestoreSuccess(null);
                  setShowDeletedModal(true);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 hover:border-red-200 text-red-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>السجلات المحذوفة</span>
                {deletedOperations.length > 0 && (
                  <span className="bg-red-600 text-white text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center font-sans">
                    {deletedOperations.length}
                  </span>
                )}
              </button>

              <div className="flex items-center gap-1.5 text-xs">
                <span className="text-[10.5px] font-bold text-neutral-400">إجمالي السجل:</span>
                <span className="text-xs font-black bg-neutral-100 text-neutral-900 px-2.5 py-0.5 rounded-full">
                  {operations.length} عملية مبيعات مسجلة
                </span>
              </div>
            </div>
          </div>
        </div>

        {filteredOperations.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 text-xs flex flex-col items-center justify-center space-y-2">
            <SlidersHorizontal className="w-8 h-8 text-neutral-300 stroke-[1.5]" />
            <p className="font-bold">لا توجد نتائج مطابقة للبحث أو التصفية الحالية.</p>
            <p className="text-[10px] text-neutral-400 animate-pulse">جرب كتابة رمز آخر أو اختيار معيار مغاير من الأعلى.</p>
          </div>
        ) : (
          (() => {
            const visibleOperations = isOpsExpanded ? filteredOperations : filteredOperations.slice(0, 2);
            return (
              <div>
                {/* Desktop View (Table style - hidden on mobile screens) */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-right border-collapse text-xs">
                    <thead>
                      <tr className="bg-[#fafafa]/80 border-b border-neutral-100 text-neutral-450 text-[10px] font-black font-sans uppercase tracking-wider">
                        <th className="p-4">رمز العملية</th>
                        <th className="p-4">الفئة المبيعة</th>
                        <th className="p-4 text-center">مزود التقسيط</th>
                        <th className="p-4 text-left">الدفعة الأولى</th>
                        <th className="p-4 text-left">رسوم المزود</th>
                        <th className="p-4 text-left">رسوم العمولة</th>
                        <th className="p-4 text-left font-sans">صافي أرباح التاجر</th>
                        <th className="p-4 text-center">القسط شهريّ</th>
                        <th className="p-4 text-center">الإجراء</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 text-neutral-700">
                      {visibleOperations.map((op) => {
                    const groupInfo = getGroupDetails(op.packageAmount, op.totalInstallmentAmount);
                    const badgeStyles = getProviderBadge(op.provider);

                    return (
                      <tr 
                        key={op.id} 
                        onClick={() => setSelectedOp(op)}
                        className="hover:bg-neutral-50/70 transition-all cursor-pointer group/row"
                      >
                        <td className="p-4">
                          <span className="font-mono bg-neutral-100 text-neutral-900 font-extrabold px-2.5 py-1 rounded-lg text-[10.5px] border border-neutral-250/10 group-hover/row:bg-neutral-200 transition-colors">
                            {op.id}
                          </span>
                        </td>
                        <td className="p-4">
                          <div className="flex items-center gap-2.5">
                            <span className="w-2 h-2 rounded-full bg-neutral-900"></span>
                            <div>
                              <p className="font-black text-neutral-950 text-xs leading-none">
                                {groupInfo.id === "custom" ? "مبلغ مخصص" : `فئة ${groupInfo.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`}
                              </p>
                              <p className="text-[10px] text-neutral-400 mt-1">سعر الكاش: {op.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-4 text-center">
                          <span className={`inline-block px-2.5 py-0.5 rounded-md text-[10.5px] font-black border ${badgeStyles.bg} tracking-tight`}>
                            {op.provider}
                          </span>
                        </td>
                        <td className="p-4 text-left font-bold text-neutral-600">
                          {op.downPayment > 0 ? `${op.downPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س` : "0.00 ر.س"}
                        </td>
                        <td className="p-4 text-left font-black text-red-600">
                          {getOperationFee(op).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </td>
                        <td className="p-4 text-left font-black text-red-600">
                          {(op.commissionFee || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </td>
                        <td className={`p-4 text-left font-black ${getOperationProfit(op) >= 0 ? "text-emerald-600" : "text-red-600"}`}>
                          {getOperationProfit(op).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </td>
                        <td className="p-4 text-center">
                          <p className="font-black text-neutral-950 leading-none">{op.monthlyInstallment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</p>
                          <p className="text-[9px] text-neutral-400 mt-1 font-sans">12 شهراً</p>
                        </td>
                        <td className="p-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button 
                              type="button"
                              className="p-1.5 px-3 bg-neutral-50 hover:bg-neutral-950 hover:text-white rounded-lg text-[10px] font-bold border border-neutral-200 transition-all flex items-center gap-1 cursor-pointer"
                            >
                              <span>عرض العقد والمطابقة</span>
                              <ExternalLink className="w-3 h-3 text-[#2563eb]" />
                            </button>
                            {onDeleteOperation && (
                              <button
                                type="button"
                                onClick={(e) => handleDeleteClick(e, op)}
                                className="p-1.5 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-lg border border-red-100 hover:border-red-600 transition-all cursor-pointer"
                                title="حذف العملية"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Bento Card Style - hidden on desktop screens) */}
            <div className="md:hidden p-4 space-y-3.5 bg-neutral-50/50">
              {visibleOperations.map((op) => {
                const groupInfo = getGroupDetails(op.packageAmount, op.totalInstallmentAmount);
                const badgeStyles = getProviderBadge(op.provider);

                return (
                  <div
                    key={op.id}
                    onClick={() => setSelectedOp(op)}
                    className="bg-white p-4 rounded-xl border border-neutral-200/60 shadow-xs space-y-3 relative overflow-hidden active:scale-98 transition-all animate-fadeIn"
                  >
                    <div className="absolute top-0 left-0 w-1.5 h-full bg-neutral-950 animate-pulse"></div>

                    <div className="flex justify-between items-center pr-1.5">
                      <span className="bg-neutral-100 text-neutral-900 font-extrabold px-2 py-0.5 rounded text-[10.5px]">
                        {op.id}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[9.5px] font-black border ${badgeStyles.bg}`}>
                        {op.provider}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-y-5 gap-x-2 pt-3 border-t border-neutral-50 mb-2 text-center items-center justify-center">
                      <div className="space-y-1">
                        <p className="text-[10px] text-neutral-400 font-bold text-center">اجمالي تمويل العميل</p>
                        <p className="font-black text-neutral-900 text-base">
                          {op.totalInstallmentAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-neutral-400 font-bold text-center">صافي تمويل العميل</p>
                        <p className="font-black text-neutral-900 text-base">
                          {op.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-[10px] text-neutral-400 font-bold text-center">الدفعة المخصومة من صافي تمويل العميل</p>
                        <p className="font-black text-neutral-900 text-base">
                          {op.downPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-[10px] text-neutral-400 font-bold text-center">الصافي للعميل بعد خصم الدفعة الأولى</p>
                        <p className="font-black text-[#e88024] text-base">
                          {Math.max(0, op.packageAmount - op.downPayment).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </p>
                      </div>

                      <div className="space-y-1 col-span-2 border-t border-neutral-100 pt-2 flex justify-between items-center px-1">
                        <p className="text-[10px] text-neutral-400 font-bold">رسوم مزود الخدمة</p>
                        <p className="font-black text-[#dc2626] text-sm">
                          {getOperationFee(op).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </p>
                      </div>
                      <div className="space-y-1 col-span-2 border-t border-neutral-100 pt-2 flex justify-between items-center px-1">
                        <p className="text-[10px] text-neutral-400 font-bold">رسوم العمولة</p>
                        <p className="font-black text-[#dc2626] text-sm">
                          {(op.commissionFee || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </p>
                      </div>
                      <div className="space-y-1 col-span-2 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/40 text-center" dir="rtl">
                        <p className="text-[9px] text-emerald-700 font-extrabold">صافي أرباح التاجر النهائية المحققة</p>
                        <p className="font-black text-emerald-700 text-sm mt-0.5">
                          {getOperationProfit(op).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                        </p>
                        <p className="text-[7.5px] text-neutral-400 mt-0.5 leading-relaxed">
                          * الدفعة الأولى يتحملها العميل ولا تخصم من أرباحك الصافية.
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-between items-center pt-2 border-t border-dashed border-neutral-100 pr-1.5">
                      {onDeleteOperation ? (
                        <button
                          type="button"
                          onClick={(e) => handleDeleteClick(e, op)}
                          className="text-[10px] text-red-600 hover:text-red-750 flex items-center gap-1 font-black p-1 px-2.5 bg-red-50 hover:bg-red-100/80 rounded-lg cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>حذف العملية</span>
                        </button>
                      ) : <span />}
                      <span className="text-[9px] text-neutral-400 flex items-center gap-1 font-bold">
                        <span>انقر لمعاينة العقد المالي كاملاً</span>
                        <ChevronLeft className="w-3 h-3" />
                      </span>
                    </div>

                  </div>
                );
              })}
            </div>

            {filteredOperations.length > 2 && (
              <div className="flex justify-center p-5 border-t border-neutral-100">
                <button
                  type="button"
                  onClick={() => setIsOpsExpanded(!isOpsExpanded)}
                  className="flex items-center gap-1.5 px-5 py-2.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs border border-neutral-200/50"
                >
                  {isOpsExpanded ? (
                    <>
                      <ChevronUp className="w-4 h-4 text-neutral-500 animate-bounce" />
                      <span>أقل</span>
                    </>
                  ) : (
                    <>
                      <ChevronDown className="w-4 h-4 text-neutral-500 animate-bounce" />
                      <span>المزيد ({filteredOperations.length - 2})</span>
                    </>
                  )}
                </button>
              </div>
            )}
          </div>
        );
      })())}
      </div>

      {/* DETAILED RECEIPT DIALOG MODAL */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {selectedOp && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedOp(null)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
            ></motion.div>

            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white rounded-2xl border border-neutral-200 max-w-lg w-full overflow-hidden shadow-2xl relative z-10 flex flex-col max-h-[85vh] text-right"
              dir="rtl"
            >
              
              {/* Header */}
              <div className="p-4 border-b border-neutral-100 flex justify-between items-center bg-neutral-50">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-neutral-900 flex items-center justify-center text-white">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-neutral-950 font-sans leading-none">تفاصيل العقد والمستحقات المباشرة</h3>
                    <p className="text-[9.5px] text-neutral-400 font-mono mt-1">رمز العملية: {selectedOp.id}</p>
                  </div>
                </div>
                <button
                  onClick={() => setSelectedOp(null)}
                  className="w-8 h-8 rounded-lg hover:bg-neutral-200 flex items-center justify-center text-neutral-500 hover:text-neutral-900 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Scrollable Receipt Body */}
              <div className="p-6 overflow-y-auto space-y-6">
                
                <div className="text-center space-y-1 py-1.5 bg-emerald-50/50 border border-emerald-100/50 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center mx-auto shadow-xs">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <h4 className="text-[11px] font-black text-emerald-950 font-sans">عملية بيع مسجلة ومعتمدة</h4>
                  <p className="text-[9px] text-emerald-500 font-bold">تم تسجيل العقد بنجاح تحت مزود {selectedOp.provider}</p>
                </div>

                {/* Primary financial metrics grid */}
                <div className="border border-neutral-100 rounded-2xl p-6 bg-white space-y-6 shadow-[0px_0px_10px_rgba(0,0,0,0.02)]">
                  <div className="grid grid-cols-2 gap-y-8 gap-x-4 text-center items-center justify-center">
                    <div className="space-y-1">
                      <p className="text-[11px] text-neutral-400 font-bold text-center">اجمالي تمويل العميل</p>
                      <p className="font-black text-neutral-950 text-xl">
                        {selectedOp.totalInstallmentAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-neutral-400 font-bold text-center">صافي تمويل العميل</p>
                      <p className="font-black text-neutral-950 text-xl">
                        {selectedOp.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-neutral-400 font-bold text-center">الدفعة المخصومة من صافي تمويل العميل</p>
                      <p className="font-black text-neutral-950 text-xl">
                        {selectedOp.downPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-neutral-400 font-bold text-center">الصافي للعميل بعد خصم الدفعة الأولى</p>
                      <p className="font-black text-[#e88024] text-xl">
                        {Math.max(0, selectedOp.packageAmount - selectedOp.downPayment).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </p>
                    </div>

                    <div className="space-y-1">
                      <p className="text-[11px] text-neutral-400 font-bold text-center">رسوم مزود الخدمة</p>
                      <p className="font-black text-[#dc2626] text-xl">
                        {getOperationFee(selectedOp).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[11px] text-neutral-400 font-bold text-center">رسوم العمولة</p>
                      <p className="font-black text-[#dc2626] text-xl">
                        {(selectedOp.commissionFee || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </p>
                    </div>
                    <div className="space-y-1 bg-emerald-50/50 p-4 rounded-xl border border-emerald-200/40 col-span-2 text-center" dir="rtl">
                      <p className="text-[11px] text-[#059669] font-black">صافي أرباح التاجر النهائية</p>
                      <p className="font-black text-emerald-700 text-2xl mt-1">
                        {getOperationProfit(selectedOp).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                      </p>
                      <p className="text-[8px] text-neutral-500 mt-1 leading-relaxed">
                        * الدفعة الأولى يتحملها العميل بالكامل وبالتالي لا تخصم من أرباحك الصافية.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Ledger specifications list */}
                <div className="space-y-2.5 text-xs text-neutral-700">
                  <h5 className="text-[10px] font-black text-neutral-450 tracking-wider font-sans">جدول مواصفات العقد</h5>
                  
                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">الفئة المالية</span>
                    <span className="font-bold text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded-md">
                      {selectedOp.packageAmount === 0 || getGroupDetails(selectedOp.packageAmount, selectedOp.totalInstallmentAmount).id === "custom" 
                        ? `مبلغ مخصص (${selectedOp.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س)` 
                        : `فئة كاش ${selectedOp.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س`}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">مزود خدمة التقسيط التمويلي</span>
                    <span className="font-bold text-neutral-900 bg-neutral-100 px-2.5 py-0.5 rounded-md">{selectedOp.provider}</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">الدفعة نقدية (كاش أولى)</span>
                    <span className="font-bold text-neutral-805">
                      {selectedOp.downPayment > 0 ? `${selectedOp.downPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س` : "لا شيء (0.00 ر.س)"}
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">رسوم مزود التقسيط (نسبة مستقطعة)</span>
                    <span className="font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md">
                      {getOperationFee(selectedOp).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">رسوم العمولة المسجلة</span>
                    <span className="font-bold text-red-600 bg-red-50 px-2.5 py-0.5 rounded-md">
                      {(selectedOp.commissionFee || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">قسط السداد الشهري المطلوب</span>
                    <span className="font-bold text-emerald-600 bg-emerald-50 px-2.5 py-0.5 rounded-md">
                      {selectedOp.monthlyInstallment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                    </span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">مدة الأقساط عقدياً</span>
                    <span className="font-bold text-neutral-900">12 شهراً مستقرّة</span>
                  </div>

                  <div className="flex justify-between items-center py-1.5 border-b border-neutral-50">
                    <span className="text-neutral-400">تاريخ تسجيل العقد المالي الفوري</span>
                    <span className="text-neutral-500 font-bold text-[10.5px]">{new Date(selectedOp.date || (selectedOp as any).createdAt).toLocaleString("ar-SA-u-nu-latn")}</span>
                  </div>
                </div>

                {/* Structured Installment visualizer graph indicator */}
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <h5 className="text-[10px] font-black text-neutral-450 tracking-wider font-sans">مخطط دفعات سداد الأقساط (12 استقطاع)</h5>
                    <span className="text-[9px] text-neutral-400">12 items</span>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-1.5 text-center">
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((term) => (
                      <div 
                        key={term} 
                        className={`p-1.5 rounded-lg border text-[10px] ${
                          term <= 1 
                            ? "bg-neutral-950 text-white border-neutral-950" 
                            : "bg-neutral-50 text-neutral-500 border-neutral-100"
                        }`}
                      >
                        <p className="text-[8px] opacity-75 font-sans leading-none">القسط</p>
                        <p className="font-bold mt-0.5">#{term}</p>
                      </div>
                    ))}
                  </div>
                  <p className="text-[9px] text-neutral-400 text-center font-sans">
                    * القسط الأول المباشر يستحق السداد للمطابقة الفورية وتحصيل الفاتورة.
                  </p>
                </div>

              </div>

              {/* Bottom Print/Action bar */}
              <div className="p-4 border-t border-neutral-100 bg-neutral-50 flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="flex-1 h-11 bg-neutral-950 hover:bg-neutral-850 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-98 transition-all"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>طباعة تفاصيل عقد البيع</span>
                </button>
                {onDeleteOperation && (
                  <button
                    type="button"
                    onClick={(e) => handleDeleteClick(e, selectedOp)}
                    className="px-4.5 h-11 bg-red-50 hover:bg-red-600 text-red-650 hover:text-white border border-red-200 hover:border-red-600 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setSelectedOp(null)}
                  className="px-4.5 h-11 bg-white hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-bold border border-neutral-200 cursor-pointer active:scale-98 transition-all"
                >
                  إغلاق النافذة
                </button>
              </div>

            </motion.div>
          </div>
        )}
        </AnimatePresence>,
        document.body
      )}

      {/* DELETE CONFIRMATION DIALOG MODAL */}
      {typeof document !== "undefined" && createPortal(
        <AnimatePresence>
          {opToDelete && (
            <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isDeleting && setOpToDelete(null)}
                className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
              />
              <motion.div
                initial={{ scale: 0.95, y: 15, opacity: 0 }}
                animate={{ scale: 1, y: 0, opacity: 1 }}
                exit={{ scale: 0.95, y: 15, opacity: 0 }}
                transition={{ type: "spring", damping: 25, stiffness: 350 }}
                className="bg-white rounded-3xl border border-neutral-200/50 p-6 max-w-sm w-full overflow-hidden shadow-2xl relative z-10 text-center flex flex-col items-center"
                dir="rtl"
              >
                <div className="w-12 h-12 rounded-full bg-red-50 flex items-center justify-center text-red-600 mb-4 scale-105">
                  <Trash2 className="w-5 h-5 animate-pulse" />
                </div>
                
                <h3 className="text-sm font-black text-neutral-950 mb-2">تأكيد حذف العملية</h3>
                
                <p className="text-xs text-neutral-500 leading-relaxed mb-6 px-2">
                  هل أنت متأكد من رغبتك في حذف العملية رقم{" "}
                  <span className="font-mono font-bold text-neutral-950 bg-neutral-100 px-1.5 py-0.5 rounded text-[11px]">{opToDelete.id}</span>{" "}
                  نهائياً من النظام؟
                  <br />
                  <span className="text-red-500 text-[10px] font-bold mt-2.5 block">
                    * سيتم إعادة احتساب الأرباح وعقود المطالبة بشكل فوري بعد الحذف.
                  </span>
                </p>

                {deleteError && (
                  <div className="w-full text-center text-[11px] text-red-650 bg-red-50 p-2.5 rounded-xl border border-red-100 mb-4 font-bold">
                    {deleteError}
                  </div>
                )}

                <div className="flex gap-2 w-full">
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={handleConfirmDelete}
                    className="flex-1 h-11 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isDeleting ? (
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>نعم، حذف</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={isDeleting}
                    onClick={() => setOpToDelete(null)}
                    className="flex-1 h-11 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold border border-neutral-200/50 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>,
        document.body
      )}

      {/* DELETED RECORDS WINDOW / MODAL */}
      {typeof document !== "undefined" && showDeletedModal && createPortal(
        <AnimatePresence>
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowDeletedModal(false)}
              className="absolute inset-0 bg-neutral-950/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: "spring", damping: 25, stiffness: 350 }}
              className="bg-white rounded-3xl border border-neutral-200/50 p-6 max-w-2xl w-full overflow-hidden shadow-2xl relative z-10 flex flex-col h-[85vh] md:h-[75vh]"
              dir="rtl"
            >
              {/* Modal Header */}
              <div className="flex justify-between items-center pb-4 border-b border-neutral-100">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center text-red-600">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-neutral-950">سجل العمليات المحذوفة</h3>
                    <p className="text-[10px] text-neutral-400">يمكنك استرجاع أي عملية تم حذفها لإعادتها للوحة القيادة فوراً</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowDeletedModal(false)}
                  className="p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 hover:text-neutral-700 transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Success & Error alerts */}
              {(restoreSuccess || restoreError) && (
                <div className="mt-3">
                  {restoreSuccess && (
                    <div className="text-center text-[11px] text-emerald-700 bg-emerald-50 p-2.5 rounded-xl border border-emerald-100 font-bold">
                      {restoreSuccess}
                    </div>
                  )}
                  {restoreError && (
                    <div className="text-center text-[11px] text-red-700 bg-red-50 p-2.5 rounded-xl border border-red-100 font-bold">
                      {restoreError}
                    </div>
                  )}
                </div>
              )}

              {/* Scrollable Deleted List */}
              <div className="flex-1 overflow-y-auto mt-4 pr-1 space-y-3.5 scrollbar-thin">
                {deletedOperations.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-neutral-400 space-y-2.5">
                    <div className="w-12 h-12 rounded-full bg-neutral-50 flex items-center justify-center border border-dashed border-neutral-200">
                      <Trash2 className="w-6 h-6 text-neutral-300 stroke-[1.5]" />
                    </div>
                    <p className="text-xs font-bold text-neutral-500">سلة المهملات فارغة</p>
                    <p className="text-[10px] text-neutral-400">لا توجد أي سجلات محذوفة في مساحة العمل هذه حالياً.</p>
                  </div>
                ) : (
                  deletedOperations.map((op) => {
                    const groupInfo = getGroupDetails(op.packageAmount, op.totalInstallmentAmount);
                    const providerStyle = getProviderBadge(op.provider);
                    const isCurrentlyRestoring = isRestoringId === op.id;

                    return (
                      <div
                        key={op.id}
                        className="p-4 bg-neutral-50 rounded-2xl border border-neutral-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-neutral-50/80 transition-all"
                      >
                        <div className="space-y-2">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10.5px] font-black bg-neutral-200 text-neutral-850 px-2 py-0.5 rounded">
                              {op.id}
                            </span>
                            <span className={`text-[9.5px] font-black px-2 py-0.5 rounded border ${providerStyle.bg}`}>
                              {op.provider}
                            </span>
                          </div>

                          <div className="space-y-1">
                            <p className="text-xs font-black text-neutral-900">
                              اسم العميل: <span className="font-bold text-neutral-700">{cleanClientName(op.clientName) || "غير محدد"}</span>
                            </p>
                            <p className="text-[10.5px] text-neutral-500 font-bold">
                              الفئة: {groupInfo.label} | مبلغ الكاش: {op.packageAmount.toLocaleString("en-US")} ر.س
                            </p>
                            {(op as any).deletedAt && (
                              <p className="text-[9px] text-red-500 font-bold">
                                تم الحذف في: {new Date((op as any).deletedAt).toLocaleString("ar-SA-u-nu-latn")}
                              </p>
                            )}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex items-center justify-end border-t border-neutral-200/40 pt-3 md:pt-0 md:border-t-0">
                          <button
                            type="button"
                            disabled={isRestoringId !== null}
                            onClick={() => handleRestoreClick(op.id)}
                            className="w-full md:w-auto px-4 h-9 bg-neutral-950 hover:bg-neutral-800 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer active:scale-98 transition-all disabled:opacity-50"
                          >
                            {isCurrentlyRestoring ? (
                              <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <>
                                <Sparkles className="w-3.5 h-3.5 text-yellow-400" />
                                <span>استرجاع السجل</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Modal Footer */}
              <div className="pt-4 border-t border-neutral-100 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowDeletedModal(false)}
                  className="px-5 h-10 bg-neutral-100 hover:bg-neutral-200 text-neutral-800 rounded-xl text-xs font-bold border border-neutral-200/50 cursor-pointer active:scale-98 transition-all"
                >
                  إغلاق نافذة السجلات
                </button>
              </div>
            </motion.div>
          </div>
        </AnimatePresence>,
        document.body
      )}

    </div>
  );
}
