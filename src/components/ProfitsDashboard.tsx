import React, { useState, useMemo, useEffect } from "react";
import { Operation, InstallmentProvider } from "../types";
import { 
  getOperationFee as getOperationFeeCentral, 
  getOperationProfitWithDownPayment as getOperationProfitWithDownPaymentCentral,
  formatDate
} from "../utils/financeMath";
import { 
  TrendingUp, 
  Coins, 
  Percent, 
  ArrowUpRight, 
  ArrowDownLeft, 
  Calendar, 
  ShieldCheck, 
  Receipt, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown,
  ChevronUp,
  Sparkles,
  BarChart3,
  Building,
  DollarSign
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface ProfitsDashboardProps {
  operations: Operation[];
  activeProject?: any;
}

const cleanClientName = (name: string): string => {
  if (!name) return "";
  return name.replace(/[0-9]\uFE0F?\u20E3/g, "").replace(/\s+/g, " ").trim();
};

function getDaysInMonthLabel(sampleDate: Date, calendarSystem: string, label: string): { dayNum: number; date: Date }[] {
  if (calendarSystem !== "hijri") {
    const year = sampleDate.getFullYear();
    const month = sampleDate.getMonth();
    const daysCount = new Date(year, month + 1, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => {
      const dayNum = i + 1;
      return { dayNum, date: new Date(year, month, dayNum) };
    });
  }

  let current = new Date(sampleDate);
  const getLabel = (d: Date) => d.toLocaleString("ar-SA-u-ca-islamic-umalqura-nu-latn", { month: "long", year: "numeric" });
  
  for (let i = 0; i < 35; i++) {
    const prev = new Date(current);
    prev.setDate(prev.getDate() - 1);
    if (getLabel(prev) !== label) {
      break;
    }
    current = prev;
  }
  
  const days: { dayNum: number; date: Date }[] = [];
  let dayNum = 1;
  while (getLabel(current) === label && dayNum <= 30) {
    days.push({ dayNum, date: new Date(current) });
    current.setDate(current.getDate() + 1);
    dayNum++;
  }
  return days;
}

export function ProfitsDashboard({ operations, activeProject }: ProfitsDashboardProps) {
  // Helper to construct dynamic labels
  const getLabelForDate = (date: Date) => {
    const calendarSystem = activeProject?.calendarSystem || "gregorian";
    const locale = calendarSystem === "hijri" 
      ? "ar-SA-u-ca-islamic-umalqura-nu-latn" 
      : "ar-SA-u-ca-gregory-nu-latn";
    return date.toLocaleString(locale, { month: "long", year: "numeric" });
  };

  // Map each unique month label to a sample date of that month
  const monthLabelMap = useMemo(() => {
    const mapping: { [label: string]: Date } = {};
    const now = new Date();
    
    mapping[getLabelForDate(now)] = now;

    operations.forEach(op => {
      if (op.date) {
        const d = new Date(op.date);
        if (!isNaN(d.getTime())) {
          const lbl = getLabelForDate(d);
          if (!mapping[lbl]) {
            mapping[lbl] = d;
          }
        }
      }
    });

    return mapping;
  }, [operations, activeProject?.calendarSystem]);

  // Dynamically generate list of months from available operations + current month
  const availableMonths = useMemo(() => {
    const sorted = Object.keys(monthLabelMap).sort((a, b) => {
      const dateA = monthLabelMap[a];
      const dateB = monthLabelMap[b];
      return dateB.getTime() - dateA.getTime();
    });
    return ["الكل", ...sorted];
  }, [monthLabelMap]);

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("pd_selected_month_year");
      if (saved) return saved;
    } catch (e) {}
    return getLabelForDate(new Date());
  });

  const [isProfitsExpanded, setIsProfitsExpanded] = useState<boolean>(false);

  // Sync selection to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("pd_selected_month_year", selectedMonthYear);
    } catch (e) {}
  }, [selectedMonthYear]);

  // Keep selectedMonthYear in sync with preference switches
  useEffect(() => {
    const currentLabel = getLabelForDate(new Date());
    if (selectedMonthYear !== "الكل" && !availableMonths.includes(selectedMonthYear)) {
      setSelectedMonthYear(currentLabel);
    }
  }, [activeProject?.calendarSystem, availableMonths, selectedMonthYear]);

  // Handle month shifting
  const handlePrevMonth = () => {
    const currentIdx = availableMonths.indexOf(selectedMonthYear);
    if (currentIdx < availableMonths.length - 1) {
      setSelectedMonthYear(availableMonths[currentIdx + 1]);
    }
  };

  const handleNextMonth = () => {
    const currentIdx = availableMonths.indexOf(selectedMonthYear);
    if (currentIdx > 0) {
      setSelectedMonthYear(availableMonths[currentIdx - 1]);
    }
  };

  // Helper calculation functions (Matching system rules exactly)
  const getOperationFee = (op: Operation) => {
    return getOperationFeeCentral(op, activeProject);
  };

  const getOperationProfit = (op: Operation) => {
    return getOperationProfitWithDownPaymentCentral(op, activeProject);
  };

  // Filter operations for selected month
  const monthlyOperations = useMemo(() => {
    if (selectedMonthYear === "الكل") {
      return operations;
    }
    return operations.filter(op => {
      if (!op.date) return false;
      const d = new Date(op.date);
      if (isNaN(d.getTime())) return false;
      return getLabelForDate(d) === selectedMonthYear;
    });
  }, [operations, selectedMonthYear, monthLabelMap, activeProject?.calendarSystem]);

  // Aggregate monthly stats
  const stats = useMemo(() => {
    let salesTotal = 0; // Cost of packages (المبيعات / رأس المال المدفوع)
    let installmentsTotal = 0; // Total finance amount (إجمالي التمويل المستحق)
    let netProfitTotal = 0; // Total net profit
    let providerFeesTotal = 0; // Provider fees
    let commissionFeesTotal = 0; // Client commission fees
    let count = monthlyOperations.length;

    monthlyOperations.forEach(op => {
      salesTotal += op.packageAmount || 0;
      installmentsTotal += op.totalInstallmentAmount || 0;
      netProfitTotal += getOperationProfit(op);
      providerFeesTotal += getOperationFee(op);
      commissionFeesTotal += op.commissionFee || 0;
    });

    const grossProfit = installmentsTotal - salesTotal;
    const margin = salesTotal > 0 ? (netProfitTotal / salesTotal) * 100 : 0;

    return {
      salesTotal,
      installmentsTotal,
      netProfitTotal,
      providerFeesTotal,
      commissionFeesTotal,
      grossProfit,
      margin,
      count
    };
  }, [monthlyOperations]);

  // Statistics breakdown by provider
  const providerStats = useMemo(() => {
    const data: Record<string, { count: number; sales: number; profit: number; fees: number }> = {
      "تمارا": { count: 0, sales: 0, profit: 0, fees: 0 },
      "تابي": { count: 0, sales: 0, profit: 0, fees: 0 },
      "إمكان": { count: 0, sales: 0, profit: 0, fees: 0 },
    };

    monthlyOperations.forEach(op => {
      const p = op.provider;
      if (data[p]) {
        data[p].count += 1;
        data[p].sales += op.packageAmount || 0;
        data[p].profit += getOperationProfit(op);
        data[p].fees += getOperationFee(op);
      }
    });

    return Object.keys(data).map(provider => ({
      name: provider,
      ...data[provider]
    }));
  }, [monthlyOperations]);

  // Daily profits inside month for SVG visualization
  const dailyProfits = useMemo(() => {
    const calendarSystem = activeProject?.calendarSystem || "gregorian";

    if (selectedMonthYear === "الكل") {
      // Group by month label from availableMonths (excluding "الكل")
      // To keep newest at the right on the chart, let's reverse the availableMonths (excluding "الكل")
      const months = [...availableMonths].filter(m => m !== "الكل").reverse();
      
      if (months.length === 0) return [];
      
      return months.map((m, index) => {
        let profit = 0;
        let sales = 0;
        let orders = 0;
        
        operations.forEach(op => {
          if (!op.date) return;
          const d = new Date(op.date);
          if (!isNaN(d.getTime()) && getLabelForDate(d) === m) {
            profit += getOperationProfit(op);
            sales += op.packageAmount || 0;
            orders += 1;
          }
        });
        
        return {
          day: index + 1,
          label: m,
          profit,
          sales,
          orders
        };
      });
    }

    const sampleDate = monthLabelMap[selectedMonthYear] || new Date();
    const daysList = getDaysInMonthLabel(sampleDate, calendarSystem, selectedMonthYear);

    const daysArray = daysList.map(({ dayNum, date }) => {
      let profit = 0;
      let sales = 0;
      let orders = 0;

      monthlyOperations.forEach(op => {
        if (!op.date) return;
        const d = new Date(op.date);
        
        let match = false;
        if (calendarSystem === "hijri") {
          try {
            const hDayStr = d.toLocaleDateString("en-US-u-ca-islamic-umalqura", { day: "numeric" });
            match = parseInt(hDayStr) === dayNum;
          } catch (e) {
            match = d.getDate() === dayNum;
          }
        } else {
          match = d.getDate() === dayNum;
        }

        if (match) {
          profit += getOperationProfit(op);
          sales += op.packageAmount || 0;
          orders += 1;
        }
      });

      return {
        day: dayNum,
        label: `${dayNum}`,
        profit,
        sales,
        orders
      };
    });

    return daysArray;
  }, [operations, monthlyOperations, selectedMonthYear, availableMonths, monthLabelMap, activeProject?.calendarSystem]);

  // SVG dimensions & path builders
  const maxDailyProfit = useMemo(() => {
    const profits = dailyProfits.map(d => d.profit);
    return Math.max(...profits, 500);
  }, [dailyProfits]);

  const svgPath = useMemo(() => {
    if (dailyProfits.length === 0) return "";
    const width = 600;
    const height = 150;
    const paddingX = 20;
    const paddingY = 20;
    const step = (width - paddingX * 2) / (dailyProfits.length - 1);

    const points = dailyProfits.map((d, index) => {
      const x = paddingX + index * step;
      const ratio = maxDailyProfit > 0 ? d.profit / maxDailyProfit : 0;
      const y = height - paddingY - ratio * (height - paddingY * 2);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    });

    return `M ${points.join(" L ")}`;
  }, [dailyProfits, maxDailyProfit]);

  return (
    <div className="space-y-6" id="profits-dashboard-component" dir="rtl">
      
      {/* Month Navigation Panel */}
      <div className="bg-white p-4 rounded-3xl border border-neutral-100 shadow-[0px_4px_20px_rgba(0,0,0,0.01)] flex flex-col md:flex-row justify-between items-center gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-[#10b981]/15 text-[#10b981] rounded-2xl">
            <Coins className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-black text-neutral-900 tracking-tight">الأرباح الشهرية وتفاصيل العوائد</h2>
            <p className="text-xs text-neutral-500 font-medium mt-0.5">حلل صافي أرباحك وعوائد باقات التمويل بشكل تفصيلي وموثق</p>
          </div>
        </div>

        {/* Dynamic Month Selector Controls */}
        <div className="flex items-center gap-2 w-full md:w-auto">
          <button
            onClick={handlePrevMonth}
            disabled={availableMonths.indexOf(selectedMonthYear) === availableMonths.length - 1}
            className="p-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="الشهر السابق"
          >
            <ChevronRight className="w-4 h-4 text-neutral-700" />
          </button>

          <div className="relative flex-1 md:w-56">
            <select
              value={selectedMonthYear}
              onChange={(e) => setSelectedMonthYear(e.target.value)}
              className="w-full bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-xl px-4 py-2.5 text-xs font-black text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-[#10b981]/20 transition-all appearance-none cursor-pointer text-center"
            >
              {availableMonths.map((m) => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>
          </div>

          <button
            onClick={handleNextMonth}
            disabled={availableMonths.indexOf(selectedMonthYear) === 0}
            className="p-2.5 rounded-xl border border-neutral-200 bg-white hover:bg-neutral-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
            title="الشهر التالي"
          >
            <ChevronLeft className="w-4 h-4 text-neutral-700" />
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Card 1: Net profit */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_25px_rgba(0,0,0,0.01)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-[#10b981]/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold text-neutral-500">صافي الأرباح (الربح الفعلي)</span>
            <div className="p-2 bg-[#10b981]/10 text-[#10b981] rounded-xl">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 relative">
            <div className="text-2xl font-black text-neutral-900 flex items-center gap-1.5 flex-wrap">
              <div className="flex items-baseline gap-1">
                <span>{stats.netProfitTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                <span className="text-xs font-bold text-neutral-400">ر.س</span>
              </div>
              <span className="text-[10px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded-md font-bold">
                {(stats.installmentsTotal - stats.providerFeesTotal) > 0 ? ((stats.netProfitTotal / (stats.installmentsTotal - stats.providerFeesTotal)) * 100).toFixed(1) : "0.0"}%
              </span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-[#10b981] font-bold">
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>أرباح مصفاة ومؤكدة لهذا الشهر</span>
            </div>
          </div>
        </div>

        {/* Card 2: Total Package Capital */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_25px_rgba(0,0,0,0.01)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-blue-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold text-neutral-500">مجموع باقات البيع (رأس المال)</span>
            <div className="p-2 bg-blue-500/10 text-blue-600 rounded-xl">
              <Receipt className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 relative">
            <div className="text-2xl font-black text-neutral-900 flex items-baseline gap-1">
              <span>{stats.salesTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-bold text-neutral-400">ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-blue-600 font-bold">
              <span>{stats.count} عمليات تمويل مسجلة</span>
            </div>
          </div>
        </div>

        {/* Card 3: Service Provider Fees */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_25px_rgba(0,0,0,0.01)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold text-neutral-500">رسوم مزودي الخدمة (6.99%)</span>
            <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
              <Building className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 relative">
            <div className="text-2xl font-black text-neutral-900 flex items-baseline gap-1">
              <span>{stats.providerFeesTotal.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
              <span className="text-xs font-bold text-neutral-400">ر.س</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-amber-600 font-bold">
              <span>مدفوعة لـ تمارا / تابي / إمكان</span>
            </div>
          </div>
        </div>

        {/* Card 4: Profit Margin Ratio */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_25px_rgba(0,0,0,0.01)] relative overflow-hidden group">
          <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
          <div className="flex items-center justify-between mb-3 relative">
            <span className="text-xs font-bold text-neutral-500">معدل العائد والربح المئوي</span>
            <div className="p-2 bg-purple-500/10 text-purple-600 rounded-xl">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="space-y-1 relative">
            <div className="text-2xl font-black text-neutral-900 flex items-baseline gap-1">
              <span>%{stats.margin.toFixed(1)}</span>
              <span className="text-xs font-bold text-neutral-400">عائد</span>
            </div>
            <div className="flex items-center gap-1 text-[11px] text-purple-600 font-bold">
              <span>نسبة الأرباح إلى إجمالي رأس المال</span>
            </div>
          </div>
        </div>
      </div>

      {/* Visual Analytics & Provider breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SVG Daily Profits Trend */}
        <div className="lg:col-span-2 bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_20px_rgba(0,0,0,0.01)] space-y-4">
          <div className="flex items-center justify-between border-b border-neutral-50 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-1.5 h-6 bg-[#10b981] rounded-full"></div>
              <h3 className="text-sm font-black text-neutral-800">تتبع منحنى الأرباح اليومية</h3>
            </div>
            <span className="text-[10px] font-black text-neutral-400 bg-neutral-50 px-2.5 py-1 rounded-md">
              الحد الأقصى اليومي: {maxDailyProfit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
            </span>
          </div>

          {stats.count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400 space-y-2">
              <BarChart3 className="w-10 h-10 text-neutral-300 stroke-[1.5]" />
              <p className="text-xs font-bold">لا توجد عمليات مسجلة في هذا الشهر لتتبعها بيانيّاً</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Custom SVG Line Chart */}
              <div className="w-full h-44 bg-neutral-50/50 rounded-2xl relative overflow-hidden border border-neutral-100/50 p-2">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 600 150" preserveAspectRatio="none">
                  {/* Grid Lines */}
                  <line x1="0" y1="20" x2="600" y2="20" stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="75" x2="600" y2="75" stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4" />
                  <line x1="0" y1="130" x2="600" y2="130" stroke="#f4f4f5" strokeWidth="1" strokeDasharray="4" />

                  {/* Gradient area underneath line */}
                  <path
                    d={`${svgPath} L 580 130 L 20 130 Z`}
                    fill="url(#profit-gradient-area)"
                    opacity="0.12"
                  />

                  {/* Main Line */}
                  <path
                    d={svgPath}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data Points on Line */}
                  {dailyProfits.map((d: any, idx) => {
                    if (d.profit === 0) return null;
                    const step = (600 - 40) / (dailyProfits.length - 1);
                    const x = 20 + idx * step;
                    const ratio = maxDailyProfit > 0 ? d.profit / maxDailyProfit : 0;
                    const y = 150 - 20 - ratio * (150 - 40);

                    return (
                      <g key={idx} className="group/dot cursor-pointer">
                        <circle
                          cx={x}
                          cy={y}
                          r="5"
                          fill="#10b981"
                          stroke="#ffffff"
                          strokeWidth="2.5"
                          className="transition-all duration-150 hover:r-7"
                        />
                        <title>{selectedMonthYear === "الكل" ? `${d.label}: ${d.profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س ربح` : `اليوم ${d.day}: ${d.profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س ربح`}</title>
                      </g>
                    );
                  })}

                  <defs>
                    <linearGradient id="profit-gradient-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" />
                      <stop offset="100%" stopColor="#ffffff" />
                    </linearGradient>
                  </defs>
                </svg>
              </div>

              {/* Chart Labels */}
              <div className="flex justify-between text-[10px] text-neutral-400 font-bold px-3">
                {selectedMonthYear === "الكل" ? (
                  <>
                    <span>{dailyProfits[0]?.label || ""}</span>
                    <span>{dailyProfits[Math.floor(dailyProfits.length / 2)]?.label || ""}</span>
                    <span>{dailyProfits[dailyProfits.length - 1]?.label || ""}</span>
                  </>
                ) : (
                  <>
                    <span>1 {selectedMonthYear.split(" ")[0]}</span>
                    <span>15 {selectedMonthYear.split(" ")[0]}</span>
                    <span>{dailyProfits.length} {selectedMonthYear.split(" ")[0]}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Provider Profits share breakdown */}
        <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_20px_rgba(0,0,0,0.01)] space-y-4">
          <div className="flex items-center gap-2 border-b border-neutral-50 pb-3">
            <div className="w-1.5 h-6 bg-purple-500 rounded-full"></div>
            <h3 className="text-sm font-black text-neutral-800">توزيع الأرباح حسب الشركات</h3>
          </div>

          <div className="space-y-4">
            {providerStats.map((item) => {
              const totalMonthProfit = stats.netProfitTotal || 1;
              const pct = Math.round((item.profit / totalMonthProfit) * 100);

              return (
                <div key={item.name} className="p-3.5 rounded-2xl border border-neutral-100 bg-neutral-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        item.name === "تمارا" ? "bg-[#ffaa47]" : item.name === "تابي" ? "bg-[#05ffd2]" : "bg-neutral-950"
                      }`} />
                      <span className="text-xs font-black text-neutral-800">{item.name}</span>
                    </div>
                    <span className="text-[10px] font-black text-neutral-400">
                      {item.count} عمليات
                    </span>
                  </div>

                  <div className="flex justify-between items-baseline">
                    <div className="text-base font-black text-neutral-900">
                      {item.profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] text-neutral-400 font-bold">ر.س صافي</span>
                    </div>
                    <div className="text-xs font-black text-neutral-500">
                      %{pct > 0 ? pct : 0} من أرباحك
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-neutral-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${
                        item.name === "تمارا" ? "bg-[#ffaa47]" : item.name === "تابي" ? "bg-[#05ffd2]" : "bg-neutral-950"
                      }`}
                      style={{ width: `${pct > 0 ? Math.min(pct, 100) : 0}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Detailed Operations Profits breakdown table */}
      <div className="bg-white p-5 rounded-3xl border border-neutral-100 shadow-[0px_4px_20px_rgba(0,0,0,0.01)] space-y-5">
        <div className="flex items-center gap-2 border-b border-neutral-50 pb-3">
          <div className="w-1.5 h-6 bg-blue-500 rounded-full"></div>
          <h3 className="text-sm font-black text-neutral-800">تفاصيل أرباح العمليات الفردية ({monthlyOperations.length})</h3>
        </div>

        {monthlyOperations.length === 0 ? (
          <div className="text-center py-12 text-neutral-400 font-bold text-xs">
            لا توجد عمليات مسجلة في هذا الشهر لاستعراض ربحيتها
          </div>
        ) : (
          (() => {
            const visibleProfits = isProfitsExpanded ? monthlyOperations : monthlyOperations.slice(0, 2);
            return (
              <div className="space-y-4">
                {/* Mobile/Tablet Card-based Layout (Highly polished receipts) */}
                <div className="block lg:hidden space-y-4">
                  {visibleProfits.map((op) => {
                    const profit = getOperationProfit(op);
                    const fee = getOperationFee(op);
                    const cleanedName = cleanClientName(op.clientName);

                    return (
                      <div key={op.id} className="p-5 rounded-2xl border border-neutral-150 bg-neutral-50/40 space-y-4 relative overflow-hidden animate-fadeIn">
                        {/* Top Row */}
                        <div className="flex items-start justify-between">
                          <div className="space-y-1">
                            <div className="font-black text-xs text-neutral-900 leading-tight">
                              {cleanedName || "عملية بيع"}
                            </div>
                            <div className="text-[10px] text-neutral-450 font-medium">
                              {formatDate(op.date, activeProject, { day: "numeric", month: "long" })}
                            </div>
                          </div>
                          <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black tracking-wide border ${
                            op.provider === "تمارا" 
                              ? "bg-amber-50 text-amber-700 border-amber-200/50" 
                              : op.provider === "تابي" 
                                ? "bg-emerald-50 text-emerald-800 border-emerald-200/50" 
                                : "bg-neutral-900 text-white border-neutral-900"
                          }`}>
                            {op.provider}
                          </span>
                        </div>

                        <hr className="border-neutral-200/50" />

                        {/* Mid Grid */}
                        <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                          <div>
                            <span className="text-[10px] text-neutral-400 font-bold block mb-0.5">رأس المال (الباقة)</span>
                            <span className="font-black text-neutral-800">{op.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</span>
                          </div>
                          <div>
                            <span className="text-[10px] text-neutral-400 font-bold block mb-0.5">إجمالي التمويل</span>
                            <span className="font-black text-neutral-800">{(op.totalInstallmentAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</span>
                          </div>
                          {op.deductDownPaymentFromFunding !== false && op.downPayment > 0 && (
                            <div>
                              <span className="text-[10px] text-amber-600 font-bold block mb-0.5">الدفعة الأولى</span>
                              <span className="font-black text-amber-600">{op.downPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</span>
                            </div>
                          )}
                          <div>
                            <span className="text-[10px] text-neutral-400 font-bold block mb-0.5">
                              رسوم الخدمة (6.99%)
                            </span>
                            <span className="font-black text-red-500">{(fee > 0 ? `-${fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "0.00")} ر.س</span>
                          </div>
                          {op.enableCommissionFee !== false && (
                          <div>
                            <span className="text-[10px] text-neutral-400 font-bold block mb-0.5">العمولة المدفوعة</span>
                            <span className="font-black text-red-500">{(op.commissionFee > 0 ? `-${op.commissionFee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "0.00")} ر.س</span>
                          </div>
                        )}
                        </div>

                        {/* Bottom Highlight */}
                        <div className="bg-emerald-50/70 p-3 rounded-xl border border-emerald-100 flex items-center justify-between">
                          <span className="text-[10px] font-black text-emerald-800">صافي ربح العملية:</span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-black text-[#10b981]">{profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</span>
                            <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded font-bold">{(op.totalInstallmentAmount - fee) > 0 ? ((profit / (op.totalInstallmentAmount - fee)) * 100).toFixed(1) : "0.0"}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Desktop Roomy Spacious Table Layout */}
                <div className="hidden lg:block overflow-x-auto border border-neutral-100 rounded-2xl">
                  <table className="w-full text-right text-xs table-auto">
                    <thead>
                      <tr className="bg-neutral-50/60 border-b border-neutral-100 text-neutral-500 font-black">
                        <th className="py-4 px-4 font-black">العميل / التفاصيل</th>
                        <th className="py-4 px-4 font-black">مزود الخدمة</th>
                        <th className="py-4 px-4 font-black">رأس المال (الباقة)</th>
                        <th className="py-4 px-4 font-black">إجمالي التمويل</th>
                        <th className="py-4 px-4 font-black">رسوم الخدمة (6.99%)</th>
                        <th className="py-4 px-4 font-black">العمولة المدفوعة</th>
                        <th className="py-4 px-4 font-black text-right text-[#10b981]">صافي الربح</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-100 font-medium text-neutral-700">
                      {visibleProfits.map((op) => {
                        const profit = getOperationProfit(op);
                        const fee = getOperationFee(op);
                        const cleanedName = cleanClientName(op.clientName);

                        return (
                          <tr key={op.id} className="hover:bg-neutral-50/30 transition-all duration-150 animate-fadeIn">
                            <td className="py-4 px-4">
                              <div className="font-black text-neutral-900 text-[13px]">{cleanedName}</div>
                              <div className="text-[10px] text-neutral-450 mt-0.5 font-bold">
                                {formatDate(op.date, activeProject, { day: "numeric", month: "long" })}
                              </div>
                            </td>
                            <td className="py-4 px-4">
                              <span className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black border ${
                                op.provider === "تمارا" 
                                  ? "bg-amber-50 text-amber-700 border-amber-200/50" 
                                  : op.provider === "تابي" 
                                    ? "bg-emerald-50 text-emerald-800 border-emerald-200/50" 
                                    : "bg-neutral-900 text-white border-neutral-900"
                              }`}>
                                {op.provider}
                              </span>
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-bold text-neutral-800 text-[13px]">{op.packageAmount.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</div>
                              {op.deductDownPaymentFromFunding !== false && op.downPayment > 0 && (
                                <div className="text-[10px] text-amber-600 font-bold mt-0.5">
                                  الدفعة الأولى: {op.downPayment.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س
                                </div>
                              )}
                            </td>
                            <td className="py-4 px-4 font-bold text-neutral-800 text-[13px]">{(op.totalInstallmentAmount || 0).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ر.س</td>
                            <td className="py-4 px-4 font-bold text-rose-600 text-[13px]">
                              <div>{(fee > 0 ? `-${fee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "0.00")} ر.س</div>
                            </td>
                            <td className="py-4 px-4 font-bold text-rose-600 text-[13px]">{op.enableCommissionFee !== false ? (op.commissionFee > 0 ? `-${op.commissionFee.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : "0.00") : "0.00"} ر.س</td>
                            <td className="py-4 px-4 font-black text-[#10b981] text-[14px] text-right">
                              <div className="flex items-center gap-1.5 justify-end">
                                <span>{profit.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className="text-[10px] font-bold">ر.س</span></span>
                                <span className="text-[9px] bg-emerald-50 text-emerald-600 px-1.5 py-0.5 rounded font-bold">{(op.totalInstallmentAmount - fee) > 0 ? ((profit / (op.totalInstallmentAmount - fee)) * 100).toFixed(1) : "0.0"}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {monthlyOperations.length > 2 && (
                  <div className="flex justify-center pt-2">
                    <button
                      type="button"
                      onClick={() => setIsProfitsExpanded(!isProfitsExpanded)}
                      className="flex items-center gap-1.5 px-5 py-2.5 bg-neutral-50 hover:bg-neutral-100 text-neutral-800 rounded-xl text-xs font-black transition-all cursor-pointer shadow-xs border border-neutral-200/50"
                    >
                      {isProfitsExpanded ? (
                        <>
                          <ChevronUp className="w-4 h-4 text-neutral-500 animate-bounce" />
                          <span>أقل</span>
                        </>
                      ) : (
                        <>
                          <ChevronDown className="w-4 h-4 text-neutral-500 animate-bounce" />
                          <span>المزيد ({monthlyOperations.length - 2})</span>
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        )}
      </div>

    </div>
  );
}
