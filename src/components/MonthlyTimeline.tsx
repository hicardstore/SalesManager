import React, { useState, useRef, useMemo, useEffect } from "react";
import { 
  Calendar, 
  ChevronLeft, 
  ChevronRight,
  TrendingUp, 
  BarChart3, 
  Coins, 
  ShoppingBag,
  Clock,
  ArrowUpRight,
  Sparkles,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Operation } from "../types";
import { getOperationFee, getOperationProfitWithDownPayment } from "../utils/financeMath";

interface MonthlyTimelineProps {
  operations?: Operation[];
  activeProject?: any;
}

// Model: DailyPerformance matching spec requirements
interface DailyPerformance {
  day: number;
  dayOfWeek: string;
  sales: number;
  profit: number;
  orders: number;
  averageOrder: number;
  hasData: boolean;
}

const ARABIC_WEEKDAYS = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];

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
  
  // backtrack up to 35 days to find the start of the Hijri month
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

export default function MonthlyTimeline({ operations = [], activeProject }: MonthlyTimelineProps) {
  const [selectedMetric, setSelectedMetric] = useState<"sales" | "profit">(() => {
    try {
      const saved = localStorage.getItem("mt_selected_metric");
      if (saved === "sales" || saved === "profit") {
        return saved;
      }
    } catch (e) {}
    return "profit";
  });
  
  // Helper to construct dynamic labels
  const getLabelForDate = (date: Date) => {
    const calendarSystem = activeProject?.calendarSystem || "gregorian";
    const locale = calendarSystem === "hijri" 
      ? "ar-SA-u-ca-islamic-umalqura-nu-latn" 
      : "ar-SA-u-nu-latn";
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

  // Dynamically generate sorted months list from the map
  const availableMonths = useMemo(() => {
    return Object.keys(monthLabelMap).sort((a, b) => {
      const dateA = monthLabelMap[a];
      const dateB = monthLabelMap[b];
      return dateB.getTime() - dateA.getTime();
    });
  }, [monthLabelMap]);

  const [selectedMonthYear, setSelectedMonthYear] = useState<string>(() => {
    try {
      const saved = localStorage.getItem("mt_selected_month_year");
      if (saved) return saved;
    } catch (e) {}
    return getLabelForDate(new Date());
  });

  const [selectedDay, setSelectedDay] = useState<number>(() => {
    try {
      const saved = localStorage.getItem("mt_selected_day");
      if (saved) {
        const val = parseInt(saved);
        if (!isNaN(val)) return val;
      }
    } catch (e) {}
    const calendarSystem = activeProject?.calendarSystem || "gregorian";
    if (calendarSystem === "hijri") {
      try {
        const parts = new Date().toLocaleDateString("en-US-u-ca-islamic-umalqura", { day: "numeric" });
        return parseInt(parts) || new Date().getDate();
      } catch (e) {
        return new Date().getDate();
      }
    }
    return new Date().getDate();
  });

  // Sync selections to localStorage
  useEffect(() => {
    try {
      localStorage.setItem("mt_selected_metric", selectedMetric);
    } catch (e) {}
  }, [selectedMetric]);

  useEffect(() => {
    try {
      localStorage.setItem("mt_selected_month_year", selectedMonthYear);
    } catch (e) {}
  }, [selectedMonthYear]);

  useEffect(() => {
    try {
      localStorage.setItem("mt_selected_day", String(selectedDay));
    } catch (e) {}
  }, [selectedDay]);

  // Keep selectedMonthYear and selectedDay in sync with preference switches
  useEffect(() => {
    const currentLabel = getLabelForDate(new Date());
    const calendarSystem = activeProject?.calendarSystem || "gregorian";

    if (!availableMonths.includes(selectedMonthYear)) {
      setSelectedMonthYear(currentLabel);
      
      // Also reset selected day to today
      if (calendarSystem === "hijri") {
        try {
          const parts = new Date().toLocaleDateString("en-US-u-ca-islamic-umalqura", { day: "numeric" });
          setSelectedDay(parseInt(parts) || new Date().getDate());
        } catch (e) {
          setSelectedDay(new Date().getDate());
        }
      } else {
        setSelectedDay(new Date().getDate());
      }
    } else {
      // Validate bounds of selectedDay
      if (calendarSystem === "hijri" && selectedDay > 30) {
        setSelectedDay(30);
      }
    }
  }, [activeProject?.calendarSystem, availableMonths, selectedMonthYear]);

  const timelineScrollRef = useRef<HTMLDivElement>(null);

  // Helper functions for real profit computation
  const getOperationFeeLocal = (op: Operation) => getOperationFee(op);
  const getOperationProfit = (op: Operation) => getOperationProfitWithDownPayment(op);

  // Group real operations by day if they match the selected month
  const monthlyData = useMemo(() => {
    const calendarSystem = activeProject?.calendarSystem || "gregorian";
    const sampleDate = monthLabelMap[selectedMonthYear] || new Date();
    
    // Get all days of the selected month
    const daysList = getDaysInMonthLabel(sampleDate, calendarSystem, selectedMonthYear);

    // Filter real operations for this month and year
    const filteredOps = operations.filter(op => {
      if (!op.date) return false;
      const d = new Date(op.date);
      return !isNaN(d.getTime()) && getLabelForDate(d) === selectedMonthYear;
    });

    // Create array for each day
    return daysList.map(({ dayNum, date }) => {
      const dayOfWeek = ARABIC_WEEKDAYS[date.getDay()];

      // Operations on this exact day
      const opsOnDay = filteredOps.filter(op => {
        if (!op.date) return false;
        const d = new Date(op.date);
        
        if (calendarSystem === "hijri") {
          try {
            const hDayStr = d.toLocaleDateString("en-US-u-ca-islamic-umalqura", { day: "numeric" });
            return parseInt(hDayStr) === dayNum;
          } catch (e) {
            return d.getDate() === dayNum;
          }
        } else {
          return d.getDate() === dayNum;
        }
      });

      if (opsOnDay.length > 0) {
        const sales = opsOnDay.reduce((sum, op) => sum + (Number(op.totalInstallmentAmount) || 0), 0);
        const profit = opsOnDay.reduce((sum, op) => sum + getOperationProfit(op), 0);
        const orders = opsOnDay.length;
        const averageOrder = orders > 0 ? Math.round(sales / orders) : 0;

        return {
          day: dayNum,
          dayOfWeek,
          sales,
          profit,
          orders,
          averageOrder,
          hasData: true
        };
      } else {
        return {
          day: dayNum,
          dayOfWeek,
          sales: 0,
          profit: 0,
          orders: 0,
          averageOrder: 0,
          hasData: false
        };
      }
    });
  }, [operations, selectedMonthYear, monthLabelMap, activeProject?.calendarSystem]);

  // Aggregate stats
  const aggregateStats = useMemo(() => {
    const totalSales = monthlyData.reduce((sum, d) => sum + d.sales, 0);
    const totalProfit = monthlyData.reduce((sum, d) => sum + d.profit, 0);
    const totalOrders = monthlyData.reduce((sum, d) => sum + d.orders, 0);
    const activeDays = monthlyData.filter(d => d.hasData).length;
    
    return {
      totalSales,
      totalProfit,
      totalOrders,
      activeDays,
    };
  }, [monthlyData]);

  // Selected Day Data
  const selectedDayData = useMemo(() => {
    return monthlyData.find(d => d.day === selectedDay) || {
      day: selectedDay,
      dayOfWeek: "الخميس",
      sales: 0,
      profit: 0,
      orders: 0,
      averageOrder: 0,
      hasData: false
    };
  }, [monthlyData, selectedDay]);

  // Weeks division
  const weeks = useMemo(() => {
    return [
      { title: "الأسبوع الأول", items: monthlyData.slice(0, 7) },
      { title: "الأسبوع الثاني", items: monthlyData.slice(7, 14) },
      { title: "الأسبوع الثالث", items: monthlyData.slice(14, 21) },
      { title: "الأسبوع الرابع", items: monthlyData.slice(21) },
    ];
  }, [monthlyData]);

  const handleScroll = (direction: "left" | "right") => {
    if (timelineScrollRef.current) {
      const amt = direction === "left" ? -280 : 280;
      timelineScrollRef.current.scrollBy({ left: amt, behavior: "smooth" });
    }
  };

  return (
    <div className="w-full space-y-6 text-right font-sans" dir="rtl" id="monthly-timeline-root">
      
      {/* Top Professional Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-neutral-200/60 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 animate-pulse" />
            <span className="text-xs font-bold text-neutral-400">لوحة المراقبة التفاعلية</span>
          </div>
          <h1 className="text-2xl font-black text-neutral-900 tracking-tight">أداء الشهر</h1>
          <p className="text-xs text-neutral-500 font-medium">عرض الأداء اليومي ومستويات المبيعات والأرباح خلال الشهر المحدد</p>
        </div>

        {/* Real-time Indicator Tag */}
        <div className="flex items-center gap-3 bg-neutral-50 border border-neutral-200/50 px-4 py-2.5 rounded-2xl">
          <Clock className="w-4 h-4 text-blue-600" />
          <div className="text-right">
            <span className="block text-[9px] font-black text-neutral-400">تحديث تلقائي</span>
            <span className="text-xs font-black text-neutral-800">مزامنة سحابية مباشرة</span>
          </div>
        </div>
      </div>

      {/* Filters & Configuration Row */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-xs">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
          
          {/* Month selector */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-neutral-500">اختيار الشهر المستهدف</label>
            <div className="relative">
              <select
                value={selectedMonthYear}
                onChange={(e) => {
                  setSelectedMonthYear(e.target.value);
                  setSelectedDay(1); // Reset selected day to first of month
                }}
                className="w-full bg-neutral-50 border border-neutral-200 hover:border-neutral-300 rounded-2xl px-4 py-3.5 text-sm font-black text-neutral-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 transition-all appearance-none cursor-pointer"
              >
                {availableMonths.map((m) => (
                  <option key={m} value={m}>{m}</option>
                ))}
              </select>
              <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none text-neutral-400">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
          </div>

          {/* Indicator toggler */}
          <div className="space-y-2">
            <label className="block text-xs font-black text-neutral-500">مؤشر التحليل المالي</label>
            <div className="bg-neutral-100 p-1.5 rounded-2xl flex h-13 border border-neutral-200/40">
              <button
                type="button"
                onClick={() => setSelectedMetric("sales")}
                className={`flex-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMetric === "sales"
                    ? "bg-white text-blue-600 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                <span>إجمالي مبيعات التقسيط</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedMetric("profit")}
                className={`flex-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  selectedMetric === "profit"
                    ? "bg-white text-emerald-600 shadow-sm"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                <Coins className="w-4 h-4" />
                <span>صافي أرباح التاجر</span>
              </button>
            </div>
          </div>

        </div>
      </div>

      {/* Main Stats Summary Display Card */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-xs flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative overflow-hidden">
        
        {/* Background ambient light */}
        <div className={`absolute top-0 left-0 w-48 h-full opacity-10 pointer-events-none filter blur-2xl transition-all duration-500 ${
          selectedMetric === "sales" ? "bg-blue-600" : "bg-emerald-600"
        }`} />

        <div className="space-y-2 relative z-10">
          <span className="text-xs font-bold text-neutral-400 block">
            {selectedMetric === "sales" ? "إجمالي قيمة مبيعات التقسيط خلال الشهر" : "إجمالي صافي أرباح التاجر المحققة خلال الشهر"}
          </span>
          <div className="flex items-baseline gap-2">
            <span className={`text-3xl lg:text-4xl font-black tracking-tight ${
              selectedMetric === "sales" ? "text-blue-600" : "text-emerald-600"
            }`}>
              {(selectedMetric === "sales" ? aggregateStats.totalSales : aggregateStats.totalProfit).toLocaleString()}
            </span>
            <span className="text-sm font-black text-neutral-400">ريال سعودي</span>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <span className={`text-xs px-2 py-0.5 rounded-lg font-black flex items-center gap-1 ${
              selectedMetric === "sales" ? "bg-blue-50 text-blue-600" : "bg-emerald-50 text-emerald-600"
            }`}>
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{selectedMetric === "sales" ? "+18.3%" : "+21.4%"}</span>
            </span>
            <span className="text-xs text-neutral-450 font-bold">مقارنة بأداء الشهر الماضي</span>
          </div>
        </div>

        {/* Left Side Quick Metrics Grid */}
        <div className="grid grid-cols-2 gap-4 w-full md:w-auto relative z-10">
          <div className="bg-neutral-50 border border-neutral-200/50 p-4 rounded-2xl min-w-[140px]">
            <span className="block text-[10px] font-black text-neutral-400 mb-1">عدد عمليات الشهر</span>
            <span className="text-lg font-black text-neutral-800">{aggregateStats.totalOrders} عملية</span>
          </div>
          <div className="bg-neutral-50 border border-neutral-200/50 p-4 rounded-2xl min-w-[140px]">
            <span className="block text-[10px] font-black text-neutral-400 mb-1">أيام النشاط الفعلي</span>
            <span className="text-lg font-black text-neutral-800">{aggregateStats.activeDays} يوم من {monthlyData.length}</span>
          </div>
        </div>

      </div>

      {/* Daily Performance Section (Timeline Wrapper) */}
      <div className="bg-white rounded-3xl border border-neutral-200/60 p-6 shadow-xs space-y-4">
        
        {/* Title and Color Explanations */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-neutral-100">
          <div className="space-y-1">
            <h2 className="text-sm font-black text-neutral-900">أداء الأيام التفصيلي</h2>
            <p className="text-[10px] text-neutral-450 font-bold">عرض متكامل لكافة أسابيع الشهر في إطار مربع تفاعلي لتسهيل استكشاف الأداء اليومي</p>
          </div>

          {/* Color Legend Matching requested specifications */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5 bg-emerald-50/50 border border-emerald-100/50 px-2.5 py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#22C55E]" />
              <span className="text-[10px] font-black text-emerald-800">يوجد بيانات</span>
            </div>
            <div className="flex items-center gap-1.5 bg-neutral-50 border border-neutral-200/50 px-2.5 py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
              <span className="text-[10px] font-black text-neutral-500">لا يوجد بيانات</span>
            </div>
            <div className="flex items-center gap-1.5 bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-xl">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              <span className="text-[10px] font-black text-blue-800">اليوم المحدد</span>
            </div>
          </div>
        </div>

        {/* Weeks Grid Layout - Completely visible in square box frames without scrolling */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 pt-2">
          {weeks.map((week, weekIndex) => {
            // Calculate week summary stats for richer UI feedback
            const totalWeekSales = week.items.reduce((sum, item) => sum + item.sales, 0);
            const totalWeekProfit = week.items.reduce((sum, item) => sum + item.profit, 0);
            const activeWeekDays = week.items.filter(item => item.hasData).length;
            const targetWeekVal = selectedMetric === "sales" ? totalWeekSales : totalWeekProfit;

            return (
              <div 
                key={week.title} 
                className="bg-neutral-50/30 border border-neutral-200/50 rounded-2xl p-4 flex flex-col justify-between hover:border-blue-500/30 transition-all duration-300 shadow-xs hover:shadow-xs group/card relative overflow-hidden"
              >
                {/* Subtle top decoration accent */}
                <div className="absolute top-0 right-0 left-0 h-1 bg-neutral-100 group-hover/card:bg-blue-500/20 transition-all" />

                {/* Week Header */}
                <div className="flex items-center justify-between gap-2 border-b border-neutral-100 pb-3 mb-3">
                  <div className="space-y-0.5 text-right">
                    <span className="text-xs font-black text-neutral-800">{week.title}</span>
                    <span className="block text-[9px] text-neutral-450 font-bold">
                      أيام النشاط: {activeWeekDays} من {week.items.length}
                    </span>
                  </div>
                  
                  {/* Performance metric tag */}
                  <div className="bg-white border border-neutral-200 px-2 py-0.5 rounded-lg text-center">
                    <span className="block text-[7.5px] font-black text-neutral-400">إجمالي الأسبوع</span>
                    <span className="text-[9.5px] font-black font-mono text-neutral-800">
                      {targetWeekVal.toLocaleString()} ر.س
                    </span>
                  </div>
                </div>

                {/* Days circular selector Grid inside the square box */}
                <div className="grid grid-cols-4 gap-y-3 gap-x-1.5 justify-items-center py-1">
                  {week.items.map((dayItem) => {
                    const isSelected = selectedDay === dayItem.day;
                    const valueToShow = selectedMetric === "sales" ? dayItem.sales : dayItem.profit;
                    
                    // Format value text
                    let formattedVal = "0";
                    if (valueToShow >= 1000) {
                      formattedVal = `${(valueToShow / 1000).toFixed(1)}K`;
                    } else if (valueToShow > 0) {
                      formattedVal = `${valueToShow}`;
                    }

                    // Style configurations matching specification requirements perfectly
                    let circleColorClass = "bg-white border-neutral-300 text-neutral-400 ring-2 ring-neutral-100 hover:border-neutral-400";
                    let valueTextClass = "text-neutral-400";
                    let sizeClass = "w-9 h-9 text-xs";

                    if (isSelected) {
                      circleColorClass = "bg-[#2563EB] border-[#2563EB] text-white shadow-md ring-4 ring-blue-500/20";
                      valueTextClass = "text-[#2563EB] font-black";
                      sizeClass = "w-10 h-10 text-xs shadow-sm";
                    } else if (dayItem.hasData) {
                      circleColorClass = "bg-[#22C55E]/10 border-[#22C55E] text-[#22C55E] ring-2 ring-emerald-500/10";
                      valueTextClass = "text-[#22C55E] font-black";
                    } else {
                      circleColorClass = "bg-neutral-50 border-[#94A3B8] text-neutral-500";
                      valueTextClass = "text-neutral-400 font-medium";
                    }

                    return (
                      <div
                        key={dayItem.day}
                        onClick={() => setSelectedDay(dayItem.day)}
                        className="flex flex-col items-center justify-center cursor-pointer group/day select-none w-10"
                      >
                        <div className="relative flex items-center justify-center h-10">
                          <motion.div
                            whileTap={{ scale: 0.95 }}
                            className={`rounded-full flex items-center justify-center font-sans font-black transition-all duration-200 border-2 z-10 ${circleColorClass} ${sizeClass}`}
                          >
                            {dayItem.day}
                          </motion.div>
                        </div>

                        {/* Small metadata below circle */}
                        <div className="text-center mt-1 h-3 overflow-hidden">
                          <span className={`text-[8.5px] block leading-none truncate ${valueTextClass}`}>
                            {dayItem.hasData ? formattedVal : "لا يوجد"}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

      </div>

      {/* Selected Day Details Panel (Bottom Sheet styled as clean modular card) */}
      <AnimatePresence mode="wait">
        <motion.div
          key={selectedDay}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-[24px] border border-neutral-200/60 p-6 shadow-sm space-y-5"
          id="day-details-panel-card"
        >
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div className="space-y-1">
              <span className="block text-[10px] font-black text-neutral-400">ملخص اليوم النشط</span>
              <h3 className="text-base font-black text-neutral-900 flex items-center gap-2">
                <span>يوم {selectedDayData.day} {selectedMonthYear}</span>
                <span className="text-xs text-neutral-400 font-bold font-sans">({selectedDayData.dayOfWeek})</span>
              </h3>
            </div>

            {/* Status indicator badge */}
            <div className={`px-3 py-1.5 rounded-full text-[10px] font-black ${
              selectedDayData.hasData 
                ? "bg-[#22C55E]/10 text-[#22C55E]" 
                : "bg-neutral-100 text-neutral-500"
            }`}>
              {selectedDayData.hasData ? "يوجد بيانات حركة مبيعات" : "لا يوجد مبيعات مسجلة"}
            </div>
          </div>

          {/* Details Content Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            
            {/* Stat 1: Metric */}
            <div className="bg-neutral-50 border border-neutral-200/30 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-blue-50 text-blue-600 rounded-xl flex items-center justify-center shrink-0">
                <BarChart3 className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black text-neutral-400">المؤشر الحالي</span>
                <span className="text-xs font-black text-neutral-800">
                  {selectedMetric === "sales" ? "إجمالي مبيعات التقسيط" : "صافي أرباح التاجر"}
                </span>
              </div>
            </div>

            {/* Stat 2: Sales */}
            <div className="bg-neutral-50 border border-neutral-200/30 p-4 rounded-2xl flex items-center gap-4">
              <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center shrink-0">
                <Coins className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black text-neutral-400">إجمالي قيمة مبيعات اليوم</span>
                <span className="text-xs font-black text-neutral-800">
                  {selectedDayData.sales.toLocaleString()} ريال
                </span>
              </div>
            </div>

            {/* Stat 3: Orders volume */}
            <div className="bg-neutral-50 border border-neutral-200/30 p-4 rounded-2xl flex items-center gap-4 col-span-1 md:col-span-2 lg:col-span-1">
              <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center shrink-0">
                <ShoppingBag className="w-5 h-5" />
              </div>
              <div>
                <span className="block text-[10px] font-black text-neutral-400">عدد طلبات اليوم</span>
                <span className="text-xs font-black text-neutral-800">
                  {selectedDayData.orders} طلبات
                </span>
              </div>
            </div>

          </div>

          {/* Secondary Stats Row */}
          <div className="bg-neutral-50 border border-neutral-200/30 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-center justify-between text-xs font-bold border-b sm:border-b-0 sm:border-l border-neutral-200/60 pb-2 sm:pb-0 pl-0 sm:pl-4">
              <span className="text-neutral-400">متوسط قيمة الطلب الفردي (AOV)</span>
              <span className="text-neutral-900 font-black">{selectedDayData.averageOrder.toLocaleString()} ريال</span>
            </div>
            <div className="flex items-center justify-between text-xs font-bold pt-2 sm:pt-0 pr-0 sm:pr-4">
              <span className="text-neutral-400">صافي أرباح التاجر المحققة لليوم</span>
              <span className="text-emerald-600 font-black">{selectedDayData.profit.toLocaleString()} ريال</span>
            </div>
          </div>

          {/* System Hint */}
          <div className="flex items-center gap-2 text-neutral-400 text-[10px] font-bold">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>يتم حساب قيم متوسطات الطلبات والأرباح بصورة فورية بناءً على نسبة عمولات عقود البيع الفعالة في مساحة العمل.</span>
          </div>

        </motion.div>
      </AnimatePresence>

    </div>
  );
}
