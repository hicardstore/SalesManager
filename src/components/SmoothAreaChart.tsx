import React, { useState, useId } from "react";

export interface ChartDataPoint {
  label: string;
  value: number;
  secondaryValue?: number;
  count?: number;
  rawDate?: string;
}

export interface SmoothAreaChartProps {
  data: ChartDataPoint[];
  title?: string;
  subtitle?: string;
  badgeText?: string;
  metricLabel?: string;
  lineColor?: string; // hex or tailwind stroke color
  gradientColor?: string;
  height?: number;
  valueFormatter?: (val: number) => string;
  className?: string;
  showYAxisLabels?: boolean;
  showXAxisLabels?: boolean;
  interactive?: boolean;
}

export function formatCompactNumber(val: number): string {
  if (val === 0) return "0";
  if (val >= 1_000_000) {
    const m = val / 1_000_000;
    return (m % 1 === 0 ? m.toFixed(0) : m.toFixed(2)) + "M";
  }
  if (val >= 1_000) {
    const k = val / 1_000;
    return (k % 1 === 0 ? k.toFixed(0) : k.toFixed(2)) + "K";
  }
  return val.toLocaleString("en-US", { maximumFractionDigits: 1 });
}

export default function SmoothAreaChart({
  data,
  title,
  subtitle,
  badgeText,
  metricLabel = "القيمة",
  lineColor = "#059669", // Emerald green from reference image
  gradientColor = "#10b981",
  height = 220,
  valueFormatter = (v) => `${v.toLocaleString("en-US", { maximumFractionDigits: 2 })} ر.س`,
  className = "",
  showYAxisLabels = true,
  showXAxisLabels = true,
  interactive = true,
}: SmoothAreaChartProps) {
  const chartId = useId().replace(/:/g, "");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className={`flex flex-col items-center justify-center py-12 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800 text-neutral-400 ${className}`}>
        <p className="text-xs font-bold">لا توجد بيانات متاحة لعرض الرسم البياني</p>
      </div>
    );
  }

  // Calculate Max Value for Y Axis scale
  const rawMax = Math.max(...data.map((d) => d.value), 10);
  // Add a 15% headroom above max
  const yMax = Math.ceil(rawMax * 1.15);

  // SVG dimensions
  const svgWidth = 600;
  const svgHeight = height;
  
  // Padding around plot area inside SVG
  const padLeft = showYAxisLabels ? 55 : 20;
  const padRight = 25;
  const padTop = 25;
  const padBottom = showXAxisLabels ? 35 : 15;

  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Compute point coordinates (x, y) for each data item
  const points = data.map((item, idx) => {
    const x =
      data.length > 1
        ? padLeft + (idx * plotWidth) / (data.length - 1)
        : padLeft + plotWidth / 2;
    
    // Normalize value to y coordinates
    const ratio = Math.min(1, Math.max(0, item.value / yMax));
    const y = padTop + plotHeight - ratio * plotHeight;
    return { x, y, item, idx };
  });

  // Generator for smooth spline path (Monotone Cubic Interpolation)
  const getSmoothPathD = (pts: { x: number; y: number }[]) => {
    if (pts.length === 0) return "";
    if (pts.length === 1) return `M ${pts[0].x} ${pts[0].y}`;

    let d = `M ${pts[0].x} ${pts[0].y}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = pts[i === 0 ? i : i - 1];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = pts[i + 2 < pts.length ? i + 2 : i + 1];

      // Smooth cubic control points
      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
    }
    return d;
  };

  const lineD = getSmoothPathD(points);
  
  // Closed path for area gradient fill
  const areaD = points.length > 0
    ? `${lineD} L ${points[points.length - 1].x} ${padTop + plotHeight} L ${points[0].x} ${padTop + plotHeight} Z`
    : "";

  // Grid steps (3 horizontal lines: 100%, 50%, 0%)
  const gridRatios = [0, 0.5, 1];

  const activePoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className={`bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-100 dark:border-neutral-800/80 p-5 shadow-[0px_4px_20px_rgba(0,0,0,0.015)] transition-colors ${className}`}>
      
      {/* Header section if title or badge provided */}
      {(title || badgeText) && (
        <div className="flex items-center justify-between mb-4 border-b border-neutral-100 dark:border-neutral-800 pb-3" dir="rtl">
          <div>
            {title && <h3 className="text-sm font-black text-neutral-900 dark:text-neutral-100">{title}</h3>}
            {subtitle && <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">{subtitle}</p>}
          </div>
          {badgeText && (
            <span className="text-[10px] font-black bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/50 px-2.5 py-1 rounded-xl">
              {badgeText}
            </span>
          )}
        </div>
      )}

      {/* Main Chart Canvas Container */}
      <div className="relative w-full overflow-hidden select-none" style={{ height: `${height}px` }}>
        
        {/* Floating Tooltip Card (Styled matching reference image: light box, centered text, static display) */}
        {activePoint && (
          <div
            className="absolute z-30 pointer-events-none"
            style={{
              left: `${(activePoint.x / svgWidth) * 100}%`,
              top: `${Math.max(5, (activePoint.y / svgHeight) * 100 - 70)}%`,
              transform: "translateX(-50%)",
            }}
          >
            <div className="bg-[#eef3f7] dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 rounded-2xl px-4 py-2.5 shadow-md border border-slate-200/80 dark:border-neutral-700 min-w-[100px] text-center font-sans">
              <p className="text-xs font-black text-neutral-900 dark:text-neutral-100 leading-tight">
                {activePoint.item.label}
              </p>
              <p className="text-sm font-black text-neutral-900 dark:text-neutral-100 mt-1 leading-none">
                {valueFormatter(activePoint.item.value)}
              </p>
              {activePoint.item.count !== undefined && activePoint.item.count > 0 && (
                <p className="text-[10px] font-bold text-neutral-500 dark:text-neutral-400 mt-1">
                  ({activePoint.item.count} عملية)
                </p>
              )}
            </div>
          </div>
        )}

        <svg
          className="w-full h-full overflow-visible"
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          preserveAspectRatio="none"
        >
          <defs>
            {/* Linear Gradient for translucent area fill matching reference image */}
            <linearGradient id={`grad-${chartId}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={gradientColor} stopOpacity="0.25" />
              <stop offset="100%" stopColor={gradientColor} stopOpacity="0.00" />
            </linearGradient>

            {/* Soft Glow Shadow filter for the line */}
            <filter id={`glow-${chartId}`} x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="4" stdDeviation="4" floodColor={lineColor} floodOpacity="0.20" />
            </filter>
          </defs>

          {/* Horizontal Dashed Grid Lines & Y-Axis Labels matching reference image */}
          {gridRatios.map((ratio, i) => {
            const y = padTop + plotHeight * ratio;
            const val = Math.round((1 - ratio) * yMax);

            return (
              <g key={i}>
                {/* Horizontal Dashed Line */}
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  strokeWidth="1.2"
                  strokeDasharray="6 6"
                  className="text-neutral-200 dark:text-neutral-800"
                />

                {/* Y-Axis Label */}
                {showYAxisLabels && (
                  <text
                    x={padLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[11px] font-sans font-extrabold fill-neutral-800 dark:fill-neutral-200"
                  >
                    {formatCompactNumber(val)}
                  </text>
                )}
              </g>
            );
          })}

          {/* Smooth Area Translucent Gradient Fill */}
          {areaD && (
            <path
              d={areaD}
              fill={`url(#grad-${chartId})`}
            />
          )}

          {/* Smooth Primary Area Curve Line with stroke and glow */}
          {lineD && (
            <path
              d={lineD}
              fill="none"
              stroke={lineColor}
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-${chartId})`}
            />
          )}

          {/* Solid Green Vertical Line down to baseline & Active Point Dot on Touch/Hover ONLY */}
          {activePoint && (
            <g>
              {/* Solid Vertical Line from point down to chart baseline */}
              <line
                x1={activePoint.x}
                y1={activePoint.y}
                x2={activePoint.x}
                y2={padTop + plotHeight}
                stroke={lineColor}
                strokeWidth="2.5"
              />

              {/* Single Static Active Point Dot (No animations/ping/transitions) */}
              <circle
                cx={activePoint.x}
                cy={activePoint.y}
                r="6"
                fill={lineColor}
                stroke="#ffffff"
                strokeWidth="2"
              />
            </g>
          )}

          {/* X-Axis Labels (Displayed at bottom like Jul 17, Jul 24) */}
          {showXAxisLabels && points.length > 0 && (() => {
            // Select labels to show (start, end, or spaced)
            const labelIndices: number[] = [];
            if (points.length <= 6) {
              points.forEach((_, idx) => labelIndices.push(idx));
            } else {
              labelIndices.push(0);
              const mid = Math.floor(points.length / 2);
              labelIndices.push(mid);
              labelIndices.push(points.length - 1);
            }

            return labelIndices.map((idx) => {
              const pt = points[idx];
              const textAnchor = idx === 0 ? "start" : idx === points.length - 1 ? "end" : "middle";

              return (
                <text
                  key={idx}
                  x={pt.x}
                  y={svgHeight - 8}
                  textAnchor={textAnchor}
                  className="text-[12px] font-sans font-extrabold fill-neutral-900 dark:fill-neutral-100"
                >
                  {pt.item.label}
                </text>
              );
            });
          })()}

          {/* Interactive Touch/Mouse Event Hit Targets */}
          {interactive &&
            points.map((pt, idx) => {
              const colWidth = plotWidth / Math.max(1, data.length - 1);
              const hitX = pt.x - colWidth / 2;
              return (
                <rect
                  key={idx}
                  x={Math.max(0, hitX)}
                  y={padTop - 10}
                  width={colWidth}
                  height={plotHeight + 20}
                  fill="transparent"
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onTouchStart={() => setHoveredIdx(idx)}
                />
              );
            })}
        </svg>
      </div>
    </div>
  );
}
