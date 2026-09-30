import React, { useState, useMemo } from 'react';
import {
  LineData,
  LineSummaryMetrics,
  MonthlyForecastItem,
} from '../types/manpower';
import { calculateForecastItem, formatNumber } from '../utils/ieCalculations';
import {
  TrendingUp,
  BarChart3,
  LineChart as LineChartIcon,
  Layers,
  Users,
  Eye,
  ChevronDown,
  ChevronUp,
  Zap,
  Info,
  Calendar,
  Sparkles,
} from 'lucide-react';

interface MonthlyLineManpowerChartProps {
  lines: Record<'line-a' | 'line-b', LineData>;
  lineASummary: LineSummaryMetrics;
  lineBSummary: LineSummaryMetrics;
  globalMultiplier?: number;
  onSelectMonth?: (monthIndex: number) => void;
  className?: string;
}

type ChartDisplayMode = 'stacked_bar' | 'grouped_bar' | 'line_trend';
type MpCategoryFilter = 'total_mp' | 'dl_only' | 'idl_only' | 'spare_only' | 'volume';

export const MonthlyLineManpowerChart: React.FC<MonthlyLineManpowerChartProps> = ({
  lines,
  lineASummary,
  lineBSummary,
  globalMultiplier = 0,
  onSelectMonth,
  className = '',
}) => {
  const [displayMode, setDisplayMode] = useState<ChartDisplayMode>('stacked_bar');
  const [mpFilter, setMpFilter] = useState<MpCategoryFilter>('total_mp');
  const [hoveredMonthIndex, setHoveredMonthIndex] = useState<number | null>(null);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number | null>(null);
  const [showDataTable, setShowDataTable] = useState<boolean>(false);

  // Calculate detailed 12 months for Line A
  const lineAMonths: MonthlyForecastItem[] = useMemo(() => {
    return lines['line-a'].forecastData.map((item) => {
      const adjusted = { ...item };
      if (globalMultiplier !== 0) {
        const baseVol = item.targetMonthlyVolume || 35000;
        adjusted.targetMonthlyVolume = Math.round(baseVol * (1 + globalMultiplier / 100));
      }
      return calculateForecastItem(
        adjusted,
        lines['line-a'].stations,
        lines['line-a'].idlRoles,
        lines['line-a'].shiftConfig,
        lineASummary.totalDlShiftA,
        lineASummary.grandTotalMp
      );
    });
  }, [lines, lineASummary, globalMultiplier]);

  // Calculate detailed 12 months for Line B
  const lineBMonths: MonthlyForecastItem[] = useMemo(() => {
    return lines['line-b'].forecastData.map((item) => {
      const adjusted = { ...item };
      if (globalMultiplier !== 0) {
        const baseVol = item.targetMonthlyVolume || 40000;
        adjusted.targetMonthlyVolume = Math.round(baseVol * (1 + globalMultiplier / 100));
      }
      return calculateForecastItem(
        adjusted,
        lines['line-b'].stations,
        lines['line-b'].idlRoles,
        lines['line-b'].shiftConfig,
        lineBSummary.totalDlShiftA,
        lineBSummary.grandTotalMp
      );
    });
  }, [lines, lineBSummary, globalMultiplier]);

  // Combine monthly comparison data
  const monthlyComparison = useMemo(() => {
    return lineBMonths.map((mB, idx) => {
      const mA = lineAMonths[idx] || lineAMonths[0];

      // Values based on current filter
      let valA = mA.grandTotalMp;
      let valB = mB.grandTotalMp;

      if (mpFilter === 'dl_only') {
        valA = mA.totalRequiredDl;
        valB = mB.totalRequiredDl;
      } else if (mpFilter === 'idl_only') {
        valA = mA.totalRequiredIdl;
        valB = mB.totalRequiredIdl;
      } else if (mpFilter === 'spare_only') {
        valA = mA.totalRequiredSpare;
        valB = mB.totalRequiredSpare;
      } else if (mpFilter === 'volume') {
        valA = mA.targetMonthlyVolume;
        valB = mB.targetMonthlyVolume;
      }

      const totalVal = valA + valB;
      const shareA = totalVal > 0 ? Number(((valA / totalVal) * 100).toFixed(1)) : 50;
      const shareB = totalVal > 0 ? Number(((valB / totalVal) * 100).toFixed(1)) : 50;

      return {
        monthIndex: mB.monthIndex,
        monthName: mB.monthName,
        lineA: {
          item: mA,
          displayValue: valA,
          dl: mA.totalRequiredDl,
          idl: mA.totalRequiredIdl,
          spare: mA.totalRequiredSpare,
          totalMp: mA.grandTotalMp,
          volume: mA.targetMonthlyVolume,
          uph: mA.requiredUph,
          shiftMode: mA.shiftMode,
        },
        lineB: {
          item: mB,
          displayValue: valB,
          dl: mB.totalRequiredDl,
          idl: mB.totalRequiredIdl,
          spare: mB.totalRequiredSpare,
          totalMp: mB.grandTotalMp,
          volume: mB.targetMonthlyVolume,
          uph: mB.requiredUph,
          shiftMode: mB.shiftMode,
        },
        totalDisplayValue: totalVal,
        totalPlantMp: mA.grandTotalMp + mB.grandTotalMp,
        totalPlantDl: mA.totalRequiredDl + mB.totalRequiredDl,
        totalPlantIdl: Number((mA.totalRequiredIdl + mB.totalRequiredIdl).toFixed(1)),
        totalPlantSpare: mA.totalRequiredSpare + mB.totalRequiredSpare,
        totalVolume: mA.targetMonthlyVolume + mB.targetMonthlyVolume,
        shareA,
        shareB,
      };
    });
  }, [lineAMonths, lineBMonths, mpFilter]);

  // Aggregate stats
  const stats = useMemo(() => {
    let peakAVal = 0;
    let peakAMonth = '';
    let peakBVal = 0;
    let peakBMonth = '';
    let peakTotalVal = 0;
    let peakTotalMonth = '';
    let sumA = 0;
    let sumB = 0;

    monthlyComparison.forEach((m) => {
      if (m.lineA.displayValue > peakAVal) {
        peakAVal = m.lineA.displayValue;
        peakAMonth = m.monthName;
      }
      if (m.lineB.displayValue > peakBVal) {
        peakBVal = m.lineB.displayValue;
        peakBMonth = m.monthName;
      }
      if (m.totalDisplayValue > peakTotalVal) {
        peakTotalVal = m.totalDisplayValue;
        peakTotalMonth = m.monthName;
      }
      sumA += m.lineA.displayValue;
      sumB += m.lineB.displayValue;
    });

    const avgA = Math.round(sumA / monthlyComparison.length);
    const avgB = Math.round(sumB / monthlyComparison.length);
    const avgTotal = Math.round((sumA + sumB) / monthlyComparison.length);

    return {
      peakAVal,
      peakAMonth,
      peakBVal,
      peakBMonth,
      peakTotalVal,
      peakTotalMonth,
      avgA,
      avgB,
      avgTotal,
    };
  }, [monthlyComparison]);

  // Active month for detail card (hovered or selected or first)
  const activeMonthIndex = hoveredMonthIndex !== null ? hoveredMonthIndex : selectedMonthIndex;
  const activeMonthData =
    monthlyComparison.find((m) => m.monthIndex === activeMonthIndex) || null;

  // Chart dimensions & calculations
  const svgWidth = 960;
  const svgHeight = 260;
  const padLeft = 55;
  const padRight = 30;
  const padTop = 30;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  // Find max scale for Y axis
  const maxDataVal = useMemo(() => {
    if (displayMode === 'stacked_bar') {
      const maxVal = Math.max(...monthlyComparison.map((m) => m.totalDisplayValue), 10);
      return Math.ceil((maxVal * 1.15) / 50) * 50;
    } else {
      const maxVal = Math.max(
        ...monthlyComparison.map((m) => Math.max(m.lineA.displayValue, m.lineB.displayValue)),
        10
      );
      return Math.ceil((maxVal * 1.15) / 50) * 50;
    }
  }, [monthlyComparison, displayMode]);

  const numYDivisions = 5;
  const yTicks = Array.from({ length: numYDivisions + 1 }, (_, i) =>
    Math.round((maxDataVal / numYDivisions) * i)
  );

  const colWidth = plotWidth / monthlyComparison.length;

  const getUnitLabel = () => {
    if (mpFilter === 'volume') return 'ชิ้น (pcs)';
    return 'คน (headcount)';
  };

  const getFilterName = () => {
    switch (mpFilter) {
      case 'total_mp':
        return 'อัตรากำลังคนรวมทั้งหมด (Grand Total MP = DL + IDL + Spare)';
      case 'dl_only':
        return 'เฉพาะพนักงานฝ่ายผลิตทางตรง (Direct Labor - DL)';
      case 'idl_only':
        return 'เฉพาะพนักงานฝ่ายสนับสนุนทางอ้อม (Indirect Labor - IDL)';
      case 'spare_only':
        return 'เฉพาะพนักงานสำรองการขาดลา (Spare / Relief)';
      case 'volume':
        return 'ยอดเป้าหมายการผลิตรายเดือน (Target Monthly Volume)';
    }
  };

  return (
    <div
      className={`p-4 sm:p-5 bg-slate-900/80 border border-slate-800 rounded-2xl space-y-4 shadow-xl ${className}`}
    >
      {/* Header & Controls Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-3 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500/20 to-amber-500/20 border border-cyan-500/40 flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
            </div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <span>กราฟความต้องการกำลังคนรายเดือนแยก Line A vs Line B</span>
              <span className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/40">
                Monthly MP Comparison
              </span>
            </h3>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            {getFilterName()} · แสดงผลแยกตามแต่ละสายการผลิตพร้อมยอดรวมทั้งโรงงานตลอด 12 เดือน
          </p>
        </div>

        {/* View Mode & Filter Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Category Filter Selector */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setMpFilter('total_mp')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mpFilter === 'total_mp'
                  ? 'bg-gradient-to-r from-cyan-500 to-amber-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="อัตรากำลังคนรวมทั้งหมด (DL + IDL + Spare)"
            >
              คนรวม (Total MP)
            </button>
            <button
              onClick={() => setMpFilter('dl_only')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mpFilter === 'dl_only'
                  ? 'bg-cyan-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="เฉพาะพนักงานฝ่ายผลิต (DL)"
            >
              เฉพาะ DL
            </button>
            <button
              onClick={() => setMpFilter('idl_only')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mpFilter === 'idl_only'
                  ? 'bg-purple-500 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="เฉพาะพนักงานสนับสนุน (IDL)"
            >
              เฉพาะ IDL
            </button>
            <button
              onClick={() => setMpFilter('volume')}
              className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                mpFilter === 'volume'
                  ? 'bg-emerald-400 text-slate-950 shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
              title="ยอดการผลิตรายเดือน (ชิ้น)"
            >
              ยอดผลิต (Volume)
            </button>
          </div>

          {/* Graph Style Selector */}
          <div className="flex items-center p-1 bg-slate-950 border border-slate-800 rounded-xl">
            <button
              onClick={() => setDisplayMode('stacked_bar')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                displayMode === 'stacked_bar'
                  ? 'bg-slate-800 text-cyan-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="กราฟแท่งแบบซ้อน (Stacked Bar) รวมโรงงาน"
            >
              <Layers className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('grouped_bar')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                displayMode === 'grouped_bar'
                  ? 'bg-slate-800 text-amber-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="กราฟแท่งคู่เปรียบเทียบ (Grouped Bar)"
            >
              <BarChart3 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setDisplayMode('line_trend')}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                displayMode === 'line_trend'
                  ? 'bg-slate-800 text-emerald-300'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
              title="กราฟเส้นแนวโน้ม (Line Trend)"
            >
              <LineChartIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlights: Line A, Line B, and Total Peak */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* Line A Summary */}
        <div className="p-3 bg-slate-950/70 border border-cyan-500/30 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
              <span>{lines['line-a'].name}</span>
            </span>
            <span className="text-[10px] text-slate-400">เฉลี่ยต่อเดือน</span>
          </div>
          <div className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
            {formatNumber(stats.avgA)} <span className="text-xs font-normal text-slate-400">{getUnitLabel()}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>พีคสูงสุด: {stats.peakAMonth}</span>
            <span className="font-mono text-cyan-300 font-bold">{formatNumber(stats.peakAVal)}</span>
          </div>
        </div>

        {/* Line B Summary */}
        <div className="p-3 bg-slate-950/70 border border-amber-500/30 rounded-xl relative overflow-hidden">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold mb-1">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400"></span>
              <span>{lines['line-b'].name}</span>
            </span>
            <span className="text-[10px] text-slate-400">เฉลี่ยต่อเดือน</span>
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 tabular-nums">
            {formatNumber(stats.avgB)} <span className="text-xs font-normal text-slate-400">{getUnitLabel()}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>พีคสูงสุด: {stats.peakBMonth}</span>
            <span className="font-mono text-amber-300 font-bold">{formatNumber(stats.peakBVal)}</span>
          </div>
        </div>

        {/* Combined Factory Peak */}
        <div className="p-3 bg-slate-950/70 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold mb-1">
            <span>ยอดรวมทั้งโรงงาน (Plant Total)</span>
            <span className="text-[10px] text-slate-400">เฉลี่ยรวม</span>
          </div>
          <div className="text-xl font-bold font-mono text-emerald-300 tabular-nums">
            {formatNumber(stats.avgTotal)} <span className="text-xs font-normal text-slate-400">{getUnitLabel()}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>เดือนพีคสุด: {stats.peakTotalMonth}</span>
            <span className="font-mono text-emerald-300 font-bold">{formatNumber(stats.peakTotalVal)}</span>
          </div>
        </div>

        {/* Line A vs Line B Ratio */}
        <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-xs text-slate-400 font-semibold mb-1">
            <span>สัดส่วนเฉลี่ย Line A : B</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-base font-bold font-mono text-white tabular-nums flex items-center gap-1.5 mt-0.5">
            <span className="text-cyan-400">
              {stats.avgTotal > 0 ? Math.round((stats.avgA / stats.avgTotal) * 100) : 48}%
            </span>
            <span className="text-slate-500">:</span>
            <span className="text-amber-400">
              {stats.avgTotal > 0 ? Math.round((stats.avgB / stats.avgTotal) * 100) : 52}%
            </span>
          </div>
          {/* Mini progress bar ratio */}
          <div className="w-full h-1.5 bg-slate-800 rounded-full mt-2 overflow-hidden flex">
            <div
              className="bg-cyan-400 h-full"
              style={{
                width: `${stats.avgTotal > 0 ? (stats.avgA / stats.avgTotal) * 100 : 48}%`,
              }}
            ></div>
            <div
              className="bg-amber-400 h-full"
              style={{
                width: `${stats.avgTotal > 0 ? (stats.avgB / stats.avgTotal) * 100 : 52}%`,
              }}
            ></div>
          </div>
        </div>
      </div>

      {/* Main Interactive SVG Chart */}
      <div className="relative bg-slate-950/90 rounded-2xl border border-slate-800 p-3 pt-6 overflow-hidden">
        {/* Chart Legend Bar */}
        <div className="flex items-center justify-between px-2 mb-2 flex-wrap gap-2 text-xs font-mono">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-400 inline-block shadow-sm shadow-cyan-500/50"></span>
              <span className="text-cyan-300 font-semibold">
                {lines['line-a'].name} ({lineASummary.targetUph} UPH)
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400 inline-block shadow-sm shadow-amber-500/50"></span>
              <span className="text-amber-300 font-semibold">
                {lines['line-b'].name} ({lineBSummary.targetUph} UPH)
              </span>
            </div>
            {displayMode === 'stacked_bar' && (
              <div className="flex items-center gap-1.5 text-slate-400">
                <span className="text-emerald-400 font-bold">▲ ยอดรวมโรงงาน</span>
                <span>(Line A + Line B)</span>
              </div>
            )}
            {displayMode === 'line_trend' && (
              <div className="flex items-center gap-1.5 text-emerald-400">
                <span className="w-4 h-0.5 border-t-2 border-dashed border-emerald-400 inline-block"></span>
                <span>ยอดรวมโรงงาน (Combined Trend)</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-500">
            *คลิกหรือวางเมาส์เหนือแท่งกราฟเพื่อดูรายละเอียดรายเดือน
          </div>
        </div>

        {/* SVG Viewport */}
        <div className="w-full h-64 sm:h-72">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-full select-none overflow-visible"
          >
            <defs>
              <linearGradient id="cyanBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#0891b2" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="amberBarGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#d97706" stopOpacity="0.75" />
              </linearGradient>
              <linearGradient id="lineAGradArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.0" />
              </linearGradient>
              <linearGradient id="lineBGradArea" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines & Y Axis labels */}
            {yTicks.map((tickVal) => {
              const y = padTop + plotHeight - (tickVal / (maxDataVal || 1)) * plotHeight;
              return (
                <g key={tickVal}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#1e293b"
                    strokeDasharray="4 4"
                    strokeWidth="1"
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 3.5}
                    textAnchor="end"
                    fill="#64748b"
                    fontSize="10"
                    fontFamily="monospace"
                  >
                    {formatNumber(tickVal)}
                  </text>
                </g>
              );
            })}

            {/* X-axis baseline */}
            <line
              x1={padLeft}
              y1={padTop + plotHeight}
              x2={svgWidth - padRight}
              y2={padTop + plotHeight}
              stroke="#334155"
              strokeWidth="1.5"
            />

            {/* ============================================================== */}
            {/* RENDERING MODE 1: STACKED BAR CHART                           */}
            {/* ============================================================== */}
            {displayMode === 'stacked_bar' &&
              monthlyComparison.map((m, idx) => {
                const xCenter = padLeft + idx * colWidth + colWidth / 2;
                const barWidth = Math.min(42, colWidth * 0.65);
                const barX = xCenter - barWidth / 2;

                const valA = m.lineA.displayValue;
                const valB = m.lineB.displayValue;
                const totalVal = m.totalDisplayValue;

                const heightA = (valA / (maxDataVal || 1)) * plotHeight;
                const heightB = (valB / (maxDataVal || 1)) * plotHeight;
                const yA = padTop + plotHeight - heightA;
                const yB = yA - heightB;

                const isHovered = hoveredMonthIndex === m.monthIndex;
                const isSelected = selectedMonthIndex === m.monthIndex;

                return (
                  <g
                    key={m.monthIndex}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredMonthIndex(m.monthIndex)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                    onClick={() => {
                      setSelectedMonthIndex(isSelected ? null : m.monthIndex);
                      if (onSelectMonth) onSelectMonth(m.monthIndex);
                    }}
                  >
                    {/* Hover highlight pillar */}
                    {(isHovered || isSelected) && (
                      <rect
                        x={xCenter - colWidth / 2 + 2}
                        y={padTop}
                        width={colWidth - 4}
                        height={plotHeight}
                        fill="#38bdf8"
                        fillOpacity="0.08"
                        rx="6"
                      />
                    )}

                    {/* Line A Bar (Bottom) */}
                    <rect
                      x={barX}
                      y={yA}
                      width={barWidth}
                      height={Math.max(1, heightA)}
                      fill="url(#cyanBarGrad)"
                      rx="3"
                      className="transition-all duration-200"
                      stroke={isHovered ? '#67e8f9' : 'none'}
                      strokeWidth="1"
                    />

                    {/* Line B Bar (Top, stacked on A) */}
                    <rect
                      x={barX}
                      y={yB}
                      width={barWidth}
                      height={Math.max(1, heightB)}
                      fill="url(#amberBarGrad)"
                      rx="3"
                      className="transition-all duration-200"
                      stroke={isHovered ? '#fcd34d' : 'none'}
                      strokeWidth="1"
                    />

                    {/* Inner Values on Bar if tall enough */}
                    {heightA > 22 && (
                      <text
                        x={xCenter}
                        y={yA + heightA / 2 + 3.5}
                        textAnchor="middle"
                        fill="#083344"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {formatNumber(valA)}
                      </text>
                    )}
                    {heightB > 22 && (
                      <text
                        x={xCenter}
                        y={yB + heightB / 2 + 3.5}
                        textAnchor="middle"
                        fill="#451a03"
                        fontSize="9"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {formatNumber(valB)}
                      </text>
                    )}

                    {/* Total Grand MP Label on top of stack */}
                    <text
                      x={xCenter}
                      y={yB - 6}
                      textAnchor="middle"
                      fill={isHovered ? '#34d399' : '#94a3b8'}
                      fontSize="10"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {formatNumber(totalVal)}
                    </text>

                    {/* X-axis Month Label */}
                    <text
                      x={xCenter}
                      y={padTop + plotHeight + 16}
                      textAnchor="middle"
                      fill={isHovered || isSelected ? '#38bdf8' : '#94a3b8'}
                      fontSize="10"
                      fontWeight={isHovered || isSelected ? 'bold' : 'normal'}
                      fontFamily="sans-serif"
                    >
                      {m.monthName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

            {/* ============================================================== */}
            {/* RENDERING MODE 2: GROUPED BAR CHART                           */}
            {/* ============================================================== */}
            {displayMode === 'grouped_bar' &&
              monthlyComparison.map((m, idx) => {
                const xCenter = padLeft + idx * colWidth + colWidth / 2;
                const singleBarWidth = Math.min(22, colWidth * 0.38);
                const gap = 3;

                const valA = m.lineA.displayValue;
                const valB = m.lineB.displayValue;

                const heightA = (valA / (maxDataVal || 1)) * plotHeight;
                const heightB = (valB / (maxDataVal || 1)) * plotHeight;
                const yA = padTop + plotHeight - heightA;
                const yB = padTop + plotHeight - heightB;

                const barXA = xCenter - singleBarWidth - gap / 2;
                const barXB = xCenter + gap / 2;

                const isHovered = hoveredMonthIndex === m.monthIndex;
                const isSelected = selectedMonthIndex === m.monthIndex;

                return (
                  <g
                    key={m.monthIndex}
                    className="cursor-pointer transition-opacity"
                    onMouseEnter={() => setHoveredMonthIndex(m.monthIndex)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                    onClick={() => {
                      setSelectedMonthIndex(isSelected ? null : m.monthIndex);
                      if (onSelectMonth) onSelectMonth(m.monthIndex);
                    }}
                  >
                    {/* Hover highlight pillar */}
                    {(isHovered || isSelected) && (
                      <rect
                        x={xCenter - colWidth / 2 + 2}
                        y={padTop}
                        width={colWidth - 4}
                        height={plotHeight}
                        fill="#38bdf8"
                        fillOpacity="0.08"
                        rx="6"
                      />
                    )}

                    {/* Line A Bar */}
                    <rect
                      x={barXA}
                      y={yA}
                      width={singleBarWidth}
                      height={Math.max(1, heightA)}
                      fill="url(#cyanBarGrad)"
                      rx="3"
                    />
                    <text
                      x={barXA + singleBarWidth / 2}
                      y={yA - 4}
                      textAnchor="middle"
                      fill="#22d3ee"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {formatNumber(valA)}
                    </text>

                    {/* Line B Bar */}
                    <rect
                      x={barXB}
                      y={yB}
                      width={singleBarWidth}
                      height={Math.max(1, heightB)}
                      fill="url(#amberBarGrad)"
                      rx="3"
                    />
                    <text
                      x={barXB + singleBarWidth / 2}
                      y={yB - 4}
                      textAnchor="middle"
                      fill="#fbbf24"
                      fontSize="9"
                      fontFamily="monospace"
                      fontWeight="bold"
                    >
                      {formatNumber(valB)}
                    </text>

                    {/* X-axis Month Label */}
                    <text
                      x={xCenter}
                      y={padTop + plotHeight + 16}
                      textAnchor="middle"
                      fill={isHovered || isSelected ? '#38bdf8' : '#94a3b8'}
                      fontSize="10"
                      fontWeight={isHovered || isSelected ? 'bold' : 'normal'}
                      fontFamily="sans-serif"
                    >
                      {m.monthName.split(' ')[0]}
                    </text>
                  </g>
                );
              })}

            {/* ============================================================== */}
            {/* RENDERING MODE 3: LINE TREND CHART                            */}
            {/* ============================================================== */}
            {displayMode === 'line_trend' && (() => {
              const pointsA = monthlyComparison.map((m, idx) => {
                const x = padLeft + idx * colWidth + colWidth / 2;
                const y = padTop + plotHeight - (m.lineA.displayValue / (maxDataVal || 1)) * plotHeight;
                return { x, y, val: m.lineA.displayValue, month: m.monthName, mIndex: m.monthIndex };
              });

              const pointsB = monthlyComparison.map((m, idx) => {
                const x = padLeft + idx * colWidth + colWidth / 2;
                const y = padTop + plotHeight - (m.lineB.displayValue / (maxDataVal || 1)) * plotHeight;
                return { x, y, val: m.lineB.displayValue, month: m.monthName, mIndex: m.monthIndex };
              });

              const pointsTotal = monthlyComparison.map((m, idx) => {
                const x = padLeft + idx * colWidth + colWidth / 2;
                const y = padTop + plotHeight - (m.totalDisplayValue / (maxDataVal || 1)) * plotHeight;
                return { x, y, val: m.totalDisplayValue, month: m.monthName, mIndex: m.monthIndex };
              });

              const pathA = pointsA.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const pathB = pointsB.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const pathTotal = pointsTotal.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');

              const areaA = `${pathA} L ${pointsA[pointsA.length - 1].x} ${padTop + plotHeight} L ${pointsA[0].x} ${padTop + plotHeight} Z`;
              const areaB = `${pathB} L ${pointsB[pointsB.length - 1].x} ${padTop + plotHeight} L ${pointsB[0].x} ${padTop + plotHeight} Z`;

              return (
                <g>
                  {/* Shaded Areas */}
                  <path d={areaB} fill="url(#lineBGradArea)" />
                  <path d={areaA} fill="url(#lineAGradArea)" />

                  {/* Combined Total Line */}
                  <path
                    d={pathTotal}
                    fill="none"
                    stroke="#34d399"
                    strokeWidth="2.5"
                    strokeDasharray="4 4"
                  />

                  {/* Line B Path */}
                  <path
                    d={pathB}
                    fill="none"
                    stroke="#fbbf24"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Line A Path */}
                  <path
                    d={pathA}
                    fill="none"
                    stroke="#22d3ee"
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Nodes & Interactive Points */}
                  {pointsA.map((p, i) => {
                    const isHovered = hoveredMonthIndex === p.mIndex;
                    const pB = pointsB[i];
                    const pTot = pointsTotal[i];

                    return (
                      <g
                        key={p.mIndex}
                        className="cursor-pointer"
                        onMouseEnter={() => setHoveredMonthIndex(p.mIndex)}
                        onMouseLeave={() => setHoveredMonthIndex(null)}
                        onClick={() => {
                          setSelectedMonthIndex(selectedMonthIndex === p.mIndex ? null : p.mIndex);
                          if (onSelectMonth) onSelectMonth(p.mIndex);
                        }}
                      >
                        {/* Vertical tracking line on hover */}
                        {isHovered && (
                          <line
                            x1={p.x}
                            y1={padTop}
                            x2={p.x}
                            y2={padTop + plotHeight}
                            stroke="#64748b"
                            strokeDasharray="2 2"
                            strokeWidth="1"
                          />
                        )}

                        {/* Total Node */}
                        <circle cx={pTot.x} cy={pTot.y} r={isHovered ? 5 : 3.5} fill="#34d399" />
                        <text
                          x={pTot.x}
                          y={pTot.y - 6}
                          textAnchor="middle"
                          fill="#34d399"
                          fontSize="9"
                          fontFamily="monospace"
                          fontWeight="bold"
                        >
                          {formatNumber(pTot.val)}
                        </text>

                        {/* Line B Node */}
                        <circle
                          cx={pB.x}
                          cy={pB.y}
                          r={isHovered ? 6 : 4}
                          fill="#fbbf24"
                          stroke="#451a03"
                          strokeWidth="1.5"
                        />

                        {/* Line A Node */}
                        <circle
                          cx={p.x}
                          cy={p.y}
                          r={isHovered ? 6 : 4}
                          fill="#22d3ee"
                          stroke="#083344"
                          strokeWidth="1.5"
                        />

                        {/* X-axis Label */}
                        <text
                          x={p.x}
                          y={padTop + plotHeight + 16}
                          textAnchor="middle"
                          fill={isHovered ? '#38bdf8' : '#94a3b8'}
                          fontSize="10"
                          fontWeight={isHovered ? 'bold' : 'normal'}
                          fontFamily="sans-serif"
                        >
                          {p.month.split(' ')[0]}
                        </text>
                      </g>
                    );
                  })}
                </g>
              );
            })()}
          </svg>
        </div>
      </div>

      {/* Floating or Selected Month Inspection Card */}
      {activeMonthData && (
        <div className="p-3.5 bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 border border-cyan-500/40 rounded-xl space-y-2 animate-in fade-in shadow-lg">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-cyan-400" />
              <span className="text-sm font-bold text-white">
                รายละเอียดความต้องการกำลังคนประจำเดือน: {activeMonthData.monthName}
              </span>
              <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                {activeMonthData.lineB.shiftMode}
              </span>
            </div>
            <div className="text-xs font-mono text-emerald-400 font-bold">
              กำลังคนรวมทั้งโรงงาน: {formatNumber(activeMonthData.totalPlantMp)} คน
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {/* Line A Month Details */}
            <div className="p-3 bg-slate-900/80 border border-cyan-500/30 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
                  <span>{lines['line-a'].name}</span>
                </span>
                <span className="font-mono font-bold text-cyan-200">
                  {formatNumber(activeMonthData.lineA.totalMp)} คน (สัดส่วน {activeMonthData.shareA}%)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">DL ผลิต:</span>
                  <span className="font-semibold text-cyan-400">{activeMonthData.lineA.dl}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">IDL สนับสนุน:</span>
                  <span className="font-semibold text-purple-400">{activeMonthData.lineA.idl}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Spare สำรอง:</span>
                  <span className="font-semibold text-amber-400">{activeMonthData.lineA.spare}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ยอดเป้าหมาย:</span>
                  <span className="font-semibold text-slate-200">{formatNumber(activeMonthData.lineA.volume)} pcs</span>
                </div>
              </div>
            </div>

            {/* Line B Month Details */}
            <div className="p-3 bg-slate-900/80 border border-amber-500/30 rounded-lg space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  <span>{lines['line-b'].name}</span>
                </span>
                <span className="font-mono font-bold text-amber-200">
                  {formatNumber(activeMonthData.lineB.totalMp)} คน (สัดส่วน {activeMonthData.shareB}%)
                </span>
              </div>
              <div className="grid grid-cols-4 gap-2 text-[11px] font-mono text-slate-300 pt-1">
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">DL ผลิต:</span>
                  <span className="font-semibold text-amber-400">{activeMonthData.lineB.dl}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">IDL สนับสนุน:</span>
                  <span className="font-semibold text-purple-400">{activeMonthData.lineB.idl}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">Spare สำรอง:</span>
                  <span className="font-semibold text-amber-400">{activeMonthData.lineB.spare}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block font-sans">ยอดเป้าหมาย:</span>
                  <span className="font-semibold text-slate-200">{formatNumber(activeMonthData.lineB.volume)} pcs</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Expandable Full Data Breakdown Table */}
      <div className="pt-1">
        <button
          onClick={() => setShowDataTable(!showDataTable)}
          className="w-full flex items-center justify-between px-3 py-2 bg-slate-950 hover:bg-slate-900 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2">
            <Eye className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              {showDataTable ? 'ซ่อน' : 'แสดง'} ตารางข้อมูลตัวเลขความต้องการกำลังคนรายเดือนแยก Line A, Line B (Monthly Breakdown Table)
            </span>
          </span>
          {showDataTable ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>

        {showDataTable && (
          <div className="mt-3 overflow-x-auto border border-slate-800 rounded-xl animate-in fade-in">
            <table className="w-full text-xs text-left border-collapse">
              <thead>
                <tr className="bg-slate-950 text-slate-400 text-[11px] font-mono border-b border-slate-800">
                  <th className="py-2.5 px-3">เดือน</th>
                  <th className="py-2.5 px-3 text-right text-cyan-400">Vol Line A</th>
                  <th className="py-2.5 px-3 text-right text-cyan-400">DL Line A</th>
                  <th className="py-2.5 px-3 text-right text-cyan-400">Total Line A</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">Vol Line B</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">DL Line B</th>
                  <th className="py-2.5 px-3 text-right text-amber-400">Total Line B</th>
                  <th className="py-2.5 px-3 text-right text-emerald-400 font-bold">รวมโรงงาน (Plant MP)</th>
                  <th className="py-2.5 px-3 text-center text-slate-400">สัดส่วน A : B</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {monthlyComparison.map((m) => (
                  <tr
                    key={m.monthIndex}
                    className={`hover:bg-slate-800/40 transition-colors ${
                      hoveredMonthIndex === m.monthIndex ? 'bg-cyan-950/20' : ''
                    }`}
                    onMouseEnter={() => setHoveredMonthIndex(m.monthIndex)}
                    onMouseLeave={() => setHoveredMonthIndex(null)}
                  >
                    <td className="py-2 px-3 font-sans font-medium text-white">
                      {m.monthName}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {formatNumber(m.lineA.volume)}
                    </td>
                    <td className="py-2 px-3 text-right text-cyan-300 font-semibold">
                      {m.lineA.dl}
                    </td>
                    <td className="py-2 px-3 text-right text-cyan-400 font-bold bg-cyan-950/20">
                      {formatNumber(m.lineA.totalMp)}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-300">
                      {formatNumber(m.lineB.volume)}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-300 font-semibold">
                      {m.lineB.dl}
                    </td>
                    <td className="py-2 px-3 text-right text-amber-400 font-bold bg-amber-950/20">
                      {formatNumber(m.lineB.totalMp)}
                    </td>
                    <td className="py-2 px-3 text-right text-emerald-300 font-bold bg-emerald-950/20 text-sm">
                      {formatNumber(m.totalPlantMp)} คน
                    </td>
                    <td className="py-2 px-3 text-center text-slate-400 text-[11px]">
                      <span className="text-cyan-400 font-semibold">{m.shareA}%</span> :{' '}
                      <span className="text-amber-400 font-semibold">{m.shareB}%</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
