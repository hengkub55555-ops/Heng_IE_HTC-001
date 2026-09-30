import React, { useState } from 'react';
import { PlanVsActualRecord, LineData } from '../types/manpower';
import { formatNumber, formatPct } from '../utils/ieCalculations';
import {
  GitCompare,
  Plus,
  Trash2,
  TrendingUp,
  AlertCircle,
  Clock,
  Users,
  CheckCircle2,
  X,
  FileSpreadsheet,
} from 'lucide-react';

interface PlanVsActualTabProps {
  records: PlanVsActualRecord[];
  setRecords: React.Dispatch<React.SetStateAction<PlanVsActualRecord[]>>;
  activeLineId: string;
  lines: Record<string, LineData>;
}

export const PlanVsActualTab: React.FC<PlanVsActualTabProps> = ({
  records,
  setRecords,
  activeLineId,
  lines,
}) => {
  const [filterLine, setFilterLine] = useState<string>(activeLineId);
  const [filterShift, setFilterShift] = useState<string>('ALL');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const currentLine = lines[activeLineId] || Object.values(lines)[0];

  const defaultUph = currentLine?.shiftConfig?.targetUph || 110;
  const defaultDl = currentLine?.stations?.reduce((s, st) => s + st.mpShiftA, 0) || 40;
  const defaultIdl = currentLine?.idlRoles?.reduce((s, r) => s + r.stdMp, 0) || 5;

  // New Record Form State
  const [formData, setFormData] = useState<Partial<PlanVsActualRecord>>({
    date: new Date().toISOString().split('T')[0],
    shift: 'Shift-A',
    lineId: activeLineId,
    lineName: currentLine?.name || 'Line',
    planVolume: Math.round(defaultUph * 8),
    planDlMp: defaultDl,
    planIdlMp: defaultIdl,
    planOperatingHours: 8,
    planUph: defaultUph,
    actualVolume: Math.round(defaultUph * 8 * 0.96),
    actualDlMp: defaultDl,
    actualIdlMp: defaultIdl,
    actualOperatingHours: 8,
    actualOtHours: 0,
    lineBreakdownMins: 10,
    materialShortageMins: 5,
    changeoverMins: 0,
    absenteeismLossMins: 8,
    speedLossMins: 5,
    otherLossMins: 0,
    notes: '',
  });

  // Filter records
  const filteredRecords = records.filter((r) => {
    if (filterLine !== 'ALL' && r.lineId !== filterLine) return false;
    if (filterShift !== 'ALL' && r.shift !== filterShift) return false;
    return true;
  });

  // Aggregate Metrics
  const totalPlanVolume = filteredRecords.reduce((sum, r) => sum + r.planVolume, 0);
  const totalActualVolume = filteredRecords.reduce((sum, r) => sum + r.actualVolume, 0);
  const outputAchievementRate =
    totalPlanVolume > 0 ? (totalActualVolume / totalPlanVolume) * 100 : 100;

  const totalPlanManHours = filteredRecords.reduce(
    (sum, r) => sum + (r.planDlMp + r.planIdlMp) * r.planOperatingHours,
    0
  );
  const totalActualManHours = filteredRecords.reduce(
    (sum, r) => sum + (r.actualDlMp + r.actualIdlMp) * (r.actualOperatingHours + r.actualOtHours),
    0
  );

  const avgPlanUpph =
    totalPlanManHours > 0 ? Number((totalPlanVolume / totalPlanManHours).toFixed(3)) : 0;
  const avgActualUpph =
    totalActualManHours > 0 ? Number((totalActualVolume / totalActualManHours).toFixed(3)) : 0;
  const upphEfficiencyPct =
    avgPlanUpph > 0 ? Number(((avgActualUpph / avgPlanUpph) * 100).toFixed(1)) : 100;

  // Total Losses across records
  const totalBreakdownMins = filteredRecords.reduce((sum, r) => sum + r.lineBreakdownMins, 0);
  const totalMaterialMins = filteredRecords.reduce((sum, r) => sum + r.materialShortageMins, 0);
  const totalChangeoverMins = filteredRecords.reduce((sum, r) => sum + r.changeoverMins, 0);
  const totalAbsenteeismMins = filteredRecords.reduce((sum, r) => sum + r.absenteeismLossMins, 0);
  const totalSpeedLossMins = filteredRecords.reduce((sum, r) => sum + r.speedLossMins, 0);
  const totalOtherLossMins = filteredRecords.reduce((sum, r) => sum + r.otherLossMins, 0);
  const grandTotalLossMins =
    totalBreakdownMins +
    totalMaterialMins +
    totalChangeoverMins +
    totalAbsenteeismMins +
    totalSpeedLossMins +
    totalOtherLossMins;

  // Add new record
  const handleSaveNewRecord = (e: React.FormEvent) => {
    e.preventDefault();
    const selLineId = (formData.lineId as 'line-a' | 'line-b') || activeLineId;
    const lineObj = lines[selLineId];

    const planVol = Number(formData.planVolume) || 880;
    const actVol = Number(formData.actualVolume) || 0;
    const planDl = Number(formData.planDlMp) || 337;
    const planIdl = Number(formData.planIdlMp) || 19;
    const planHours = Number(formData.planOperatingHours) || 8;
    const actDl = Number(formData.actualDlMp) || 337;
    const actIdl = Number(formData.actualIdlMp) || 19;
    const actHours = Number(formData.actualOperatingHours) || 8;
    const otHours = Number(formData.actualOtHours) || 0;

    const planUph = planHours > 0 ? Math.round(planVol / planHours) : 110;
    const actUph = actHours + otHours > 0 ? Number((actVol / (actHours + otHours)).toFixed(1)) : 0;

    const planTotalMp = planDl + planIdl;
    const actTotalMp = actDl + actIdl;

    const planUpph =
      planTotalMp * planHours > 0
        ? Number((planVol / (planTotalMp * planHours)).toFixed(3))
        : 0;
    const actUpph =
      actTotalMp * (actHours + otHours) > 0
        ? Number((actVol / (actTotalMp * (actHours + otHours))).toFixed(3))
        : 0;

    const newRecord: PlanVsActualRecord = {
      id: `pva-${Date.now()}`,
      date: formData.date || new Date().toISOString().split('T')[0],
      shift: formData.shift || 'Shift-A',
      lineId: selLineId,
      lineName: lineObj?.name || 'Production Line',
      planVolume: planVol,
      planDlMp: planDl,
      planIdlMp: planIdl,
      planOperatingHours: planHours,
      planUph,
      planUpph,
      actualVolume: actVol,
      actualDlMp: actDl,
      actualIdlMp: actIdl,
      actualOperatingHours: actHours,
      actualOtHours: otHours,
      actualUph: actUph,
      actualUpph: actUpph,
      lineBreakdownMins: Number(formData.lineBreakdownMins) || 0,
      materialShortageMins: Number(formData.materialShortageMins) || 0,
      changeoverMins: Number(formData.changeoverMins) || 0,
      absenteeismLossMins: Number(formData.absenteeismLossMins) || 0,
      speedLossMins: Number(formData.speedLossMins) || 0,
      otherLossMins: Number(formData.otherLossMins) || 0,
      notes: formData.notes || '',
    };

    setRecords((prev) => [newRecord, ...prev]);
    setShowAddModal(false);
  };

  const handleDeleteRecord = (id: string) => {
    setRecords((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top Controls & Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <GitCompare className="w-5 h-5 text-cyan-400" />
            <span>ระบบเปรียบเทียบกำลังการผลิตและผลงานจริงกับแผน (Plan vs Actual Tracking)</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            ติดตามยอดผลิตจริง (Actual Output), กำลังคนที่มาทำงานจริง (Actual MP), ประสิทธิภาพ UPPH และการวิเคราะห์สาเหตุการสูญเสีย
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Line Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            <button
              onClick={() => setFilterLine('ALL')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterLine === 'ALL'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              ทุกไลน์
            </button>
            <button
              onClick={() => setFilterLine('line-a')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterLine === 'line-a'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Line A
            </button>
            <button
              onClick={() => setFilterLine('line-b')}
              className={`px-2.5 py-1 rounded font-medium transition-colors ${
                filterLine === 'line-b'
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Line B
            </button>
          </div>

          {/* Shift Filter */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs">
            {['ALL', 'Shift-A', 'Shift-B'].map((s) => (
              <button
                key={s}
                onClick={() => setFilterShift(s)}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  filterShift === s
                    ? 'bg-slate-700 text-white font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {s === 'ALL' ? 'ทุกกะ' : s}
              </button>
            ))}
          </div>

          <button
            onClick={() => {
              setFormData((prev) => ({
                ...prev,
                lineId: activeLineId,
                lineName: currentLine.name,
              }));
              setShowAddModal(true);
            }}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ บันทึกผลผลิตจริงประจำกะ</span>
          </button>
        </div>
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 gap-3">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">ยอดผลิตจริง vs แผน</div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {formatNumber(totalActualVolume)} / {formatNumber(totalPlanVolume)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-1">
            <span>บรรลุเป้าหมาย:</span>
            <span
              className={`font-bold font-mono ${
                outputAchievementRate >= 98
                  ? 'text-emerald-400'
                  : outputAchievementRate >= 90
                  ? 'text-amber-400'
                  : 'text-rose-400'
              }`}
            >
              {formatPct(outputAchievementRate)}
            </span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">ประสิทธิภาพผลิตภาพ (UPPH)</div>
          <div className="text-xl font-bold font-mono text-cyan-300 tabular-nums">
            {avgActualUpph}{' '}
            <span className="text-xs font-normal text-slate-400">vs {avgPlanUpph}</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            UPPH Efficiency: <span className="font-bold text-white font-mono">{formatPct(upphEfficiencyPct)}</span>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">ชั่วโมงทำงานรวม (Man-Hours)</div>
          <div className="text-xl font-bold font-mono text-purple-300 tabular-nums">
            {formatNumber(Math.round(totalActualManHours))} <span className="text-xs font-normal text-slate-400">h</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            แผน: {formatNumber(Math.round(totalPlanManHours))} h (
            {totalActualManHours >= totalPlanManHours ? '+' : ''}
            {formatNumber(Math.round(totalActualManHours - totalPlanManHours))} h)
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">เวลาสูญเสียรวม (Total Loss)</div>
          <div className="text-xl font-bold font-mono text-rose-400 tabular-nums">
            {grandTotalLossMins} <span className="text-xs font-normal text-slate-400">นาที</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            เทียบเท่ายอดผลิตหาย ~{Math.round((grandTotalLossMins / 60) * 110)} ชิ้น
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl col-span-2 sm:col-span-4 lg:col-span-1">
          <div className="text-slate-400 text-xs mb-1">สถานะควบคุมการผลิต (IE Status)</div>
          <div className="flex items-center gap-2 mt-1">
            {outputAchievementRate >= 95 ? (
              <span className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-1 rounded-lg">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>On Standard (ควบคุมได้ดี)</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs text-rose-400 font-semibold bg-rose-500/10 border border-rose-500/20 px-2.5 py-1 rounded-lg">
                <AlertCircle className="w-3.5 h-3.5" />
                <span>Loss Alert (ต้องแก้ปัญหา)</span>
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Visual Charts: Plan vs Actual Volume Comparison & Loss Pareto */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              กราฟเปรียบเทียบยอดผลิต: แผน (Plan) vs ผลิตจริง (Actual)
            </span>
            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1 text-slate-400">
                <span className="w-3 h-3 rounded-sm bg-slate-700 inline-block"></span>
                <span>Plan Target</span>
              </div>
              <div className="flex items-center gap-1 text-cyan-400">
                <span className="w-3 h-3 rounded-sm bg-cyan-500 inline-block"></span>
                <span>Actual Output</span>
              </div>
            </div>
          </div>

          <div className="h-44 w-full">
            {(() => {
              const displayRecords = [...filteredRecords].reverse().slice(-7);
              if (displayRecords.length === 0) {
                return (
                  <div className="h-full flex items-center justify-center text-slate-500 text-xs">
                    ไม่มีข้อมูลบันทึกในเงื่อนไขที่เลือก
                  </div>
                );
              }
              const maxVol = Math.max(...displayRecords.map((r) => Math.max(r.planVolume, r.actualVolume)), 1000);
              const chartHeight = 120;
              const chartWidth = 600;
              const colWidth = chartWidth / displayRecords.length;

              return (
                <svg viewBox={`0 0 ${chartWidth} ${chartHeight + 35}`} className="w-full h-full overflow-visible">
                  {[0.5, 1.0].map((r) => (
                    <line
                      key={r}
                      x1="0"
                      y1={chartHeight - chartHeight * r}
                      x2={chartWidth}
                      y2={chartHeight - chartHeight * r}
                      stroke="#334155"
                      strokeDasharray="2 2"
                      strokeWidth="0.5"
                    />
                  ))}

                  {displayRecords.map((r, i) => {
                    const x = i * colWidth + colWidth * 0.1;
                    const barW = colWidth * 0.35;
                    const planH = (r.planVolume / maxVol) * chartHeight;
                    const actH = (r.actualVolume / maxVol) * chartHeight;
                    const isMet = r.actualVolume >= r.planVolume;

                    return (
                      <g key={r.id}>
                        <rect
                          x={x}
                          y={chartHeight - planH}
                          width={barW}
                          height={planH}
                          rx="2"
                          fill="#475569"
                          opacity="0.7"
                        />
                        <rect
                          x={x + barW + 2}
                          y={chartHeight - actH}
                          width={barW}
                          height={actH}
                          rx="2"
                          fill={isMet ? '#06b6d4' : '#f43f5e'}
                        />

                        <text
                          x={x + barW}
                          y={chartHeight + 15}
                          textAnchor="middle"
                          fontSize="9"
                          fill="#94a3b8"
                          fontFamily="sans-serif"
                        >
                          {r.date.split('-').slice(1).join('/')}
                        </text>
                        <text
                          x={x + barW}
                          y={chartHeight + 26}
                          textAnchor="middle"
                          fontSize="8"
                          fill={r.lineId === 'line-a' ? '#38bdf8' : '#fbbf24'}
                          fontFamily="sans-serif"
                        >
                          {r.lineId === 'line-a' ? 'A' : 'B'} · {r.shift.replace('Shift-', '')}
                        </text>

                        <text
                          x={x + barW + 2 + barW / 2}
                          y={chartHeight - actH - 4}
                          textAnchor="middle"
                          fontSize="8"
                          fill={isMet ? '#67e8f9' : '#fda4af'}
                          fontFamily="monospace"
                        >
                          {r.actualVolume}
                        </text>
                      </g>
                    );
                  })}
                </svg>
              );
            })()}
          </div>
        </div>

        {/* Right: Loss Breakdown (Pareto Analysis) */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">
              การแจกแจงเวลาสูญเสีย (Loss Breakdown)
            </span>
            <span className="text-xs text-rose-400 font-mono font-bold">
              {grandTotalLossMins} นาที
            </span>
          </div>

          <div className="space-y-2 text-xs">
            {[
              { label: 'ขาดแคลนชิ้นส่วน/พาร์ท (Material Shortage)', mins: totalMaterialMins, color: 'bg-rose-500' },
              { label: 'พนักงานขาดงาน (Absenteeism Loss)', mins: totalAbsenteeismMins, color: 'bg-amber-500' },
              { label: 'เครื่องจักรเสีย (Breakdown/Stop)', mins: totalBreakdownMins, color: 'bg-orange-500' },
              { label: 'สูญเสียความเร็ว (Speed Loss)', mins: totalSpeedLossMins, color: 'bg-yellow-500' },
              { label: 'เปลี่ยนรุ่น (Changeover/Setup)', mins: totalChangeoverMins, color: 'bg-purple-500' },
              { label: 'อื่นๆ (Other Losses)', mins: totalOtherLossMins, color: 'bg-slate-500' },
            ].map((item, idx) => {
              const pct = grandTotalLossMins > 0 ? (item.mins / grandTotalLossMins) * 100 : 0;
              return (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between text-[11px] text-slate-300">
                    <span className="truncate max-w-[190px]">{item.label}</span>
                    <span className="font-mono text-slate-400">
                      {item.mins} นาที ({formatPct(pct, 0)})
                    </span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${item.color}`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Production Log History Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-semibold text-white">
            ประวัติการผลิตจริงและเปรียบเทียบกับแผน ({filteredRecords.length} รายการ)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-medium border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 min-w-[95px]">Date</th>
                <th className="py-2.5 px-2 w-24">Line</th>
                <th className="py-2.5 px-2 w-20">Shift</th>
                <th className="py-2.5 px-3 w-24 text-right">Plan Vol</th>
                <th className="py-2.5 px-3 w-24 text-right">Actual Vol</th>
                <th className="py-2.5 px-2 w-20 text-right">Achieve %</th>
                <th className="py-2.5 px-2 w-20 text-right">Plan MP</th>
                <th className="py-2.5 px-2 w-20 text-right">Actual MP</th>
                <th className="py-2.5 px-2 w-20 text-right">MP Diff</th>
                <th className="py-2.5 px-2 w-20 text-right">Plan UPPH</th>
                <th className="py-2.5 px-2 w-20 text-right">Act. UPPH</th>
                <th className="py-2.5 px-2 w-20 text-right">Loss (m)</th>
                <th className="py-2.5 px-3 min-w-[180px]">Operational Notes</th>
                <th className="py-2.5 px-2 w-12 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredRecords.map((r) => {
                const totalPlanMp = r.planDlMp + r.planIdlMp;
                const totalActMp = r.actualDlMp + r.actualIdlMp;
                const mpDiff = totalActMp - totalPlanMp;
                const achievePct = r.planVolume > 0 ? (r.actualVolume / r.planVolume) * 100 : 100;
                const totalLoss =
                  r.lineBreakdownMins +
                  r.materialShortageMins +
                  r.changeoverMins +
                  r.absenteeismLossMins +
                  r.speedLossMins +
                  r.otherLossMins;

                return (
                  <tr key={r.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 font-sans text-slate-300 font-medium">
                      {r.date}
                    </td>
                    <td className="py-2 px-2 font-sans font-medium">
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded text-[11px] ${
                          r.lineId === 'line-a'
                            ? 'text-cyan-300 bg-cyan-950/60 border border-cyan-800/60'
                            : 'text-amber-300 bg-amber-950/60 border border-amber-800/60'
                        }`}
                      >
                        {r.lineId === 'line-a' ? 'Line A' : 'Line B'}
                      </span>
                    </td>
                    <td className="py-2 px-2 font-sans">
                      <span className="text-white font-medium">{r.shift}</span>
                      {r.actualOtHours > 0 && (
                        <span className="text-[10px] text-amber-400 block font-mono">
                          +{r.actualOtHours}h OT
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right text-slate-400 tabular-nums">
                      {formatNumber(r.planVolume)}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-white tabular-nums">
                      {formatNumber(r.actualVolume)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      <span
                        className={`font-bold ${
                          achievePct >= 98
                            ? 'text-emerald-400'
                            : achievePct >= 90
                            ? 'text-amber-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {formatPct(achievePct)}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400 tabular-nums">
                      {formatNumber(totalPlanMp, 0)}
                    </td>
                    <td className="py-2 px-2 text-right text-slate-200 tabular-nums font-semibold">
                      {formatNumber(totalActMp, 0)}
                    </td>
                    <td className="py-2 px-2 text-right tabular-nums">
                      <span
                        className={`${
                          mpDiff < 0
                            ? 'text-rose-400'
                            : mpDiff > 0
                            ? 'text-emerald-400'
                            : 'text-slate-400'
                        }`}
                      >
                        {mpDiff > 0 ? `+${mpDiff}` : mpDiff}
                      </span>
                    </td>
                    <td className="py-2 px-2 text-right text-slate-400 tabular-nums">
                      {r.planUpph}
                    </td>
                    <td className="py-2 px-2 text-right text-cyan-300 font-bold tabular-nums">
                      {r.actualUpph}
                    </td>
                    <td className="py-2 px-2 text-right text-rose-400 font-semibold tabular-nums">
                      {totalLoss > 0 ? `${totalLoss}m` : '-'}
                    </td>
                    <td className="py-2 px-3 text-slate-300 font-sans text-xs">
                      {r.notes || '-'}
                    </td>
                    <td className="py-2 px-2 text-center no-print">
                      <button
                        onClick={() => handleDeleteRecord(r.id)}
                        className="p-1 text-slate-500 hover:text-rose-400 rounded cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Shift Production Record Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  บันทึกผลการผลิตจริงและกำลังคนประจำกะ (Log Production Run)
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveNewRecord} className="space-y-4 text-xs">
              {/* Row 1: Line, Date & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">สายการผลิต (Line)</label>
                  <select
                    value={formData.lineId}
                    onChange={(e) => {
                      const lid = e.target.value as 'line-a' | 'line-b';
                      const sel = lines[lid];
                      setFormData({
                        ...formData,
                        lineId: lid,
                        lineName: sel.name,
                        planVolume: lid === 'line-a' ? 800 : 880,
                        planDlMp: lid === 'line-a' ? 305 : 337,
                        planIdlMp: lid === 'line-a' ? 17.25 : 19.25,
                      });
                    }}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white font-medium focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="line-a">Line A ({lines['line-a'].name})</option>
                    <option value="line-b">Line B ({lines['line-b'].name})</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">วันที่ (Date)</label>
                  <input
                    type="date"
                    required
                    value={formData.date}
                    onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">กะการทำงาน (Shift)</label>
                  <select
                    value={formData.shift}
                    onChange={(e) => setFormData({ ...formData, shift: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-white focus:border-cyan-500 focus:outline-none"
                  >
                    <option value="Shift-A">Shift-A (กะเช้า)</option>
                    <option value="Shift-B">Shift-B (กะดึก/บ่าย)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">ชั่วโมงทำงานจริง + OT</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="number"
                      step="0.5"
                      value={formData.actualOperatingHours}
                      onChange={(e) =>
                        setFormData({ ...formData, actualOperatingHours: parseFloat(e.target.value) || 8 })
                      }
                      placeholder="Std (8h)"
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-white focus:border-cyan-500 focus:outline-none font-mono"
                    />
                    <input
                      type="number"
                      step="0.5"
                      value={formData.actualOtHours}
                      onChange={(e) =>
                        setFormData({ ...formData, actualOtHours: parseFloat(e.target.value) || 0 })
                      }
                      placeholder="OT (h)"
                      className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1.5 text-amber-300 focus:border-amber-400 focus:outline-none font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Row 2: Volumes */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-950/60 rounded-xl border border-slate-800">
                <div>
                  <label className="block text-slate-400 mb-1">ยอดตามแผน (Plan Volume)</label>
                  <input
                    type="number"
                    required
                    value={formData.planVolume}
                    onChange={(e) =>
                      setFormData({ ...formData, planVolume: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-cyan-400 mb-1 font-semibold">ยอดผลิตจริง (Actual Vol)</label>
                  <input
                    type="number"
                    required
                    value={formData.actualVolume}
                    onChange={(e) =>
                      setFormData({ ...formData, actualVolume: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-cyan-500/50 rounded-lg px-2.5 py-1.5 text-cyan-300 font-mono font-bold focus:border-cyan-400"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">คนตามแผน DL (Plan MP)</label>
                  <input
                    type="number"
                    value={formData.planDlMp}
                    onChange={(e) =>
                      setFormData({ ...formData, planDlMp: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-white font-mono"
                  />
                </div>
                <div>
                  <label className="block text-purple-400 mb-1 font-semibold">คนทำงานจริง DL (Actual)</label>
                  <input
                    type="number"
                    value={formData.actualDlMp}
                    onChange={(e) =>
                      setFormData({ ...formData, actualDlMp: parseInt(e.target.value) || 0 })
                    }
                    className="w-full bg-slate-900 border border-purple-500/50 rounded-lg px-2.5 py-1.5 text-purple-300 font-mono font-bold"
                  />
                </div>
              </div>

              {/* Row 3: Losses breakdown in minutes */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <span className="font-semibold text-rose-300 block">
                  บันทึกการสูญเสียเวลาในสายการผลิต (Production Losses in Minutes):
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-1">เครื่องจักรเสีย (Breakdown)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.lineBreakdownMins}
                      onChange={(e) =>
                        setFormData({ ...formData, lineBreakdownMins: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">ของขาด (Material Shortage)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.materialShortageMins}
                      onChange={(e) =>
                        setFormData({ ...formData, materialShortageMins: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">คนขาดงาน (Absenteeism)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.absenteeismLossMins}
                      onChange={(e) =>
                        setFormData({ ...formData, absenteeismLossMins: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">เปลี่ยนรุ่น (Changeover)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.changeoverMins}
                      onChange={(e) =>
                        setFormData({ ...formData, changeoverMins: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">สูญเสียความเร็ว (Speed Loss)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.speedLossMins}
                      onChange={(e) =>
                        setFormData({ ...formData, speedLossMins: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-1">อื่นๆ (Other Losses)</label>
                    <input
                      type="number"
                      min="0"
                      value={formData.otherLossMins}
                      onChange={(e) =>
                        setFormData({ ...formData, otherLossMins: parseInt(e.target.value) || 0 })
                      }
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-white font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Row 4: Operational notes */}
              <div>
                <label className="block text-slate-400 mb-1">หมายเหตุการปฏิบัติงาน (Operational Notes)</label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="เช่น สาเหตุเครื่องจักรขัดข้อง, ปัญหาชิ้นส่วน, แผนการชดเชย..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:border-cyan-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-lg cursor-pointer"
                >
                  ยกเลิก
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  บันทึกข้อมูลกะการผลิต
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
