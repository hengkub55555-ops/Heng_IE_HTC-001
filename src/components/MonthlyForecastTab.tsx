import React, { useState, useMemo } from 'react';
import {
  StationData,
  IndirectLaborRole,
  ShiftConfig,
  MonthlyForecastItem,
  LineSummaryMetrics,
  LineData,
} from '../types/manpower';
import {
  calculateForecastItem,
  formatNumber,
  formatPct,
} from '../utils/ieCalculations';
import { MonthlyLineManpowerChart } from './MonthlyLineManpowerChart';
import {
  TrendingUp,
  Sliders,
  Users,
  Clock,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Layers,
  HelpCircle,
  BarChart3,
  LineChart as LineChartIcon,
} from 'lucide-react';

interface MonthlyForecastTabProps {
  stations: StationData[];
  idlRoles: IndirectLaborRole[];
  shiftConfig: ShiftConfig;
  forecastData: Partial<MonthlyForecastItem>[];
  setForecastData: React.Dispatch<React.SetStateAction<Partial<MonthlyForecastItem>[]>>;
  summary: LineSummaryMetrics;
  lines?: Record<string, LineData>;
  lineASummary?: LineSummaryMetrics;
  lineBSummary?: LineSummaryMetrics;
  activeLineId?: string;
  setActiveLineId?: (lineId: string) => void;
}

export const MonthlyForecastTab: React.FC<MonthlyForecastTabProps> = ({
  stations,
  idlRoles,
  shiftConfig,
  forecastData,
  setForecastData,
  summary,
  lines,
  lineASummary,
  lineBSummary,
  activeLineId,
  setActiveLineId,
}) => {
  // Global volume sensitivity adjustment slider (-30% to +80%)
  const [globalVolumeMultiplier, setGlobalVolumeMultiplier] = useState<number>(0);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState<number>(5); // default June
  const [chartViewMode, setChartViewMode] = useState<'both_lines' | 'single_line'>('both_lines');

  // Calculate detailed forecast for all months
  const calculatedMonths: MonthlyForecastItem[] = useMemo(() => {
    return forecastData.map((item) => {
      // Apply multiplier if active
      const adjustedItem = { ...item };
      if (globalVolumeMultiplier !== 0) {
        const baseVol = item.targetMonthlyVolume || 40000;
        adjustedItem.targetMonthlyVolume = Math.round(
          baseVol * (1 + globalVolumeMultiplier / 100)
        );
      }
      return calculateForecastItem(
        adjustedItem,
        stations,
        idlRoles,
        shiftConfig,
        summary.totalDlShiftA,
        summary.grandTotalMp
      );
    });
  }, [
    forecastData,
    globalVolumeMultiplier,
    stations,
    idlRoles,
    shiftConfig,
    summary.totalDlShiftA,
    summary.grandTotalMp,
  ]);

  // Selected month detail
  const selectedMonth = calculatedMonths.find((m) => m.monthIndex === selectedMonthIndex) || calculatedMonths[0];

  // Update specific month field
  const handleMonthUpdate = (
    index: number,
    field: keyof MonthlyForecastItem,
    val: string | number
  ) => {
    setForecastData((prev) =>
      prev.map((item) => {
        if (item.monthIndex !== index) return item;
        return {
          ...item,
          [field]: val,
        };
      })
    );
  };

  // Quick apply boost to all months
  const handleQuickPreset = (percent: number) => {
    setGlobalVolumeMultiplier(percent);
  };

  // Summary stats over 12 months
  const totalAnnualVolume = calculatedMonths.reduce((sum, m) => sum + m.targetMonthlyVolume, 0);
  const maxRequiredMp = Math.max(...calculatedMonths.map((m) => m.grandTotalMp));
  const minRequiredMp = Math.min(...calculatedMonths.map((m) => m.grandTotalMp));
  const avgRequiredMp = Math.round(
    calculatedMonths.reduce((sum, m) => sum + m.grandTotalMp, 0) / calculatedMonths.length
  );
  const maxDelta = Math.max(...calculatedMonths.map((m) => m.mpDeltaFromBase));

  return (
    <div className="space-y-6">
      {/* Top Banner & What-If Sensitivity Simulator */}
      <div className="p-4 bg-slate-900/80 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-cyan-400" />
              <span>ระบบวางแผนอัตรากำลังคนรายเดือน (Monthly Manpower Forecast & Capacity Scaling)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              คำนวณสูตร IE อัตโนมัติ: หากมียอดผลิตเพิ่ม/ลด จะต้องใช้คนเพิ่มขึ้นเท่าไหร่ (DL + IDL + Spare) พร้อมวิเคราะห์กะและ OT
            </p>
          </div>

          {/* Quick presets */}
          <div className="flex items-center gap-1.5 self-start md:self-auto">
            <span className="text-xs text-slate-400 mr-1">จำลองยอดผลิต:</span>
            {[
              { label: 'ปกติ (0%)', val: 0 },
              { label: '+10%', val: 10 },
              { label: '+25%', val: 25 },
              { label: '+50%', val: 50 },
              { label: '-15%', val: -15 },
            ].map((preset) => (
              <button
                key={preset.val}
                onClick={() => handleQuickPreset(preset.val)}
                className={`px-2.5 py-1 text-xs font-mono font-medium rounded-lg transition-colors ${
                  globalVolumeMultiplier === preset.val
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        {/* Sensitivity Slider Control */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 shrink-0">
            <Sliders className="w-4 h-4 text-cyan-400" />
            <span>ปรับยอดผลิตแบบเรียลไทม์ (Volume Sensitivity Slider):</span>
          </div>

          <div className="flex-1 flex items-center gap-4">
            <input
              type="range"
              min="-30"
              max="80"
              step="5"
              value={globalVolumeMultiplier}
              onChange={(e) => setGlobalVolumeMultiplier(parseInt(e.target.value))}
              className="w-full accent-cyan-400 h-2 bg-slate-800 rounded-lg cursor-pointer"
            />
            <span
              className={`font-mono text-sm font-bold w-16 text-right tabular-nums ${
                globalVolumeMultiplier > 0
                  ? 'text-cyan-400'
                  : globalVolumeMultiplier < 0
                  ? 'text-amber-400'
                  : 'text-slate-400'
              }`}
            >
              {globalVolumeMultiplier > 0 ? `+${globalVolumeMultiplier}%` : `${globalVolumeMultiplier}%`}
            </span>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards for Forecast */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">ยอดผลิตทั้งปี (Annual Volume)</div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {formatNumber(totalAnnualVolume)} <span className="text-xs font-normal text-slate-400">ชิ้น</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            เฉลี่ย {formatNumber(Math.round(totalAnnualVolume / 12))} ชิ้น/เดือน
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">มาตรฐานปัจจุบัน (Baseline MP)</div>
          <div className="text-xl font-bold font-mono text-slate-200 tabular-nums">
            {formatNumber(summary.grandTotalMp, 1)} <span className="text-xs font-normal text-slate-400">คน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            DL {summary.totalDl} · IDL {summary.totalIdl} · Spare {summary.totalSpare}
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">ช่วงความต้องการกำลังคน (MP Range)</div>
          <div className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
            {minRequiredMp} - {maxRequiredMp} <span className="text-xs font-normal text-slate-400">คน</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            เฉลี่ยความต้องการ {avgRequiredMp} คน/เดือน
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">ความต้องการคนเพิ่มสูงสุด (Peak Delta)</div>
          <div className={`text-xl font-bold font-mono tabular-nums flex items-center gap-1 ${
            maxDelta > 0 ? 'text-rose-400' : 'text-emerald-400'
          }`}>
            {maxDelta > 0 ? (
              <>
                <ArrowUpRight className="w-5 h-5 text-rose-400" />
                <span>+{maxDelta} คน</span>
              </>
            ) : (
              <span>0 คน (เพียงพอ)</span>
            )}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            ต้องวางแผนรับคนล่วงหน้า 2-4 สัปดาห์
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="text-slate-400 text-xs mb-1">ข้อแนะนำเชิงวิศวกรรม (IE Strategy)</div>
          <div className="text-xs text-slate-200 font-medium leading-relaxed">
            {maxDelta > 60
              ? '⚡ แนะนำเปิดกะ 3 (3-Shifts) ในช่วงพีค เพื่อลดภาระล่วงเวลา'
              : maxDelta > 0
              ? '⚙️ จัดทำ OT 1.5 - 2.5 ชม./วัน ร่วมกับการรับพนักงานสัญญาจ้าง'
              : '✅ อัตรากำลังคนปัจจุบันเพียงพอรองรับเป้าหมาย'}
          </div>
        </div>
      </div>

      {/* Chart View Switcher when multi-line data is available */}
      {lines && lineASummary && lineBSummary && (
        <div className="flex items-center justify-between p-2.5 bg-slate-900/90 border border-slate-800 rounded-xl flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span className="text-xs font-semibold text-white">เลือกรูปแบบกราฟความต้องการคน:</span>
          </div>
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg">
            <button
              onClick={() => setChartViewMode('both_lines')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                chartViewMode === 'both_lines'
                  ? 'bg-gradient-to-r from-cyan-500 to-amber-500 text-slate-950 shadow font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📊 กราฟเปรียบเทียบ Line A vs Line B
            </button>
            <button
              onClick={() => setChartViewMode('single_line')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors cursor-pointer ${
                chartViewMode === 'single_line'
                  ? 'bg-slate-800 text-white font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              📈 กราฟเฉพาะ {summary.lineName}
            </button>
          </div>
        </div>
      )}

      {/* 1. Multi-Line Comparison Chart */}
      {lines && lineASummary && lineBSummary && chartViewMode === 'both_lines' && (
        <MonthlyLineManpowerChart
          lines={lines}
          lineASummary={lineASummary}
          lineBSummary={lineBSummary}
          globalMultiplier={globalVolumeMultiplier}
          onSelectMonth={(mIdx) => setSelectedMonthIndex(mIdx)}
        />
      )}

      {/* 2. Single Line Chart */}
      {(!lines || chartViewMode === 'single_line') && (
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-sm font-semibold text-white">
              แผนภาพเปรียบเทียบ: ยอดการผลิตรายเดือน vs จำนวนกำลังคนรวมที่ต้องใช้ (Total MP Required)
            </span>
            <p className="text-xs text-slate-400">
              แท่งกราฟสีฟ้า = ยอดการผลิต (ชิ้น) · เส้นสีเหลือง = จำนวนคนรวมที่ต้องการ (คน)
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-3 rounded-sm bg-cyan-500/80 inline-block"></span>
              <span>Target Volume</span>
            </div>
            <div className="flex items-center gap-1.5 text-amber-400">
              <span className="w-3 h-1 bg-amber-400 inline-block"></span>
              <span>Total MP (DL+IDL+Spare)</span>
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div className="h-48 w-full pt-2">
          {(() => {
            const maxVol = Math.max(...calculatedMonths.map((m) => m.targetMonthlyVolume), 60000);
            const chartHeight = 150;
            const chartWidth = 900;
            const colWidth = chartWidth / calculatedMonths.length;

            return (
              <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 30}`} className="w-full h-full overflow-visible">
                {/* Horizontal reference grid lines */}
                {[0.25, 0.5, 0.75, 1.0].map((ratio) => {
                  const y = chartHeight - chartHeight * ratio;
                  return (
                    <g key={ratio}>
                      <line
                        x1="0"
                        y1={y}
                        x2={chartWidth}
                        y2={y}
                        stroke="#334155"
                        strokeDasharray="3 3"
                        strokeWidth="0.5"
                      />
                      <text x="5" y={y - 3} fill="#64748b" fontSize="9" fontFamily="monospace">
                        {formatNumber(Math.round(maxVol * ratio))} pcs
                      </text>
                    </g>
                  );
                })}

                {/* Bars for Volume */}
                {calculatedMonths.map((m, idx) => {
                  const barH = (m.targetMonthlyVolume / maxVol) * chartHeight;
                  const x = idx * colWidth + colWidth * 0.15;
                  const w = colWidth * 0.7;
                  const y = chartHeight - barH;
                  const isSelected = m.monthIndex === selectedMonthIndex;

                  return (
                    <g
                      key={m.id}
                      className="cursor-pointer group"
                      onClick={() => setSelectedMonthIndex(m.monthIndex)}
                    >
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={barH}
                        rx="3"
                        className={`transition-all ${
                          isSelected
                            ? 'fill-cyan-400'
                            : 'fill-cyan-600/60 group-hover:fill-cyan-500/80'
                        }`}
                      />
                      <text
                        x={x + w / 2}
                        y={chartHeight + 18}
                        textAnchor="middle"
                        fontSize="10"
                        fill={isSelected ? '#38bdf8' : '#94a3b8'}
                        fontWeight={isSelected ? 'bold' : 'normal'}
                      >
                        {m.monthName.split(' ')[0]}
                      </text>
                      <text
                        x={x + w / 2}
                        y={y - 5}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#cbd5e1"
                        fontFamily="monospace"
                      >
                        {Math.round(m.targetMonthlyVolume / 1000)}k
                      </text>
                    </g>
                  );
                })}

                {/* Polyline for Total MP */}
                {(() => {
                  const points = calculatedMonths.map((m, idx) => {
                    const x = idx * colWidth + colWidth / 2;
                    // Scale MP from minRequiredMp * 0.8 to maxRequiredMp * 1.15
                    const mpMin = Math.min(summary.grandTotalMp, minRequiredMp) * 0.8;
                    const mpMax = Math.max(summary.grandTotalMp, maxRequiredMp) * 1.15;
                    const norm = (m.grandTotalMp - mpMin) / (mpMax - mpMin || 1);
                    const y = chartHeight - norm * (chartHeight * 0.8) - 15;
                    return { x, y, mp: m.grandTotalMp };
                  });

                  const pathD = points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');

                  return (
                    <g>
                      <path d={pathD} fill="none" stroke="#fbbf24" strokeWidth="2.5" />
                      {points.map((pt, i) => (
                        <circle
                          key={i}
                          cx={pt.x}
                          cy={pt.y}
                          r="4"
                          fill="#fbbf24"
                          stroke="#0f172a"
                          strokeWidth="2"
                        />
                      ))}
                    </g>
                  );
                })()}
              </svg>
            );
          })()}
        </div>
      </div>
      )}

      {/* Detailed Monthly Forecast Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <span className="text-sm font-semibold text-white">
              ตารางแจกแจงพยากรณ์รายเดือน (12-Month Rolling Forecast & Manpower Requirement)
            </span>
            <p className="text-xs text-slate-400">
              คลิกแก้ไขเป้ายอดผลิตรายเดือน, จำนวนวันทำงาน, หรือโหมดกะการทำงานเพื่อดูผลลัพธ์ทันที
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-medium border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 min-w-[110px]">Month</th>
                <th className="py-2.5 px-2 w-16 text-right">Work Days</th>
                <th className="py-2.5 px-3 min-w-[130px] text-right">
                  Target Vol (ชิ้น)
                </th>
                <th className="py-2.5 px-2 min-w-[130px]">Shift Strategy</th>
                <th className="py-2.5 px-2 w-16 text-right">OT (h/d)</th>
                <th className="py-2.5 px-2 w-20 text-right">Req. UPH</th>
                <th className="py-2.5 px-2 w-20 text-right">Takt Time</th>
                <th className="py-2.5 px-2 w-20 text-right">Req. DL</th>
                <th className="py-2.5 px-2 w-20 text-right">Req. IDL</th>
                <th className="py-2.5 px-2 w-20 text-right">Spare ({shiftConfig.spareMpPct}%)</th>
                <th className="py-2.5 px-3 w-24 text-right">
                  Grand Total MP
                </th>
                <th className="py-2.5 px-3 w-24 text-right">
                  MP Delta (±)
                </th>
                <th className="py-2.5 px-2 w-20 text-right">Cap. Util %</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {calculatedMonths.map((m) => {
                const isSelected = m.monthIndex === selectedMonthIndex;
                const isOverStaffed = m.mpDeltaFromBase < 0;
                const isUnderStaffed = m.mpDeltaFromBase > 0;

                return (
                  <tr
                    key={m.id}
                    onClick={() => setSelectedMonthIndex(m.monthIndex)}
                    className={`cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-cyan-950/40 border-l-2 border-cyan-400'
                        : 'hover:bg-slate-800/30'
                    }`}
                  >
                    <td className="py-2.5 px-3 font-sans font-medium text-slate-200">
                      {m.monthName}
                    </td>

                    {/* Working Days */}
                    <td className="py-2 px-2 text-right">
                      <input
                        type="number"
                        min="15"
                        max="31"
                        value={m.workingDays}
                        onChange={(e) =>
                          handleMonthUpdate(m.monthIndex, 'workingDays', parseInt(e.target.value) || 24)
                        }
                        className="w-12 text-right bg-slate-950/70 border border-slate-700 focus:border-cyan-500 focus:outline-none rounded px-1 py-0.5 text-slate-200 tabular-nums"
                      />
                    </td>

                    {/* Target Monthly Volume */}
                    <td className="py-2 px-3 text-right">
                      <input
                        type="number"
                        step="1000"
                        min="5000"
                        value={m.targetMonthlyVolume}
                        onChange={(e) =>
                          handleMonthUpdate(m.monthIndex, 'targetMonthlyVolume', parseInt(e.target.value) || 0)
                        }
                        className="w-24 text-right bg-slate-950/70 border border-slate-700 hover:border-slate-500 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-0.5 text-cyan-300 font-bold tabular-nums"
                      />
                    </td>

                    {/* Shift Strategy Selection */}
                    <td className="py-2 px-2">
                      <select
                        value={m.shiftMode}
                        onChange={(e) =>
                          handleMonthUpdate(m.monthIndex, 'shiftMode', e.target.value as any)
                        }
                        className="bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded px-1.5 py-0.5 text-slate-200 text-[11px] font-sans"
                      >
                        <option value="1_SHIFT">1 กะ (8 ชม.)</option>
                        <option value="2_SHIFTS">2 กะ (8+8 ชม.)</option>
                        <option value="2_SHIFTS_OT">2 กะ + OT</option>
                        <option value="3_SHIFTS">3 กะ (8x3 ชม.)</option>
                      </select>
                    </td>

                    {/* OT Hours */}
                    <td className="py-2 px-2 text-right">
                      {m.shiftMode === '2_SHIFTS_OT' ? (
                        <input
                          type="number"
                          step="0.5"
                          min="0"
                          max="4"
                          value={m.otHoursPerDay}
                          onChange={(e) =>
                            handleMonthUpdate(m.monthIndex, 'otHoursPerDay', parseFloat(e.target.value) || 0)
                          }
                          className="w-12 text-right bg-slate-950/70 border border-amber-600 focus:border-amber-400 focus:outline-none rounded px-1 py-0.5 text-amber-300 font-bold tabular-nums"
                        />
                      ) : (
                        <span className="text-slate-600">-</span>
                      )}
                    </td>

                    {/* Required UPH */}
                    <td className="py-2 px-2 text-right text-emerald-400 font-bold tabular-nums">
                      {m.requiredUph}
                    </td>

                    {/* Takt Time */}
                    <td className="py-2 px-2 text-right text-slate-300 tabular-nums">
                      {m.taktTimeSec}s
                    </td>

                    {/* Required DL */}
                    <td className="py-2 px-2 text-right text-cyan-300 tabular-nums font-semibold">
                      {m.totalRequiredDl}
                    </td>

                    {/* Required IDL */}
                    <td className="py-2 px-2 text-right text-purple-300 tabular-nums">
                      {m.totalRequiredIdl}
                    </td>

                    {/* Required Spare */}
                    <td className="py-2 px-2 text-right text-amber-300 tabular-nums">
                      {m.totalRequiredSpare}
                    </td>

                    {/* Grand Total MP */}
                    <td className="py-2.5 px-3 text-right text-white font-bold text-sm tabular-nums">
                      {m.grandTotalMp}
                    </td>

                    {/* MP Delta */}
                    <td className="py-2.5 px-3 text-right tabular-nums">
                      <span
                        className={`font-bold inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          isUnderStaffed
                            ? 'text-rose-400 bg-rose-950/40 border border-rose-900/60'
                            : isOverStaffed
                            ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-900/60'
                            : 'text-slate-400'
                        }`}
                      >
                        {m.mpDeltaFromBase > 0 ? `+${m.mpDeltaFromBase}` : m.mpDeltaFromBase}
                      </span>
                    </td>

                    {/* Capacity Utilization % */}
                    <td className="py-2 px-2 text-right font-semibold tabular-nums text-slate-300">
                      {formatPct(m.capacityUtilizationPct)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selected Month Deep-Dive Analysis Drawer */}
      <div className="p-4 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-bold text-white">
              บทวิเคราะห์เชิงลึกสำหรับเดือน: {selectedMonth.monthName}
            </span>
          </div>
          <div className="text-xs text-slate-400 font-mono">
            ยอดผลิตเป้าหมาย: <span className="text-cyan-300 font-bold">{formatNumber(selectedMonth.targetMonthlyVolume)}</span> ชิ้น (วันทำงาน {selectedMonth.workingDays} วัน)
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Breakdown 1: Takt Time & Speed */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
            <span className="text-slate-400 font-medium block">1. ความเร็วสายการผลิต (Line Speed & Takt Time)</span>
            <div className="text-slate-300">
              • ผลิตเฉลี่ยต่อวัน:{' '}
              <span className="font-mono text-cyan-400 font-bold">
                {formatNumber(selectedMonth.dailyTargetVolume)} ชิ้น/วัน
              </span>
            </div>
            <div className="text-slate-300">
              • Required Takt Time:{' '}
              <span className="font-mono text-amber-400 font-bold">
                {selectedMonth.taktTimeSec} วินาที/ชิ้น
              </span>{' '}
              (จากมาตรฐานเดิม {summary.bottleneckCt}s)
            </div>
            <div className="text-slate-300">
              • Required UPH:{' '}
              <span className="font-mono text-emerald-400 font-bold">
                {selectedMonth.requiredUph} UPH
              </span>
            </div>
          </div>

          {/* Breakdown 2: Manpower Split */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
            <span className="text-slate-400 font-medium block">2. สัดส่วนกำลังคนที่ต้องจัดสรร (Manpower Split)</span>
            <div className="text-slate-300">
              • Direct Labor (DL):{' '}
              <span className="font-mono text-cyan-300 font-bold">
                {selectedMonth.totalRequiredDl} คน
              </span>{' '}
              (A: {selectedMonth.requiredDlShiftA}, B: {selectedMonth.requiredDlShiftB}
              {selectedMonth.requiredDlShiftC ? `, C: ${selectedMonth.requiredDlShiftC}` : ''})
            </div>
            <div className="text-slate-300">
              • Indirect Labor (IDL):{' '}
              <span className="font-mono text-purple-300 font-bold">
                {selectedMonth.totalRequiredIdl} คน
              </span>
            </div>
            <div className="text-slate-300">
              • Spare Buffer ({shiftConfig.spareMpPct}%):{' '}
              <span className="font-mono text-amber-300 font-bold">
                {selectedMonth.totalRequiredSpare} คน
              </span>
            </div>
          </div>

          {/* Breakdown 3: IE Recommendation & Action Plan */}
          <div className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg space-y-1.5">
            <span className="text-slate-400 font-medium block">3. แผนบริหารทรัพยากร (IE Action Plan)</span>
            {selectedMonth.mpDeltaFromBase > 0 ? (
              <div className="text-slate-300 space-y-1">
                <p className="text-rose-300 font-medium">
                  ต้องการคนเพิ่ม +{selectedMonth.mpDeltaFromBase} คน จากมาตรฐานเดิม
                </p>
                <p className="text-slate-400 text-[11px]">
                  {selectedMonth.shiftMode === '2_SHIFTS_OT'
                    ? `* ดำเนินการเพิ่ม OT ${selectedMonth.otHoursPerDay} ชม./กะ สามารถดูดซับยอดผลิตได้โดยลดความจำเป็นในการรับคนถาวร`
                    : '* ยอดผลิตเพิ่มสูง แนะนำประสานฝ่ายสรรหา (HR) ดำเนินการรับพนักงานสัญญาจ้างล่วงหน้า 30 วัน'}
                </p>
              </div>
            ) : selectedMonth.mpDeltaFromBase < 0 ? (
              <div className="text-slate-300 space-y-1">
                <p className="text-emerald-300 font-medium">
                  อัตรากำลังคนเกินเป้าหมาย {Math.abs(selectedMonth.mpDeltaFromBase)} คน
                </p>
                <p className="text-slate-400 text-[11px]">
                  สามารถเกลี่ยกำลังคน (Line Re-balancing) ไปสนับสนุนไลน์ผลิตอื่นหรือจัดสรรเวลาฝึกอบรม (Multi-skill Training)
                </p>
              </div>
            ) : (
              <p className="text-cyan-300">
                กำลังคนตรงตามมาตรฐาน 100% สอดคล้องกับขีดความสามารถการผลิตอย่างแม่นยำ
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
