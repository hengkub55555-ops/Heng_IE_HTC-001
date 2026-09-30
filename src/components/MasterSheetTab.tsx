import React, { useState } from 'react';
import {
  StationData,
  IndirectLaborRole,
  ShiftConfig,
  LineSummaryMetrics,
} from '../types/manpower';
import { calculateStationMetrics, formatNumber, formatPct } from '../utils/ieCalculations';
import {
  Users,
  Clock,
  Gauge,
  Plus,
  Trash2,
  Copy,
  Settings2,
  AlertTriangle,
  Info,
  CheckCircle2,
  Zap,
  RefreshCw,
  Sliders,
} from 'lucide-react';

interface MasterSheetTabProps {
  stations: StationData[];
  setStations: React.Dispatch<React.SetStateAction<StationData[]>>;
  idlRoles: IndirectLaborRole[];
  setIdlRoles: React.Dispatch<React.SetStateAction<IndirectLaborRole[]>>;
  shiftConfig: ShiftConfig;
  setShiftConfig: React.Dispatch<React.SetStateAction<ShiftConfig>>;
  summary: LineSummaryMetrics;
  lineName: string;
  setLineName: (name: string) => void;
}

export const MasterSheetTab: React.FC<MasterSheetTabProps> = ({
  stations,
  setStations,
  idlRoles,
  setIdlRoles,
  shiftConfig,
  setShiftConfig,
  summary,
  lineName,
  setLineName,
}) => {
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [newStationName, setNewStationName] = useState('');
  const [showBatchUphModal, setShowBatchUphModal] = useState(false);
  const [batchUphValue, setBatchUphValue] = useState<number>(summary.targetUph || 110);
  const [autoRecalcCtWithUph, setAutoRecalcCtWithUph] = useState<boolean>(true);

  // Batch apply UPH to all stations in current line
  const handleApplyBatchUph = () => {
    setStations((prev) =>
      prev.map((s) => ({
        ...s,
        uph: batchUphValue,
        cycleTimeSec: autoRecalcCtWithUph
          ? Number((3600 / batchUphValue).toFixed(1))
          : s.cycleTimeSec,
      }))
    );
    setShiftConfig((prev) => ({
      ...prev,
      targetUph: batchUphValue,
    }));
    setShowBatchUphModal(false);
  };

  // Handle station change
  const handleStationChange = (
    id: string,
    field: keyof StationData,
    value: string | number
  ) => {
    setStations((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return {
          ...s,
          [field]: typeof value === 'number' ? value : value,
        };
      })
    );
  };

  // Sync Shift A to Shift B for a station
  const handleSyncToShiftB = (id: string) => {
    setStations((prev) =>
      prev.map((s) => {
        if (s.id !== id) return s;
        return { ...s, mpShiftB: s.mpShiftA };
      })
    );
  };

  // Duplicate all Shift A MP to Shift B
  const handleSyncAllShifts = () => {
    setStations((prev) =>
      prev.map((s) => ({
        ...s,
        mpShiftB: s.mpShiftA,
      }))
    );
  };

  // Delete station
  const handleDeleteStation = (id: string) => {
    if (stations.length <= 1) return;
    setStations((prev) => prev.filter((s) => s.id !== id));
  };

  // Add new station
  const handleAddStation = () => {
    const nextNo = stations.length + 1;
    const newStation: StationData = {
      id: `st-${Date.now()}`,
      no: nextNo,
      name: newStationName.trim() || `Process Station ${nextNo}`,
      category: 'DL',
      mpShiftA: 10,
      mpShiftB: 10,
      cycleTimeSec: 23,
      uph: 110,
      notes: '',
    };
    setStations((prev) => [...prev, newStation]);
    setNewStationName('');
  };

  // Handle IDL role change
  const handleIdlChange = (id: string, field: keyof IndirectLaborRole, value: number | string) => {
    setIdlRoles((prev) =>
      prev.map((r) => {
        if (r.id !== id) return r;
        return {
          ...r,
          [field]: value,
        };
      })
    );
  };

  // Add new IDL role
  const handleAddIdlRole = () => {
    const newRole: IndirectLaborRole = {
      id: `idl-${Date.now()}`,
      title: 'New Support Role',
      category: 'IDL',
      stdMp: 1,
      ratioPerDl: 100,
      isFixed: false,
    };
    setIdlRoles((prev) => [...prev, newRole]);
  };

  // Delete IDL role
  const handleDeleteIdlRole = (id: string) => {
    setIdlRoles((prev) => prev.filter((r) => r.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-3">
            <input
              type="text"
              value={lineName}
              onChange={(e) => setLineName(e.target.value)}
              className="text-xl font-bold text-white bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none transition-colors"
            />
          </div>
          <p className="text-xs text-slate-400 mt-1">
            มาตรฐานกำลังคนสายการผลิตหลัก (Direct Labor + Indirect Labor + Spare Buffer) คำนวณแบบวิศวกรรม IE
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleSyncAllShifts}
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5"
            title="คัดลอกจำนวนคนกะ A ไปยังกะ B ให้เท่ากันทั้งหมด"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Sync Shift-A to Shift-B</span>
          </button>
          <button
            onClick={() => setShowConfigPanel(!showConfigPanel)}
            className={`px-3 py-1.5 text-xs font-medium border rounded-lg transition-colors flex items-center gap-1.5 ${
              showConfigPanel
                ? 'bg-cyan-500/10 border-cyan-500/40 text-cyan-300'
                : 'bg-slate-900 border-slate-800 text-slate-300 hover:text-white'
            }`}
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>Line Shift Config</span>
          </button>
        </div>
      </div>

      {/* Shift & Working Parameters Config Drawer */}
      {showConfigPanel && (
        <div className="p-4 bg-slate-900/90 border border-slate-800 rounded-xl grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-4 animate-in fade-in duration-200">
          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Standard Hours/Shift
            </label>
            <div className="relative">
              <input
                type="number"
                min="4"
                max="12"
                step="0.5"
                value={shiftConfig.plannedOperatingHours}
                onChange={(e) =>
                  setShiftConfig({
                    ...shiftConfig,
                    plannedOperatingHours: parseFloat(e.target.value) || 8,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none tabular-nums"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500">h</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Working Days / Month
            </label>
            <div className="relative">
              <input
                type="number"
                min="15"
                max="31"
                value={shiftConfig.workingDaysPerMonth}
                onChange={(e) =>
                  setShiftConfig({
                    ...shiftConfig,
                    workingDaysPerMonth: parseInt(e.target.value) || 24,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none tabular-nums"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500">วัน</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Planned OEE / Efficiency
            </label>
            <div className="relative">
              <input
                type="number"
                min="50"
                max="100"
                step="0.5"
                value={shiftConfig.plannedOeePct}
                onChange={(e) =>
                  setShiftConfig({
                    ...shiftConfig,
                    plannedOeePct: parseFloat(e.target.value) || 88,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none tabular-nums"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-emerald-400 mb-1">
              Target Line UPH
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="number"
                min="10"
                max="300"
                value={shiftConfig.targetUph || summary.targetUph}
                onChange={(e) =>
                  setShiftConfig({
                    ...shiftConfig,
                    targetUph: parseInt(e.target.value) || 0,
                  })
                }
                className="w-full bg-slate-950 border border-emerald-500/60 rounded-lg px-2.5 py-1.5 text-xs text-emerald-300 font-bold focus:border-emerald-400 focus:outline-none tabular-nums"
              />
              <button
                onClick={() =>
                  setShiftConfig({
                    ...shiftConfig,
                    targetUph: summary.bottleneckCt > 0 ? Math.round(3600 / summary.bottleneckCt) : 110,
                  })
                }
                title="คำนวณ UPH จากคอขวดอัตโนมัติ"
                className="px-2 py-1.5 text-[10px] bg-slate-800 hover:bg-slate-700 text-slate-300 rounded whitespace-nowrap"
              >
                Auto
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Spare / Relief Buffer
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                max="15"
                step="0.5"
                value={shiftConfig.spareMpPct}
                onChange={(e) =>
                  setShiftConfig({
                    ...shiftConfig,
                    spareMpPct: parseFloat(e.target.value) || 4,
                  })
                }
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-cyan-500 focus:outline-none tabular-nums"
              />
              <span className="absolute right-2.5 top-1.5 text-xs text-slate-500">%</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Daily Output Cap (2-Shift)
            </label>
            <div className="text-sm font-bold font-mono text-cyan-400 py-1.5">
              {formatNumber(summary.dailyCapacityStandard)} <span className="text-[11px] font-normal text-slate-400">pcs</span>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-medium text-slate-400 mb-1">
              Monthly Output Cap
            </label>
            <div className="text-sm font-bold font-mono text-cyan-400 py-1.5">
              {formatNumber(summary.monthlyCapacityStandard)} <span className="text-[11px] font-normal text-slate-400">pcs</span>
            </div>
          </div>
        </div>
      )}

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Direct Labor (DL)</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums">
            {formatNumber(summary.totalDl)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            A: {summary.totalDlShiftA} · B: {summary.totalDlShiftB} คน
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Indirect Labor (IDL)</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-xl font-bold font-mono text-purple-300 tabular-nums">
            {formatNumber(summary.totalIdl, 1)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Leader, Sup, QI, Mgr
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Spare / Relief ({shiftConfig.spareMpPct}%)</span>
            <Users className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-xl font-bold font-mono text-amber-300 tabular-nums">
            {summary.totalSpare}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            A: {summary.spareShiftA} · B: {summary.spareShiftB} คน
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-cyan-500/20 rounded-xl bg-gradient-to-br from-cyan-950/20 to-slate-900/80">
          <div className="flex items-center justify-between text-cyan-400 text-xs mb-1">
            <span className="font-semibold">Grand Total MP</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-cyan-200 tabular-nums">
            {formatNumber(summary.grandTotalMp, 1)}
          </div>
          <div className="text-[11px] text-cyan-400/80 mt-0.5">
            DL + IDL + Spare
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-emerald-500/30 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              <span>Target Line UPH</span>
            </span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="flex items-center gap-1.5 my-0.5">
            <input
              type="number"
              min="10"
              max="300"
              value={shiftConfig.targetUph || summary.targetUph}
              onChange={(e) =>
                setShiftConfig({
                  ...shiftConfig,
                  targetUph: parseInt(e.target.value) || 0,
                })
              }
              className="w-20 bg-slate-950 border border-emerald-500/60 hover:border-emerald-400 focus:border-emerald-400 focus:outline-none rounded px-2 py-0.5 text-xl font-bold font-mono text-emerald-300 tabular-nums"
              title="พิมพ์เปลี่ยนค่า Target UPH ได้ทันที"
            />
            <span className="text-xs font-mono text-slate-400">UPH</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1 flex items-center justify-between">
            <span>คอขวด: {summary.bottleneckCt}s</span>
            <button
              onClick={() =>
                setShiftConfig({
                  ...shiftConfig,
                  targetUph: summary.bottleneckCt > 0 ? Math.round(3600 / summary.bottleneckCt) : 110,
                })
              }
              className="text-[10px] text-cyan-400 hover:underline"
              title="ตั้งค่า UPH เท่ากับจุดคอขวด"
            >
              Auto CT
            </button>
          </div>
        </div>

        <div className="p-3 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Line UPPH</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-xl font-bold font-mono text-sky-300 tabular-nums">
            {summary.lineUpph}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            LBE: {formatPct(summary.lineBalanceEfficiencyPct)}
          </div>
        </div>
      </div>

      {/* Main Direct Labor (DL) Process Master Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              1. Direct Labor (DL) - รายละเอียดกำลังคนสายผลิต
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ({stations.length} ขั้นตอน · รวม {summary.totalDl} คน)
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => {
                setBatchUphValue(shiftConfig.targetUph || summary.targetUph || 110);
                setShowBatchUphModal(true);
              }}
              className="px-2.5 py-1 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/80 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
              title="ปรับค่า UPH ให้กับทุกขั้นตอนในไลน์พร้อมกัน (Batch Set UPH)"
            >
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span>ปรับ UPH ทุกขั้นตอน</span>
            </button>
            <input
              type="text"
              placeholder="+ ชื่อขั้นตอนใหม่..."
              value={newStationName}
              onChange={(e) => setNewStationName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAddStation()}
              className="text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none w-44"
            />
            <button
              onClick={handleAddStation}
              className="px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 rounded-lg transition-colors flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มขั้นตอน</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-medium border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center">No.</th>
                <th className="py-2.5 px-3 min-w-[220px]">Detail (Process / Station)</th>
                <th className="py-2.5 px-2 w-14 text-center">Cat.</th>
                <th className="py-2.5 px-2 w-24 text-right">
                  STD MP (A)
                </th>
                <th className="py-2.5 px-2 w-24 text-right">
                  STD MP (B)
                </th>
                <th className="py-2.5 px-2 w-20 text-right">
                  Total MP
                </th>
                <th className="py-2.5 px-2 w-20 text-right">
                  UPH
                </th>
                <th className="py-2.5 px-2 w-20 text-right">
                  CT (s)
                </th>
                <th className="py-2.5 px-2 w-20 text-right">
                  UPPH
                </th>
                <th className="py-2.5 px-3 w-28 text-right">
                  Output/shift
                </th>
                <th className="py-2.5 px-2 w-16 text-center no-print">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {stations.map((st) => {
                const metrics = calculateStationMetrics(
                  st,
                  shiftConfig.plannedOperatingHours,
                  shiftConfig.plannedOeePct
                );
                const isBottleneck = st.cycleTimeSec === summary.bottleneckCt;

                return (
                  <React.Fragment key={st.id}>
                    {/* Shift A Row */}
                    <tr className="hover:bg-slate-800/30 transition-colors group">
                      <td className="py-2 px-3 text-center text-slate-400 font-sans" rowSpan={2}>
                        {st.no}
                      </td>
                      <td className="py-2 px-3 text-slate-200 font-sans font-medium flex items-center justify-between">
                        <span>{st.name} <span className="text-cyan-400/80 text-[11px] font-mono">(Shift-A)</span></span>
                        {isBottleneck && (
                          <span className="text-[10px] text-amber-400 font-sans bg-amber-500/10 border border-amber-500/30 px-1.5 py-0.5 rounded ml-2">
                            Bottleneck
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-2 text-center text-cyan-400 font-semibold font-sans">
                        {st.category}
                      </td>
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={st.mpShiftA}
                          onChange={(e) =>
                            handleStationChange(st.id, 'mpShiftA', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-right bg-slate-950/70 border border-slate-700 hover:border-slate-500 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-0.5 text-white font-bold tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 text-right text-slate-500 font-mono">
                        -
                      </td>
                      <td className="py-2 px-2 text-right text-white font-semibold font-mono" rowSpan={2}>
                        {st.mpShiftA + st.mpShiftB}
                      </td>
                      <td className="py-2 px-2 text-right font-mono" rowSpan={2}>
                        <input
                          type="number"
                          min="1"
                          value={st.uph}
                          onChange={(e) =>
                            handleStationChange(st.id, 'uph', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-right bg-slate-950/70 border border-slate-700 hover:border-slate-500 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-0.5 text-emerald-400 font-bold tabular-nums"
                        />
                      </td>
                      <td className="py-2 px-2 text-right font-mono" rowSpan={2}>
                        <input
                          type="number"
                          min="1"
                          step="0.5"
                          value={st.cycleTimeSec}
                          onChange={(e) =>
                            handleStationChange(st.id, 'cycleTimeSec', parseFloat(e.target.value) || 0)
                          }
                          className={`w-16 text-right bg-slate-950/70 border ${
                            isBottleneck ? 'border-amber-500 text-amber-300' : 'border-slate-700 text-slate-200'
                          } hover:border-slate-500 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-0.5 font-bold tabular-nums`}
                        />
                      </td>
                      <td className="py-2 px-2 text-right text-sky-400 font-mono" rowSpan={2}>
                        {metrics.finalUpph}
                      </td>
                      <td className="py-2 px-3 text-right text-slate-300 font-mono" rowSpan={2}>
                        {metrics.finalOutputShift}
                      </td>
                      <td className="py-2 px-2 text-center no-print" rowSpan={2}>
                        <div className="flex items-center justify-center gap-1 opacity-60 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => handleSyncToShiftB(st.id)}
                            title="คัดลอกคนกะ A ไปกะ B (Copy A to B)"
                            className="p-1 hover:text-cyan-400 rounded"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteStation(st.id)}
                            title="ลบขั้นตอนนี้ (Delete)"
                            className="p-1 hover:text-rose-400 rounded"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Shift B Row */}
                    <tr className="hover:bg-slate-800/30 transition-colors border-b border-slate-800/40">
                      <td className="py-1.5 px-3 text-slate-300 font-sans">
                        <span>{st.name} <span className="text-amber-400/80 text-[11px] font-mono">(Shift-B)</span></span>
                      </td>
                      <td className="py-1.5 px-2 text-center text-cyan-400 font-semibold font-sans">
                        {st.category}
                      </td>
                      <td className="py-1.5 px-2 text-right text-slate-500 font-mono">
                        -
                      </td>
                      <td className="py-1.5 px-2 text-right">
                        <input
                          type="number"
                          min="0"
                          value={st.mpShiftB}
                          onChange={(e) =>
                            handleStationChange(st.id, 'mpShiftB', parseInt(e.target.value) || 0)
                          }
                          className="w-16 text-right bg-slate-950/70 border border-slate-700 hover:border-slate-500 focus:border-cyan-500 focus:outline-none rounded px-1.5 py-0.5 text-white font-bold tabular-nums"
                        />
                      </td>
                    </tr>
                  </React.Fragment>
                );
              })}

              {/* Subtotal DL Row */}
              <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-white">
                <td colSpan={2} className="py-2.5 px-4 text-left font-sans">
                  Total {lineName} (Direct Labor)
                </td>
                <td className="py-2.5 px-2 text-center text-cyan-400 font-sans">DL</td>
                <td className="py-2.5 px-2 text-right text-cyan-300 tabular-nums">
                  {summary.totalDlShiftA}
                </td>
                <td className="py-2.5 px-2 text-right text-amber-300 tabular-nums">
                  {summary.totalDlShiftB}
                </td>
                <td className="py-2.5 px-2 text-right text-cyan-200 text-sm tabular-nums">
                  {summary.totalDl}
                </td>
                <td className="py-2.5 px-2 text-right text-emerald-400 tabular-nums">
                  {summary.targetUph}
                </td>
                <td className="py-2.5 px-2 text-right text-amber-300 tabular-nums">
                  {summary.bottleneckCt}
                </td>
                <td className="py-2.5 px-2 text-right text-sky-300 tabular-nums">
                  {/* Total sum UPPH */}
                  {stations.reduce((sum, s) => {
                    const m = calculateStationMetrics(s, shiftConfig.plannedOperatingHours);
                    return sum + m.finalUpph;
                  }, 0)}
                </td>
                <td className="py-2.5 px-3 text-right text-slate-400 tabular-nums">-</td>
                <td className="no-print"></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Indirect Labor (IDL) Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              2. Indirect Labor (IDL) - กำลังคนทางอ้อม / ซัพพอร์ต
            </span>
            <span className="text-xs text-purple-400 font-mono">
              (รวม {summary.totalIdl} คน)
            </span>
          </div>
          <button
            onClick={handleAddIdlRole}
            className="px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 rounded-lg transition-colors flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>เพิ่มตำแหน่ง IDL</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-medium border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4 min-w-[240px]">Role / Position</th>
                <th className="py-2.5 px-3 w-20 text-center">Category</th>
                <th className="py-2.5 px-3 w-32 text-right">STD MP</th>
                <th className="py-2.5 px-3 w-40 text-left">Scaling Rule</th>
                <th className="py-2.5 px-4">Description / Notes</th>
                <th className="py-2.5 px-3 w-16 text-center no-print">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {idlRoles.map((role) => (
                <tr key={role.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2 px-4 font-medium text-slate-200">
                    <input
                      type="text"
                      value={role.title}
                      onChange={(e) => handleIdlChange(role.id, 'title', e.target.value)}
                      className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none w-full text-white"
                    />
                  </td>
                  <td className="py-2 px-3 text-center text-purple-400 font-semibold font-mono">
                    {role.category}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <input
                      type="number"
                      min="0"
                      step="0.5"
                      value={role.stdMp}
                      onChange={(e) =>
                        handleIdlChange(role.id, 'stdMp', parseFloat(e.target.value) || 0)
                      }
                      className="w-20 text-right bg-slate-950/70 border border-slate-700 hover:border-slate-500 focus:border-purple-500 focus:outline-none rounded px-2 py-0.5 text-purple-300 font-bold font-mono tabular-nums"
                    />
                  </td>
                  <td className="py-2 px-3 text-slate-400 text-[11px]">
                    {role.isFixed ? (
                      <span className="text-slate-500">Fixed Headcount</span>
                    ) : (
                      <span className="text-purple-400/90 font-mono">
                        ~1 per {role.ratioPerDl || 40} DL
                      </span>
                    )}
                  </td>
                  <td className="py-2 px-4 text-slate-400 text-xs">
                    <input
                      type="text"
                      value={role.notes || ''}
                      onChange={(e) => handleIdlChange(role.id, 'notes', e.target.value)}
                      placeholder="หมายเหตุบทบาท..."
                      className="bg-transparent border-b border-transparent hover:border-slate-700 focus:border-cyan-500 focus:outline-none w-full text-slate-300 text-xs"
                    />
                  </td>
                  <td className="py-2 px-3 text-center no-print">
                    <button
                      onClick={() => handleDeleteIdlRole(role.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}

              <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-white">
                <td className="py-2.5 px-4 font-sans">SUM Total IDL</td>
                <td className="py-2.5 px-3 text-center text-purple-400 font-sans">IDL</td>
                <td className="py-2.5 px-3 text-right text-purple-300 font-mono text-sm tabular-nums">
                  {formatNumber(summary.totalIdl, 1)}
                </td>
                <td colSpan={3} className="py-2.5 px-4 text-xs text-slate-400 font-normal">
                  สัดส่วน IDL ต่อ DL รวม = {formatPct((summary.totalIdl / (summary.totalDl || 1)) * 100)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Spare Manpower Buffer Table */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              3. Spare / Relief Manpower - กำลังคนสำรองทดแทนการขาดลา
            </span>
            <span className="text-xs text-amber-400 font-mono">
              (บัฟเฟอร์มาตรฐาน IE {shiftConfig.spareMpPct}% · รวม {summary.totalSpare} คน)
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-4 font-medium text-slate-200 font-sans w-72">
                  Spare - B ( Shift A )
                </td>
                <td className="py-2 px-3 text-center text-cyan-400 font-semibold font-sans w-20">
                  DL
                </td>
                <td className="py-2 px-3 text-right w-32 text-amber-300 font-bold text-sm tabular-nums">
                  {summary.spareShiftA} คน
                </td>
                <td className="py-2 px-4 text-slate-400 text-xs font-sans">
                  คำนวณอัตโนมัติ: {shiftConfig.spareMpPct}% ของกะ A ({summary.totalDlShiftA} คน)
                </td>
              </tr>
              <tr className="hover:bg-slate-800/30">
                <td className="py-2 px-4 font-medium text-slate-200 font-sans">
                  Spare - B ( Shift B )
                </td>
                <td className="py-2 px-3 text-center text-cyan-400 font-semibold font-sans">
                  DL
                </td>
                <td className="py-2 px-3 text-right text-amber-300 font-bold text-sm tabular-nums">
                  {summary.spareShiftB} คน
                </td>
                <td className="py-2 px-4 text-slate-400 text-xs font-sans">
                  คำนวณอัตโนมัติ: {shiftConfig.spareMpPct}% ของกะ B ({summary.totalDlShiftB} คน)
                </td>
              </tr>
              <tr className="bg-slate-900/90 font-bold border-t-2 border-slate-700 text-white">
                <td className="py-2.5 px-4 font-sans text-cyan-300">
                  Grand Total Manpower {lineName} (DL + IDL + Spare)
                </td>
                <td className="py-2.5 px-3 text-center text-white font-sans">
                  TOTAL
                </td>
                <td className="py-2.5 px-3 text-right text-cyan-200 font-mono text-base tabular-nums">
                  {formatNumber(summary.grandTotalMp, 1)}
                </td>
                <td className="py-2.5 px-4 text-xs text-slate-400 font-normal font-sans">
                  กำลังคนทั้งหมดที่ต้องจัดสรรเพื่อผลิตตามมาตรฐาน {summary.targetUph} UPH (2 กะ)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Engineering Insights Card */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-start gap-3">
          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div className="text-xs text-slate-300">
            <span className="font-semibold text-white block mb-0.5">
              การวิเคราะห์ประสิทธิภาพทางวิศวกรรม (IE Insights):
            </span>
            สายการผลิตทำงานที่คอขวด CT = <span className="text-amber-400 font-mono font-semibold">{summary.bottleneckCt} วินาที</span> ที่ขั้นตอน{' '}
            <span className="text-white font-semibold">{summary.bottleneckStationName}</span> กำลังการผลิตมาตรฐาน 110 UPH (2 กะ 8 ชม.) ผลิตได้ประมาณ{' '}
            <span className="text-cyan-400 font-mono font-semibold">{formatNumber(summary.dailyCapacityStandard)} ชิ้น/วัน</span> หรือ{' '}
            <span className="text-cyan-400 font-mono font-semibold">{formatNumber(summary.monthlyCapacityStandard)} ชิ้น/เดือน</span>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5 rounded-lg">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Balance: {formatPct(summary.lineBalanceEfficiencyPct)}</span>
          </div>
        </div>
      </div>
      {/* Batch Set UPH Modal Dialog */}
      {showBatchUphModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  ปรับ UPH ทุกขั้นตอนพร้อมกัน (Batch Set Station UPH)
                </h3>
              </div>
              <button
                onClick={() => setShowBatchUphModal(false)}
                className="text-slate-400 hover:text-white text-xs px-2 py-1"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-300">
              กำหนดค่า UPH เป้าหมายใหม่สำหรับสายการผลิต <span className="text-cyan-300 font-semibold">{lineName}</span> เพื่ออัปเดตทุกขั้นตอน ({stations.length} ขั้นตอน) พร้อมกันในคลิกเดียว
            </p>

            <div className="space-y-3 bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <div>
                <label className="text-xs text-slate-400 block mb-1">
                  ค่าเป้าหมาย UPH ที่ต้องการ:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={batchUphValue}
                    onChange={(e) => setBatchUphValue(parseInt(e.target.value) || 0)}
                    className="w-full bg-slate-900 border-2 border-cyan-500/60 rounded-lg px-3 py-2 text-xl font-bold font-mono text-cyan-300 text-center"
                  />
                  <span className="text-xs font-mono text-slate-400 font-bold">UPH</span>
                </div>
              </div>

              {/* Quick Presets */}
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                <span className="text-[10px] text-slate-400">ค่าแนะนำ:</span>
                {[80, 90, 100, 110, 115, 120, 125, 130].map((preset) => (
                  <button
                    key={preset}
                    onClick={() => setBatchUphValue(preset)}
                    className={`px-2 py-0.5 text-xs font-mono rounded ${
                      batchUphValue === preset
                        ? 'bg-cyan-400 text-slate-950 font-bold'
                        : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {preset}
                  </button>
                ))}
              </div>

              {/* Checkbox for auto-recalculating CT */}
              <label className="flex items-center gap-2 text-xs text-slate-300 pt-2 border-t border-slate-800/80 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoRecalcCtWithUph}
                  onChange={(e) => setAutoRecalcCtWithUph(e.target.checked)}
                  className="rounded border-slate-700 text-cyan-500 focus:ring-cyan-500"
                />
                <span>คำนวณ Cycle Time อัตโนมัติด้วย (CT = 3600 / UPH = {(3600 / (batchUphValue || 1)).toFixed(1)}s)</span>
              </label>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowBatchUphModal(false)}
                className="px-3.5 py-1.5 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleApplyBatchUph}
                className="px-4 py-1.5 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-colors flex items-center gap-1.5 shadow"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>ยืนยันและปรับใช้ UPH ({batchUphValue})</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
