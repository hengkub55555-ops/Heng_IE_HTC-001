import React, { useState } from 'react';
import {
  LineData,
  LineSummaryMetrics,
  PlantSummaryMetrics,
  LineDepartment,
  LineId,
} from '../types/manpower';
import { formatNumber, formatPct, exportToCsv } from '../utils/ieCalculations';
import { ALL_LINES_METADATA } from '../data/initialData';
import {
  Users,
  Layers,
  ArrowRight,
  TrendingUp,
  Download,
  Printer,
  Sliders,
  CheckCircle2,
  AlertTriangle,
  Factory,
  Sparkles,
  PieChart,
  BarChart3,
  FileSpreadsheet,
  Gauge,
  Briefcase,
  ShieldCheck,
  Wrench,
} from 'lucide-react';

interface ManpowerSummaryViewProps {
  lines: Record<string, LineData>;
  plantSummary: PlantSummaryMetrics;
  onSelectLine: (lineId: string, targetTab?: 'master' | 'forecast' | 'plan_vs_actual' | 'balancing') => void;
}

export const ManpowerSummaryView: React.FC<ManpowerSummaryViewProps> = ({
  lines,
  plantSummary,
  onSelectLine,
}) => {
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<'all' | LineDepartment>('all');
  const [sortBy, setSortBy] = useState<'grandTotal' | 'dl' | 'uph' | 'capacity'>('grandTotal');

  const lineKeys = Object.keys(lines);
  const lineSummariesList = Object.values(plantSummary.lineSummaries || {});

  // Match each summary with metadata
  const enrichedLines = lineSummariesList.map((sum) => {
    const meta = ALL_LINES_METADATA.find((m) => m.id === sum.lineId) || {
      id: sum.lineId,
      name: sum.lineName,
      shortCode: sum.lineName,
      department: (sum.lineId.includes('door') ? 'door' : sum.lineId.includes('injection') || sum.lineId.includes('thermo') ? 'parts' : 'assembly') as LineDepartment,
      departmentName: sum.lineId.includes('door') ? 'สายการผลิตประตู (Door)' : sum.lineId.includes('injection') || sum.lineId.includes('thermo') ? 'ขึ้นรูปและชิ้นส่วนพลาสติก (Parts)' : 'สายการประกอบหลัก (Assembly)',
      color: '#06b6d4',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30',
      badgeText: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50',
      description: lines[sum.lineId]?.modelType || '',
    };
    const lineObj = lines[sum.lineId];
    const mpSharePct = plantSummary.grandPlantTotalMp > 0 ? (sum.grandTotalMp / plantSummary.grandPlantTotalMp) * 100 : 0;
    return {
      summary: sum,
      meta,
      lineObj,
      mpSharePct,
    };
  });

  // Filtered and sorted lines
  const filteredLines = enrichedLines
    .filter((item) => selectedDeptFilter === 'all' || item.meta.department === selectedDeptFilter)
    .sort((a, b) => {
      if (sortBy === 'grandTotal') return b.summary.grandTotalMp - a.summary.grandTotalMp;
      if (sortBy === 'dl') return b.summary.totalDl - a.summary.totalDl;
      if (sortBy === 'uph') return b.summary.targetUph - a.summary.targetUph;
      if (sortBy === 'capacity') return b.summary.monthlyCapacityStandard - a.summary.monthlyCapacityStandard;
      return 0;
    });

  // Export CSV summary
  const handleExportSummaryCsv = () => {
    const headers = [
      'Line ID',
      'Process Line Name',
      'Department',
      'Model Type / Scope',
      'DL Shift A (คน)',
      'DL Shift B (คน)',
      'Total DL (คน)',
      'Total IDL (คน)',
      'Spare MP (คน)',
      'Grand Total MP (คน)',
      'Manpower Share (%)',
      'Target Line UPH',
      'Bottleneck Station',
      'Bottleneck CT (sec)',
      'Line UPPH',
      'Daily Std Cap (Units)',
      'Monthly Std Cap (Units)',
    ];

    const rows = enrichedLines.map((item) => [
      item.summary.lineId,
      item.meta.name,
      item.meta.departmentName,
      item.lineObj?.modelType || '',
      item.summary.totalDlShiftA,
      item.summary.totalDlShiftB,
      item.summary.totalDl,
      item.summary.totalIdl,
      item.summary.totalSpare,
      item.summary.grandTotalMp,
      item.mpSharePct.toFixed(1) + '%',
      item.summary.targetUph,
      item.summary.bottleneckStationName,
      item.summary.bottleneckCt,
      item.summary.lineUpph,
      item.summary.dailyCapacityStandard,
      item.summary.monthlyCapacityStandard,
    ]);

    // Summary Totals Row
    rows.push([
      'TOTAL',
      'รวมทุกสายการผลิตทั้งโรงงาน',
      'Factory Total',
      'All Lines Consolidated',
      plantSummary.totalPlantDlShiftA,
      plantSummary.totalPlantDlShiftB,
      plantSummary.totalPlantDl,
      plantSummary.totalPlantIdl,
      plantSummary.totalPlantSpare,
      plantSummary.grandPlantTotalMp,
      '100.0%',
      '-',
      '-',
      '-',
      plantSummary.plantAverageUpph,
      plantSummary.combinedDailyCapacity,
      plantSummary.combinedMonthlyCapacity,
    ]);

    exportToCsv('IE_Manpower_Summary_All_Process_Lines.csv', headers, rows);
  };

  const deptAssembly = plantSummary.departments?.assembly;
  const deptDoor = plantSummary.departments?.door;
  const deptParts = plantSummary.departments?.parts;

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 rounded-xl p-5 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-96 bg-cyan-500/5 blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold uppercase tracking-wider mb-2">
              <Factory className="w-3.5 h-3.5" />
              <span>Plant-Wide Process Lines & Manpower Summary</span>
            </div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              สรุป Manpower ทุก Process Line (Door A, B, C, Injection, Thermoforming, Line A, B)
            </h2>
            <p className="text-xs text-slate-400 mt-1 max-w-3xl leading-relaxed">
              ภาพรวมกำลังคนมาตรฐาน (Standard Manpower) ของโรงงาน ครอบคลุมสายการประกอบหลัก (Line A, Line B),
              สายการผลิตประตูตู้เย็น (Door A, Door B, Door C), และแผนกขึ้นรูปพลาสติก Inhouse (Injection Inhouse, Thermoforming)
              พร้อมคำนวณสัดส่วน DL, IDL, Spare และกำลังการผลิตมาตรฐาน
            </p>
          </div>

          <div className="flex items-center gap-2 self-start md:self-auto">
            <button
              onClick={handleExportSummaryCsv}
              className="px-3.5 py-2 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export ตารางสรุป (CSV)</span>
            </button>
          </div>
        </div>
      </div>

      {/* Top 4 Overall Factory KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Total Grand Manpower */}
        <div className="bg-slate-900/90 border border-cyan-500/30 rounded-xl p-4 shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>กำลังคนรวมทั้งโรงงาน (Grand Total)</span>
            <Users className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-white font-mono tracking-tight">
              {formatNumber(plantSummary.grandPlantTotalMp)}
            </span>
            <span className="text-xs text-slate-400">คน (7 Process Lines)</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>DL: <strong className="text-white">{formatNumber(plantSummary.totalPlantDl)}</strong></span>
            <span>IDL: <strong className="text-white">{formatNumber(plantSummary.totalPlantIdl)}</strong></span>
            <span>Spare: <strong className="text-white">{formatNumber(plantSummary.totalPlantSpare)}</strong></span>
          </div>
        </div>

        {/* DL Total Shift A + B */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Direct Labor (DL รวม 2 กะ)</span>
            <Briefcase className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-amber-300 font-mono tracking-tight">
              {formatNumber(plantSummary.totalPlantDl)}
            </span>
            <span className="text-xs text-slate-400">คน</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>กะ A: <strong className="text-amber-300">{formatNumber(plantSummary.totalPlantDlShiftA)}</strong> คน</span>
            <span>กะ B: <strong className="text-amber-300">{formatNumber(plantSummary.totalPlantDlShiftB)}</strong> คน</span>
          </div>
        </div>

        {/* Total IDL & Spare */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>Indirect Labor & Spare Buffer</span>
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-emerald-300 font-mono tracking-tight">
              {formatNumber(plantSummary.totalPlantIdl + plantSummary.totalPlantSpare)}
            </span>
            <span className="text-xs text-slate-400">คน</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>IDL: <strong className="text-emerald-300">{formatNumber(plantSummary.totalPlantIdl)}</strong> คน</span>
            <span>Spare 4%: <strong className="text-emerald-300">{formatNumber(plantSummary.totalPlantSpare)}</strong> คน</span>
          </div>
        </div>

        {/* Factory Capacity */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-slate-400 text-xs font-medium">
            <span>กำลังการผลิตรวมรายเดือน (Monthly Cap)</span>
            <Gauge className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-3xl font-extrabold text-purple-300 font-mono tracking-tight">
              {formatNumber(plantSummary.combinedMonthlyCapacity)}
            </span>
            <span className="text-xs text-slate-400">ชิ้น/เดือน</span>
          </div>
          <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-400 flex justify-between">
            <span>เฉลี่ยวันละ: <strong className="text-purple-300">{formatNumber(plantSummary.combinedDailyCapacity)}</strong></span>
            <span>UPPH: <strong className="text-purple-300">{plantSummary.plantAverageUpph}</strong></span>
          </div>
        </div>
      </div>

      {/* Department Summary Cards (3 Columns) */}
      <div>
        <h3 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-cyan-400" />
          <span>สรุปกำลังคนแยกตามกลุ่มแผนก (Department Breakdown)</span>
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* 1. Main Assembly Lines */}
          <div className="bg-slate-900/80 border border-cyan-500/20 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                  Main Assembly
                </span>
                <span className="text-xs font-mono text-slate-400">2 Lines (Line A, B)</span>
              </div>
              <h4 className="text-base font-bold text-white">สายการประกอบหลัก (Assembly)</h4>
              <p className="text-xs text-slate-400 mt-0.5">ประกอบโครงสร้าง ระบบทำความเย็น และบรรจุกล่อง</p>

              <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Manpower</span>
                  <span className="text-lg font-bold text-cyan-300 font-mono">
                    {formatNumber(deptAssembly?.grandTotalMp || 0)} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">DL (Shift A+B)</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {formatNumber(deptAssembly?.totalDl || 0)} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">IDL + Spare</span>
                  <span className="text-sm font-bold text-slate-300 font-mono">
                    {formatNumber((deptAssembly?.totalIdl || 0) + (deptAssembly?.totalSpare || 0))} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Monthly Capacity</span>
                  <span className="text-sm font-bold text-cyan-400 font-mono">
                    {formatNumber(deptAssembly?.combinedMonthlyCapacity || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                สัดส่วน: <strong className="text-cyan-400 font-mono">
                  {plantSummary.grandPlantTotalMp > 0
                    ? (((deptAssembly?.grandTotalMp || 0) / plantSummary.grandPlantTotalMp) * 100).toFixed(1)
                    : 0}%
                </strong>
              </span>
              <button
                onClick={() => onSelectLine('line-b', 'master')}
                className="text-cyan-400 hover:text-cyan-300 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>ดูรายละเอียด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 2. Door Production Lines */}
          <div className="bg-slate-900/80 border border-emerald-500/20 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  Door Lines
                </span>
                <span className="text-xs font-mono text-slate-400">3 Lines (Door A, B, C)</span>
              </div>
              <h4 className="text-base font-bold text-white">สายการผลิตประตู (Door Production)</h4>
              <p className="text-xs text-slate-400 mt-0.5">ขึ้นรูปประตู, ฉีด PU โฟมบานประตู และใส่ยางแม่เหล็ก</p>

              <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Manpower</span>
                  <span className="text-lg font-bold text-emerald-300 font-mono">
                    {formatNumber(deptDoor?.grandTotalMp || 0)} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">DL (Shift A+B)</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {formatNumber(deptDoor?.totalDl || 0)} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">IDL + Spare</span>
                  <span className="text-sm font-bold text-slate-300 font-mono">
                    {formatNumber((deptDoor?.totalIdl || 0) + (deptDoor?.totalSpare || 0))} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Monthly Capacity</span>
                  <span className="text-sm font-bold text-emerald-400 font-mono">
                    {formatNumber(deptDoor?.combinedMonthlyCapacity || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                สัดส่วน: <strong className="text-emerald-400 font-mono">
                  {plantSummary.grandPlantTotalMp > 0
                    ? (((deptDoor?.grandTotalMp || 0) / plantSummary.grandPlantTotalMp) * 100).toFixed(1)
                    : 0}%
                </strong>
              </span>
              <button
                onClick={() => onSelectLine('line-door-a', 'master')}
                className="text-emerald-400 hover:text-emerald-300 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>ดูรายละเอียด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 3. Parts & Molding */}
          <div className="bg-slate-900/80 border border-purple-500/20 rounded-xl p-4 relative overflow-hidden flex flex-col justify-between">
            <div className="absolute top-0 right-0 w-24 h-24 bg-purple-500/5 rounded-bl-full pointer-events-none" />
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">
                  Parts & Molding
                </span>
                <span className="text-xs font-mono text-slate-400">2 Lines (Injection, Thermoforming)</span>
              </div>
              <h4 className="text-base font-bold text-white">ขึ้นรูปและชิ้นส่วนพลาสติก (Inhouse)</h4>
              <p className="text-xs text-slate-400 mt-0.5">ฉีดพลาสติกชิ้นส่วนตู้เย็น และขึ้นรูปสุญญากาศ Inner Box</p>

              <div className="mt-4 grid grid-cols-2 gap-2 bg-slate-950/60 p-3 rounded-lg border border-slate-800/80 text-xs">
                <div>
                  <span className="text-slate-400 block text-[11px]">Total Manpower</span>
                  <span className="text-lg font-bold text-purple-300 font-mono">
                    {formatNumber(deptParts?.grandTotalMp || 0)} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">DL (Shift A+B)</span>
                  <span className="text-lg font-bold text-white font-mono">
                    {formatNumber(deptParts?.totalDl || 0)} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">IDL + Spare</span>
                  <span className="text-sm font-bold text-slate-300 font-mono">
                    {formatNumber((deptParts?.totalIdl || 0) + (deptParts?.totalSpare || 0))} คน
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[11px]">Monthly Capacity</span>
                  <span className="text-sm font-bold text-purple-400 font-mono">
                    {formatNumber(deptParts?.combinedMonthlyCapacity || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-between pt-2 border-t border-slate-800/80 text-xs">
              <span className="text-slate-400">
                สัดส่วน: <strong className="text-purple-400 font-mono">
                  {plantSummary.grandPlantTotalMp > 0
                    ? (((deptParts?.grandTotalMp || 0) / plantSummary.grandPlantTotalMp) * 100).toFixed(1)
                    : 0}%
                </strong>
              </span>
              <button
                onClick={() => onSelectLine('line-injection', 'master')}
                className="text-purple-400 hover:text-purple-300 font-medium inline-flex items-center gap-1 cursor-pointer"
              >
                <span>ดูรายละเอียด</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Manpower Comparison Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-lg">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-900/90">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <FileSpreadsheet className="w-4 h-4 text-cyan-400" />
              <span>ตารางสรุปเปรียบเทียบ Manpower ทุก Process Line (Master Manpower Matrix)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              แสดงรายละเอียดการจัดสรรคน DL กะ A/B, IDL, Spare Buffer และความเร็วสายการผลิต UPH แต่ละไลน์
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Department Filter Pills */}
            <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
              <button
                onClick={() => setSelectedDeptFilter('all')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  selectedDeptFilter === 'all'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                ทุกแผนก ({enrichedLines.length})
              </button>
              <button
                onClick={() => setSelectedDeptFilter('assembly')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  selectedDeptFilter === 'assembly'
                    ? 'bg-cyan-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Assembly (2)
              </button>
              <button
                onClick={() => setSelectedDeptFilter('door')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  selectedDeptFilter === 'door'
                    ? 'bg-emerald-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Door Lines (3)
              </button>
              <button
                onClick={() => setSelectedDeptFilter('parts')}
                className={`px-2.5 py-1 rounded font-medium transition-all ${
                  selectedDeptFilter === 'parts'
                    ? 'bg-purple-500 text-slate-950 font-bold'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Parts/Molding (2)
              </button>
            </div>

            {/* Sort Dropdown */}
            <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950 px-2.5 py-1.5 rounded-lg border border-slate-800">
              <span>เรียงตาม:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="bg-transparent text-white focus:outline-none font-semibold cursor-pointer"
              >
                <option value="grandTotal" className="bg-slate-900">คนรวม (Grand Total)</option>
                <option value="dl" className="bg-slate-900">คน DL (Direct Labor)</option>
                <option value="uph" className="bg-slate-900">ความเร็ว UPH</option>
                <option value="capacity" className="bg-slate-900">กำลังการผลิต (Capacity)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Responsive Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3 px-4">Process Line</th>
                <th className="py-3 px-3">กลุ่มแผนก</th>
                <th className="py-3 px-3 text-right">DL กะ A</th>
                <th className="py-3 px-3 text-right">DL กะ B</th>
                <th className="py-3 px-3 text-right">รวม DL</th>
                <th className="py-3 px-3 text-right">IDL</th>
                <th className="py-3 px-3 text-right">Spare (4%)</th>
                <th className="py-3 px-3 text-right bg-cyan-950/20 font-bold text-cyan-300">คนรวม (Grand)</th>
                <th className="py-3 px-3 text-right">สัดส่วน %</th>
                <th className="py-3 px-3 text-center">Line UPH</th>
                <th className="py-3 px-3">Bottleneck Station</th>
                <th className="py-3 px-3 text-right">Capacity/เดือน</th>
                <th className="py-3 px-4 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {filteredLines.map((item) => {
                const s = item.summary;
                const m = item.meta;
                return (
                  <tr key={s.lineId} className="hover:bg-slate-800/40 transition-colors">
                    {/* Line Name */}
                    <td className="py-3 px-4 font-sans font-medium text-white">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: m.color }}
                        />
                        <div>
                          <span className="font-bold text-slate-100 hover:text-cyan-400 transition-colors block">
                            {m.name}
                          </span>
                          <span className="text-[10px] text-slate-400 font-sans line-clamp-1">
                            {item.lineObj?.modelType || m.description}
                          </span>
                        </div>
                      </div>
                    </td>

                    {/* Department Badge */}
                    <td className="py-3 px-3 font-sans">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold border ${m.badgeBg} ${m.badgeText}`}>
                        {m.shortCode}
                      </span>
                    </td>

                    {/* DL Shift A */}
                    <td className="py-3 px-3 text-right text-slate-300">
                      {formatNumber(s.totalDlShiftA)}
                    </td>

                    {/* DL Shift B */}
                    <td className="py-3 px-3 text-right text-slate-300">
                      {formatNumber(s.totalDlShiftB)}
                    </td>

                    {/* Total DL */}
                    <td className="py-3 px-3 text-right font-bold text-amber-300">
                      {formatNumber(s.totalDl)}
                    </td>

                    {/* Total IDL */}
                    <td className="py-3 px-3 text-right text-emerald-400 font-semibold">
                      {formatNumber(s.totalIdl, 1)}
                    </td>

                    {/* Spare MP */}
                    <td className="py-3 px-3 text-right text-slate-400">
                      {formatNumber(s.totalSpare)}
                    </td>

                    {/* Grand Total */}
                    <td className="py-3 px-3 text-right bg-cyan-950/20 font-bold text-sm text-cyan-300 font-mono">
                      {formatNumber(s.grandTotalMp)}
                    </td>

                    {/* MP Share % */}
                    <td className="py-3 px-3 text-right text-slate-300">
                      <div className="flex items-center justify-end gap-1.5">
                        <span>{item.mpSharePct.toFixed(1)}%</span>
                        <div className="w-12 h-1.5 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                          <div
                            className="h-full rounded-full"
                            style={{ width: `${Math.min(100, item.mpSharePct * 2)}%`, backgroundColor: m.color }}
                          />
                        </div>
                      </div>
                    </td>

                    {/* Line UPH */}
                    <td className="py-3 px-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-800 font-bold text-white text-[11px]">
                        {s.targetUph} UPH
                      </span>
                    </td>

                    {/* Bottleneck */}
                    <td className="py-3 px-3 font-sans text-slate-300 text-[11px]">
                      <div className="line-clamp-1" title={`${s.bottleneckStationName} (${s.bottleneckCt}s)`}>
                        <span className="text-rose-400 font-semibold">{s.bottleneckCt}s</span> · {s.bottleneckStationName}
                      </div>
                    </td>

                    {/* Monthly Capacity */}
                    <td className="py-3 px-3 text-right text-purple-300 font-semibold">
                      {formatNumber(s.monthlyCapacityStandard)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center font-sans">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => onSelectLine(s.lineId, 'master')}
                          title="เปิด Master Sheet เพื่อแก้ไขกำลังคน"
                          className="px-2 py-1 text-[11px] rounded bg-slate-800 hover:bg-cyan-500 hover:text-slate-950 text-slate-300 transition-colors font-medium cursor-pointer"
                        >
                          Master Sheet
                        </button>
                        <button
                          onClick={() => onSelectLine(s.lineId, 'balancing')}
                          title="ดู Line Balancing & กราฟสมดุล"
                          className="px-2 py-1 text-[11px] rounded bg-slate-800/60 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
                        >
                          Balancing
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>

            {/* Table Footer Totals */}
            <tfoot className="bg-slate-950 font-mono font-bold text-white border-t-2 border-slate-700">
              <tr>
                <td className="py-3.5 px-4 font-sans" colSpan={2}>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded bg-cyan-500 text-slate-950 text-[10px] uppercase font-extrabold">
                      GRAND TOTAL
                    </span>
                    <span>รวมทุก Process Line ทั้งโรงงาน ({enrichedLines.length} ไลน์)</span>
                  </div>
                </td>
                <td className="py-3.5 px-3 text-right text-slate-200">
                  {formatNumber(plantSummary.totalPlantDlShiftA)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-200">
                  {formatNumber(plantSummary.totalPlantDlShiftB)}
                </td>
                <td className="py-3.5 px-3 text-right text-amber-300 text-sm">
                  {formatNumber(plantSummary.totalPlantDl)}
                </td>
                <td className="py-3.5 px-3 text-right text-emerald-400 text-sm">
                  {formatNumber(plantSummary.totalPlantIdl, 1)}
                </td>
                <td className="py-3.5 px-3 text-right text-slate-300">
                  {formatNumber(plantSummary.totalPlantSpare)}
                </td>
                <td className="py-3.5 px-3 text-right bg-cyan-950/40 text-base text-cyan-300 font-extrabold">
                  {formatNumber(plantSummary.grandPlantTotalMp)} คน
                </td>
                <td className="py-3.5 px-3 text-right text-cyan-400">100.0%</td>
                <td className="py-3.5 px-3 text-center text-slate-400 text-xs">-</td>
                <td className="py-3.5 px-3 text-slate-400 font-sans text-xs">-</td>
                <td className="py-3.5 px-3 text-right text-purple-300 font-bold">
                  {formatNumber(plantSummary.combinedMonthlyCapacity)}
                </td>
                <td className="py-3.5 px-4 text-center text-slate-500 font-sans text-xs">-</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Visual Manpower Share & Breakdown by Line */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Chart 1: Visual Stacked Bar Comparison */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg">
          <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <span>สัดส่วนกำลังคน DL vs IDL vs Spare แยกตามแต่ละ Process Line</span>
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            เปรียบเทียบโครงสร้างกำลังคนตามหลักวิศวกรรมอุตสาหการ (IE Manpower Structure)
          </p>

          <div className="space-y-3.5">
            {enrichedLines.map((item) => {
              const s = item.summary;
              const m = item.meta;
              const maxMp = Math.max(...enrichedLines.map((l) => l.summary.grandTotalMp), 1);
              const barWidthPct = (s.grandTotalMp / maxMp) * 100;
              const dlPct = (s.totalDl / (s.grandTotalMp || 1)) * 100;
              const idlPct = (s.totalIdl / (s.grandTotalMp || 1)) * 100;
              const sparePct = (s.totalSpare / (s.grandTotalMp || 1)) * 100;

              return (
                <div key={s.lineId} className="group">
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-semibold text-slate-200 flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: m.color }} />
                      <span>{m.name}</span>
                      <span className="text-[10px] text-slate-500 font-normal">({m.shortCode})</span>
                    </span>
                    <span className="font-mono text-cyan-300 font-bold">
                      {formatNumber(s.grandTotalMp)} คน{' '}
                      <span className="text-[10px] text-slate-400 font-normal">
                        ({item.mpSharePct.toFixed(1)}%)
                      </span>
                    </span>
                  </div>

                  {/* Relative Container */}
                  <div className="w-full bg-slate-950 rounded-lg p-1 border border-slate-800/80">
                    <div
                      className="h-5 rounded flex overflow-hidden transition-all duration-500"
                      style={{ width: `${Math.max(15, barWidthPct)}%` }}
                    >
                      <div
                        style={{ width: `${dlPct}%` }}
                        className="bg-amber-500 hover:bg-amber-400 transition-colors flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
                        title={`DL: ${s.totalDl} คน (${dlPct.toFixed(0)}%)`}
                      >
                        {dlPct > 20 && s.totalDl}
                      </div>
                      <div
                        style={{ width: `${idlPct}%` }}
                        className="bg-emerald-500 hover:bg-emerald-400 transition-colors flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
                        title={`IDL: ${s.totalIdl} คน (${idlPct.toFixed(0)}%)`}
                      >
                        {idlPct > 15 && Math.round(s.totalIdl)}
                      </div>
                      <div
                        style={{ width: `${sparePct}%` }}
                        className="bg-cyan-500 hover:bg-cyan-400 transition-colors flex items-center justify-center text-[10px] font-mono text-slate-950 font-bold"
                        title={`Spare: ${s.totalSpare} คน (${sparePct.toFixed(0)}%)`}
                      >
                        {sparePct > 10 && s.totalSpare}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-center gap-4 mt-4 pt-3 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-500" />
              <span className="text-slate-300">DL (Direct Labor)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-emerald-500" />
              <span className="text-slate-300">IDL (Indirect Labor)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-cyan-500" />
              <span className="text-slate-300">Spare Buffer (4%)</span>
            </div>
          </div>
        </div>

        {/* Chart 2: Department Summary and Key Insights */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg flex flex-col justify-between">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2 mb-1">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span>สรุปภาพรวมและข้อเสนอแนะเชิงวิศวกรรมอุตสาหการ (IE Insights)</span>
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              การวิเคราะห์ประสิทธิภาพการจัดสรรคนและกำลังการผลิตทั้งโรงงาน
            </p>

            <div className="space-y-3">
              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0 mt-0.5">
                  1
                </div>
                <div className="text-xs">
                  <strong className="text-white block font-semibold">
                    สัดส่วนกำลังคนหลักอยู่ที่ Main Assembly (Line A & B)
                  </strong>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    สายการประกอบหลักใช้กำลังคนรวม{' '}
                    <strong className="text-cyan-300 font-mono">
                      {formatNumber(deptAssembly?.grandTotalMp || 0)} คน
                    </strong>{' '}
                    คิดเป็นสัดส่วน{' '}
                    <strong className="text-cyan-300 font-mono">
                      {plantSummary.grandPlantTotalMp > 0
                        ? (((deptAssembly?.grandTotalMp || 0) / plantSummary.grandPlantTotalMp) * 100).toFixed(1)
                        : 0}%
                    </strong>{' '}
                    ของทั้งโรงงาน เนื่องจากเป็นสถานีประกอบขั้นสุดท้ายที่มีการทดสอบระบบสุญญากาศและระบบไฟฟ้า
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0 mt-0.5">
                  2
                </div>
                <div className="text-xs">
                  <strong className="text-white block font-semibold">
                    สายการผลิตประตู (Door Lines A, B, C) ใช้กำลังคน 321 คน
                  </strong>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Door Line A (120 UPH, 97 คน) รองรับ Line A, Door Line B (110 UPH, 123 คน) รองรับ Side-by-Side,
                    และ Door Line C (95 UPH, 101 คน) ผลิตประตูรุ่นพรีเมียม Multi-Door โดยมีจุดคอขวดหลักอยู่ที่สถานี PU Foaming Carousel
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 border border-purple-500/30 flex items-center justify-center text-purple-400 shrink-0 mt-0.5">
                  3
                </div>
                <div className="text-xs">
                  <strong className="text-white block font-semibold">
                    ชิ้นส่วน Inhouse (Injection & Thermoforming) ใช้กำลังคน 206 คน
                  </strong>
                  <p className="text-slate-400 mt-0.5 leading-relaxed">
                    Injection Inhouse มีความเร็วสูงสุดที่ 160 Shots/UPH (117 คน) ผลิตถาด ช่องแช่ และช่องใส่ของข้างประตู
                    ขณะที่ Thermoforming (130 UPH, 89 คน) ผลิต Inner Box Liners และแผ่นขึ้นรูปสุญญากาศ
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="text-slate-400">
              ต้องการแก้ไขจำนวนคนหรือเวลา CT ของแต่ละไลน์:
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onSelectLine('line-door-a', 'master')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-medium cursor-pointer"
              >
                แก้ไข Door A
              </button>
              <button
                onClick={() => onSelectLine('line-injection', 'master')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-purple-300 font-medium cursor-pointer"
              >
                แก้ไข Injection
              </button>
              <button
                onClick={() => onSelectLine('line-thermoforming', 'master')}
                className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-rose-300 font-medium cursor-pointer"
              >
                แก้ไข Thermoforming
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
