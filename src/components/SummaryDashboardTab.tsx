import React, { useState } from 'react';
import {
  LineData,
  LineSummaryMetrics,
  PlantSummaryMetrics,
  PlanVsActualRecord,
  StationData,
  IndirectLaborRole,
} from '../types/manpower';
import { formatNumber, formatPct } from '../utils/ieCalculations';
import { ALL_LINES_METADATA } from '../data/initialData';
import { MonthlyLineManpowerChart } from './MonthlyLineManpowerChart';
import {
  LayoutDashboard,
  Users,
  Clock,
  Gauge,
  CheckCircle2,
  Save,
  ArrowRight,
  TrendingUp,
  GitCompare,
  Sliders,
  Layers,
  Sparkles,
  AlertCircle,
  FileSpreadsheet,
  Edit3,
  Plus,
  Trash2,
  Zap,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Factory,
} from 'lucide-react';

interface SummaryDashboardTabProps {
  lines: Record<string, LineData>;
  setLines: React.Dispatch<React.SetStateAction<Record<string, LineData>>>;
  plantSummary: PlantSummaryMetrics;
  planVsActualRecords: PlanVsActualRecord[];
  setPlanVsActualRecords: React.Dispatch<React.SetStateAction<PlanVsActualRecord[]>>;
  onSelectLine: (lineId: string, targetTab?: any) => void;
  onSaveAll: () => void;
}

export const SummaryDashboardTab: React.FC<SummaryDashboardTabProps> = ({
  lines,
  setLines,
  plantSummary,
  planVsActualRecords,
  setPlanVsActualRecords,
  onSelectLine,
  onSaveAll,
}) => {
  const [saveToast, setSaveToast] = useState(false);
  const [showDetailedMatrix, setShowDetailedMatrix] = useState(true);
  const [showLossEditorLineA, setShowLossEditorLineA] = useState(false);
  const [showLossEditorLineB, setShowLossEditorLineB] = useState(false);
  const [selectedUphLine, setSelectedUphLine] = useState<string>('line-b');
  const [newStationName, setNewStationName] = useState('');
  const [batchUphModal, setBatchUphModal] = useState<{ open: boolean; lineId: string; uph: number }>({
    open: false,
    lineId: 'line-b',
    uph: 110,
  });

  // Quick edit shift configuration for Line A and Line B
  const handleConfigChange = (
    lineId: string,
    field: string,
    value: number
  ) => {
    setLines((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        shiftConfig: {
          ...prev[lineId].shiftConfig,
          [field]: value,
        },
      },
    }));
  };

  const handleLineNameChange = (
    lineId: string,
    newName: string
  ) => {
    setLines((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        name: newName,
      },
    }));
  };

  const handleModelTypeChange = (
    lineId: string,
    newType: string
  ) => {
    setLines((prev) => ({
      ...prev,
      [lineId]: {
        ...prev[lineId],
        modelType: newType,
      },
    }));
  };

  // Station field change directly in dashboard table
  const handleStationFieldChange = (
    lineId: string,
    stationIndex: number,
    field: keyof StationData,
    value: string | number
  ) => {
    setLines((prev) => {
      const updatedStations = [...prev[lineId].stations];
      if (updatedStations[stationIndex]) {
        updatedStations[stationIndex] = {
          ...updatedStations[stationIndex],
          [field]: value,
        };
      }
      return {
        ...prev,
        [lineId]: {
          ...prev[lineId],
          stations: updatedStations,
        },
      };
    });
  };

  // Direct edit station name for both lines (keep aligned)
  const handleStationNameChange = (stationIndex: number, newName: string) => {
    setLines((prev) => {
      const updatedA = [...prev['line-a'].stations];
      const updatedB = [...prev['line-b'].stations];
      if (updatedA[stationIndex]) updatedA[stationIndex] = { ...updatedA[stationIndex], name: newName };
      if (updatedB[stationIndex]) updatedB[stationIndex] = { ...updatedB[stationIndex], name: newName };
      return {
        ...prev,
        'line-a': { ...prev['line-a'], stations: updatedA },
        'line-b': { ...prev['line-b'], stations: updatedB },
      };
    });
  };

  // Add new process station directly from Dashboard
  const handleAddStationToBoth = () => {
    const nextNo = lines['line-b'].stations.length + 1;
    const name = newStationName.trim() || `Station ${nextNo}`;
    const newStA: StationData = {
      id: `st-a-${Date.now()}`,
      no: nextNo,
      name,
      category: 'DL',
      mpShiftA: 10,
      mpShiftB: 10,
      cycleTimeSec: 25,
      uph: lines['line-a'].shiftConfig.targetUph || 100,
    };
    const newStB: StationData = {
      id: `st-b-${Date.now()}`,
      no: nextNo,
      name,
      category: 'DL',
      mpShiftA: 12,
      mpShiftB: 12,
      cycleTimeSec: 23,
      uph: lines['line-b'].shiftConfig.targetUph || 110,
    };

    setLines((prev) => ({
      ...prev,
      'line-a': { ...prev['line-a'], stations: [...prev['line-a'].stations, newStA] },
      'line-b': { ...prev['line-b'], stations: [...prev['line-b'].stations, newStB] },
    }));
    setNewStationName('');
  };

  // Delete station from both lines
  const handleDeleteStation = (stationIndex: number) => {
    if (lines['line-b'].stations.length <= 1) return;
    setLines((prev) => {
      const updatedA = prev['line-a'].stations.filter((_, idx) => idx !== stationIndex);
      const updatedB = prev['line-b'].stations.filter((_, idx) => idx !== stationIndex);
      return {
        ...prev,
        'line-a': { ...prev['line-a'], stations: updatedA.map((s, i) => ({ ...s, no: i + 1 })) },
        'line-b': { ...prev['line-b'], stations: updatedB.map((s, i) => ({ ...s, no: i + 1 })) },
      };
    });
  };

  // Apply batch UPH to all stations in a line
  const handleApplyBatchUph = (lineId: string, newUph: number) => {
    setLines((prev) => {
      const target = prev[lineId];
      if (!target) return prev;
      const updatedStations = target.stations.map((s) => ({
        ...s,
        uph: newUph,
      }));
      return {
        ...prev,
        [lineId]: {
          ...target,
          shiftConfig: {
            ...target.shiftConfig,
            targetUph: newUph,
          },
          stations: updatedStations,
        },
      };
    });
    setBatchUphModal({ open: false, lineId, uph: newUph });
  };

  // IDL role headcount change directly in dashboard
  const handleIdlRoleChange = (
    lineId: 'line-a' | 'line-b',
    roleIndex: number,
    field: keyof IndirectLaborRole,
    value: string | number
  ) => {
    setLines((prev) => {
      const updatedIdl = [...prev[lineId].idlRoles];
      if (updatedIdl[roleIndex]) {
        updatedIdl[roleIndex] = {
          ...updatedIdl[roleIndex],
          [field]: value,
        };
      }
      return {
        ...prev,
        [lineId]: {
          ...prev[lineId],
          idlRoles: updatedIdl,
        },
      };
    });
  };

  // Add IDL role to both lines
  const handleAddIdlRole = () => {
    const roleId = `idl-${Date.now()}`;
    const newRoleA: IndirectLaborRole = {
      id: `${roleId}-a`,
      title: 'New Support Position',
      category: 'IDL',
      stdMp: 1,
      isFixed: false,
      notes: 'ฝ่ายสนับสนุนเพิ่มเติม',
    };
    const newRoleB: IndirectLaborRole = {
      id: `${roleId}-b`,
      title: 'New Support Position',
      category: 'IDL',
      stdMp: 1,
      isFixed: false,
      notes: 'ฝ่ายสนับสนุนเพิ่มเติม',
    };

    setLines((prev) => ({
      ...prev,
      'line-a': { ...prev['line-a'], idlRoles: [...prev['line-a'].idlRoles, newRoleA] },
      'line-b': { ...prev['line-b'], idlRoles: [...prev['line-b'].idlRoles, newRoleB] },
    }));
  };

  // Delete IDL role
  const handleDeleteIdlRole = (roleIndex: number) => {
    if (lines['line-b'].idlRoles.length <= 1) return;
    setLines((prev) => ({
      ...prev,
      'line-a': { ...prev['line-a'], idlRoles: prev['line-a'].idlRoles.filter((_, i) => i !== roleIndex) },
      'line-b': { ...prev['line-b'], idlRoles: prev['line-b'].idlRoles.filter((_, i) => i !== roleIndex) },
    }));
  };

  // Direct editing of Plan vs Actual records on dashboard
  const handlePlanActualFieldChange = (
    lineId: 'line-a' | 'line-b',
    field: keyof PlanVsActualRecord,
    value: number | string
  ) => {
    setPlanVsActualRecords((prev) => {
      const targetRecordIndex = prev.findIndex((r) => r.lineId === lineId);
      if (targetRecordIndex >= 0) {
        const updated = [...prev];
        const record = { ...updated[targetRecordIndex], [field]: value };
        // Recalculate achievement & UPPH
        const hours = (record.actualOperatingHours || 8) + (record.actualOtHours || 0);
        const mp = (record.actualDlMp || 330) + (record.actualIdlMp || 19);
        if (hours * mp > 0) {
          record.actualUpph = Number((record.actualVolume / (hours * mp)).toFixed(3));
        }
        updated[targetRecordIndex] = record;
        return updated;
      } else {
        // Create new record for line
        const newRecord: PlanVsActualRecord = {
          id: `pva-${lineId}-${Date.now()}`,
          date: new Date().toISOString().split('T')[0],
          shift: 'Shift-A',
          lineId,
          lineName: lines[lineId].name,
          planVolume: lineId === 'line-a' ? 800 : 880,
          actualVolume: lineId === 'line-a' ? 800 : 880,
          planDlMp: lineId === 'line-a' ? 305 : 337,
          actualDlMp: lineId === 'line-a' ? 305 : 337,
          planIdlMp: lineId === 'line-a' ? 17.25 : 19.25,
          actualIdlMp: lineId === 'line-a' ? 17.25 : 19.25,
          planOperatingHours: 8,
          actualOperatingHours: 8,
          actualOtHours: 0,
          planUph: lineId === 'line-a' ? 100 : 110,
          actualUph: lineId === 'line-a' ? 100 : 110,
          planUpph: 0.32,
          actualUpph: 0.32,
          lineBreakdownMins: 0,
          materialShortageMins: 0,
          changeoverMins: 0,
          absenteeismLossMins: 0,
          speedLossMins: 0,
          otherLossMins: 0,
          [field]: value,
        };
        return [newRecord, ...prev];
      }
    });
  };

  const handleSaveClick = () => {
    onSaveAll();
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 3000);
  };

  const lineASummary = plantSummary.lineASummary;
  const lineBSummary = plantSummary.lineBSummary;

  // Plan vs Actual aggregate for Line A and Line B
  const lineARecords = planVsActualRecords.filter((r) => r.lineId === 'line-a');
  const lineBRecords = planVsActualRecords.filter((r) => r.lineId === 'line-b');

  const lineALatest = lineARecords[0] || {
    planVolume: 800,
    actualVolume: 812,
    planUph: lines['line-a'].shiftConfig.targetUph || 100,
    actualUph: 101,
    actualOperatingHours: 8,
    actualOtHours: 0,
    actualUpph: 0.31,
    lineBreakdownMins: 15,
    materialShortageMins: 0,
    changeoverMins: 10,
    absenteeismLossMins: 5,
    speedLossMins: 8,
    otherLossMins: 0,
  };

  const lineBLatest = lineBRecords[0] || {
    planVolume: 880,
    actualVolume: 865,
    planUph: lines['line-b'].shiftConfig.targetUph || 110,
    actualUph: 108,
    actualOperatingHours: 8,
    actualOtHours: 0,
    actualUpph: 0.32,
    lineBreakdownMins: 20,
    materialShortageMins: 12,
    changeoverMins: 15,
    absenteeismLossMins: 8,
    speedLossMins: 10,
    otherLossMins: 0,
  };

  const lineAActualVol = lineALatest.actualVolume;
  const lineAPlanVol = lineALatest.planVolume;
  const lineAAchieve = lineAPlanVol > 0 ? (lineAActualVol / lineAPlanVol) * 100 : 100;

  const lineBActualVol = lineBLatest.actualVolume;
  const lineBPlanVol = lineBLatest.planVolume;
  const lineBAchieve = lineBPlanVol > 0 ? (lineBActualVol / lineBPlanVol) * 100 : 100;

  const totalFactoryActual = lineAActualVol + lineBActualVol;
  const totalFactoryPlan = lineAPlanVol + lineBPlanVol;
  const totalFactoryAchieve = totalFactoryPlan > 0 ? (totalFactoryActual / totalFactoryPlan) * 100 : 100;

  // Selected Line for UPH Controller
  const activeUphLineConfig = lines[selectedUphLine].shiftConfig;
  const activeUphCurrent = activeUphLineConfig.targetUph || (selectedUphLine === 'line-a' ? 100 : 110);
  const activeUphSummary = selectedUphLine === 'line-a' ? lineASummary : lineBSummary;
  const activeTaktTime = activeUphCurrent > 0 ? Number((3600 / activeUphCurrent).toFixed(1)) : 32.7;

  return (
    <div className="space-y-6">
      {/* Top Banner with Save Feedback */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">
              Executive Dashboard: สรุปภาพรวมและแก้ไขตัวเลขโรงงาน (Fully Editable Plant Dashboard)
            </h2>
          </div>
          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1.5 flex-wrap">
            <span className="inline-flex items-center gap-1 text-cyan-300 font-medium bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-500/30">
              <Zap className="w-3 h-3 text-amber-400" /> แก้ไขตัวเลขได้ทั้งหมดในหน้านี้
            </span>
            <span>: ปรับความเร็ว UPH, จำนวนคนกะ A/B, เวลาทำงาน, OEE %, IDL, และยอดผลผลิตจริง</span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          {saveToast && (
            <div className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-950/70 border border-emerald-500/40 px-3 py-1.5 rounded-lg animate-in fade-in">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>บันทึกข้อมูลเรียบร้อยแล้ว</span>
            </div>
          )}
          <button
            onClick={handleSaveClick}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 rounded-lg transition-all shadow-md flex items-center gap-1.5 cursor-pointer hover:shadow-emerald-500/20"
          >
            <Save className="w-4 h-4" />
            <span>บันทึกการแก้ไขทั้งหมด (Save Changes)</span>
          </button>
        </div>
      </div>

      {/* Factory Grand Total KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {/* Card 1: Total Factory DL */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl relative group">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Direct Labor (DL รวม)</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-white tabular-nums">
            {formatNumber(plantSummary.totalPlantDl)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Line A: {lineASummary.totalDl} · Line B: {lineBSummary.totalDl} คน
          </div>
        </div>

        {/* Card 2: Total Factory IDL */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Indirect Labor (IDL รวม)</span>
            <Users className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-purple-300 tabular-nums">
            {formatNumber(plantSummary.totalPlantIdl, 1)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Line A: {lineASummary.totalIdl} · Line B: {lineBSummary.totalIdl} คน
          </div>
        </div>

        {/* Card 3: Total Factory Spares */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>Spare / Relief รวม</span>
            <Users className="w-3.5 h-3.5 text-amber-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-amber-300 tabular-nums">
            {plantSummary.totalPlantSpare}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Line A: {lineASummary.totalSpare} · Line B: {lineBSummary.totalSpare} คน
          </div>
        </div>

        {/* Card 4: Grand Total Plant MP */}
        <div className="p-3.5 bg-slate-900/60 border border-cyan-500/30 rounded-xl bg-gradient-to-br from-cyan-950/30 to-slate-900/80">
          <div className="flex items-center justify-between text-cyan-400 text-xs mb-1 font-semibold">
            <span>Grand Total MP (ทั้งโรงงาน)</span>
            <Users className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-cyan-200 tabular-nums">
            {formatNumber(plantSummary.grandPlantTotalMp, 1)}
          </div>
          <div className="text-[11px] text-cyan-300/80 mt-1">
            DL + IDL + Spare ทุกไลน์
          </div>
        </div>

        {/* Card 5: Daily Capacity Combined */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>กำลังผลิตต่อวัน (Daily Cap)</span>
            <Gauge className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-emerald-300 tabular-nums">
            {formatNumber(plantSummary.combinedDailyCapacity)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ชิ้น/วัน (คำนวณตาม UPH จริง)
          </div>
        </div>

        {/* Card 6: Monthly Capacity Combined */}
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-1">
            <span>กำลังผลิตต่อเดือน (Monthly Cap)</span>
            <Clock className="w-3.5 h-3.5 text-sky-400" />
          </div>
          <div className="text-2xl font-bold font-mono text-sky-300 tabular-nums">
            {formatNumber(plantSummary.combinedMonthlyCapacity)}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ชิ้น/เดือน (24 วันทำงาน)
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🏢 7 PROCESS LINES MANPOWER OVERVIEW & DEPARTMENT BREAKDOWN   */}
      {/* ============================================================== */}
      <div className="p-5 bg-slate-900/70 border border-cyan-500/30 rounded-2xl space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-white tracking-tight">
                  สรุปกำลังคนแยกตาม Process Line (7 Lines Overview)
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-cyan-500/10 border border-cyan-500/30 text-cyan-300">
                  7 สายการผลิต
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                รวมสายการประกอบหลัก (Line A, B) · สายการผลิตประตู (Door A, B, C) · ขึ้นรูปพลาสติก (Injection Inhouse, Thermoforming)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <button
              onClick={() => onSelectLine('line-b', 'summary')}
              className="px-3.5 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-lg transition-all flex items-center gap-1.5 shadow-md hover:shadow-cyan-500/20 cursor-pointer"
            >
              <span>เปิดดูสรุป Manpower เต็มรูปแบบ (Full Summary)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 3 Department Subtotal Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Dept 1: Main Assembly */}
          <div className="p-3.5 bg-slate-950/80 border border-cyan-500/20 rounded-xl hover:border-cyan-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400"></span>
                <span className="text-xs font-bold text-cyan-300 uppercase tracking-wide">
                  สายการประกอบหลัก (Main Assembly)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Line A & Line B
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-900">
              <div>
                <span className="text-[10px] text-slate-400 block">DL รวม</span>
                <span className="text-sm font-bold font-mono text-white">
                  {(plantSummary.lineSummaries?.['line-a']?.totalDl || 0) +
                    (plantSummary.lineSummaries?.['line-b']?.totalDl || 0)}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">IDL + Spare</span>
                <span className="text-sm font-bold font-mono text-purple-300">
                  {formatNumber(
                    (plantSummary.lineSummaries?.['line-a']?.totalIdl || 0) +
                      (plantSummary.lineSummaries?.['line-a']?.totalSpare || 0) +
                      (plantSummary.lineSummaries?.['line-b']?.totalIdl || 0) +
                      (plantSummary.lineSummaries?.['line-b']?.totalSpare || 0),
                    1
                  )}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-cyan-400 font-semibold block">Grand Total</span>
                <span className="text-sm font-bold font-mono text-cyan-300">
                  {formatNumber(
                    (plantSummary.lineSummaries?.['line-a']?.grandTotalMp || 0) +
                      (plantSummary.lineSummaries?.['line-b']?.grandTotalMp || 0),
                    1
                  )}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
            </div>
          </div>

          {/* Dept 2: Door Lines */}
          <div className="p-3.5 bg-slate-950/80 border border-emerald-500/20 rounded-xl hover:border-emerald-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wide">
                  สายการผลิตประตู (Door Production)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Door A, B, C
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-900">
              <div>
                <span className="text-[10px] text-slate-400 block">DL รวม</span>
                <span className="text-sm font-bold font-mono text-white">
                  {(plantSummary.lineSummaries?.['line-door-a']?.totalDl || 0) +
                    (plantSummary.lineSummaries?.['line-door-b']?.totalDl || 0) +
                    (plantSummary.lineSummaries?.['line-door-c']?.totalDl || 0)}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">IDL + Spare</span>
                <span className="text-sm font-bold font-mono text-purple-300">
                  {formatNumber(
                    (plantSummary.lineSummaries?.['line-door-a']?.totalIdl || 0) +
                      (plantSummary.lineSummaries?.['line-door-a']?.totalSpare || 0) +
                      (plantSummary.lineSummaries?.['line-door-b']?.totalIdl || 0) +
                      (plantSummary.lineSummaries?.['line-door-b']?.totalSpare || 0) +
                      (plantSummary.lineSummaries?.['line-door-c']?.totalIdl || 0) +
                      (plantSummary.lineSummaries?.['line-door-c']?.totalSpare || 0),
                    1
                  )}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-emerald-400 font-semibold block">Grand Total</span>
                <span className="text-sm font-bold font-mono text-emerald-300">
                  {formatNumber(
                    (plantSummary.lineSummaries?.['line-door-a']?.grandTotalMp || 0) +
                      (plantSummary.lineSummaries?.['line-door-b']?.grandTotalMp || 0) +
                      (plantSummary.lineSummaries?.['line-door-c']?.grandTotalMp || 0),
                    1
                  )}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
            </div>
          </div>

          {/* Dept 3: Parts & Molding */}
          <div className="p-3.5 bg-slate-950/80 border border-purple-500/20 rounded-xl hover:border-purple-500/40 transition-colors">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-400"></span>
                <span className="text-xs font-bold text-purple-300 uppercase tracking-wide">
                  ขึ้นรูปพลาสติก (Parts & Molding)
                </span>
              </div>
              <span className="text-[10px] font-mono text-slate-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                Injection + Thermo
              </span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center pt-1 border-t border-slate-900">
              <div>
                <span className="text-[10px] text-slate-400 block">DL รวม</span>
                <span className="text-sm font-bold font-mono text-white">
                  {(plantSummary.lineSummaries?.['line-injection']?.totalDl || 0) +
                    (plantSummary.lineSummaries?.['line-thermoforming']?.totalDl || 0)}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block">IDL + Spare</span>
                <span className="text-sm font-bold font-mono text-purple-300">
                  {formatNumber(
                    (plantSummary.lineSummaries?.['line-injection']?.totalIdl || 0) +
                      (plantSummary.lineSummaries?.['line-injection']?.totalSpare || 0) +
                      (plantSummary.lineSummaries?.['line-thermoforming']?.totalIdl || 0) +
                      (plantSummary.lineSummaries?.['line-thermoforming']?.totalSpare || 0),
                    1
                  )}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
              <div>
                <span className="text-[10px] text-purple-400 font-semibold block">Grand Total</span>
                <span className="text-sm font-bold font-mono text-purple-300">
                  {formatNumber(
                    (plantSummary.lineSummaries?.['line-injection']?.grandTotalMp || 0) +
                      (plantSummary.lineSummaries?.['line-thermoforming']?.grandTotalMp || 0),
                    1
                  )}{' '}
                  <span className="text-[10px] text-slate-400 font-normal">คน</span>
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 7 Process Lines Comparison Table */}
        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">Process Line</th>
                <th className="py-2.5 px-3">แผนก</th>
                <th className="py-2.5 px-3 text-right">DL กะ A/B</th>
                <th className="py-2.5 px-3 text-right">Total DL</th>
                <th className="py-2.5 px-3 text-right">IDL</th>
                <th className="py-2.5 px-3 text-right">Spare</th>
                <th className="py-2.5 px-3 text-right font-bold text-white">Grand Total</th>
                <th className="py-2.5 px-3 text-right">เป้า UPH</th>
                <th className="py-2.5 px-3 text-right">Cap/เดือน</th>
                <th className="py-2.5 px-3 text-center">จัดการ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {ALL_LINES_METADATA.map((meta) => {
                const s = plantSummary.lineSummaries?.[meta.id];
                if (!s) return null;
                const grandTotal = s.grandTotalMp;
                const mpShare =
                  plantSummary.grandPlantTotalMp > 0
                    ? ((grandTotal / plantSummary.grandPlantTotalMp) * 100).toFixed(1)
                    : '0.0';

                return (
                  <tr
                    key={meta.id}
                    className="hover:bg-slate-800/40 transition-colors"
                  >
                    <td className="py-2.5 px-3 font-sans">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                          style={{ backgroundColor: meta.color }}
                        ></span>
                        <div>
                          <span className="font-bold text-white block">
                            {meta.name}
                          </span>
                          <span className="text-[10px] text-slate-500 block truncate max-w-xs">
                            {lines[meta.id]?.modelType || meta.description}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 text-[11px]">
                      {meta.department === 'assembly'
                        ? 'Main Assembly'
                        : meta.department === 'door'
                        ? 'Door Production'
                        : 'Parts & Molding'}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {s.totalDlShiftA} / {s.totalDlShiftB}
                    </td>
                    <td className="py-2.5 px-3 text-right text-cyan-300 font-semibold">
                      {s.totalDl} คน
                    </td>
                    <td className="py-2.5 px-3 text-right text-purple-300">
                      {formatNumber(s.totalIdl, 1)} คน
                    </td>
                    <td className="py-2.5 px-3 text-right text-amber-300">
                      {s.totalSpare} คน
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="font-bold text-white text-sm">
                        {formatNumber(grandTotal, 1)}
                      </span>{' '}
                      <span className="text-[10px] text-slate-400">คน</span>
                      <span className="text-[10px] text-cyan-400 block font-sans">
                        ({mpShare}% ของรง.)
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <span className="px-1.5 py-0.5 rounded bg-slate-950 text-cyan-300 border border-slate-800 font-semibold">
                        {s.targetUph} UPH
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {formatNumber(s.monthlyCapacityStandard)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <div className="flex items-center justify-center gap-1 font-sans">
                        <button
                          onClick={() => onSelectLine(meta.id, 'master')}
                          className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-cyan-300 hover:text-white rounded transition-colors cursor-pointer"
                          title="ดูแผ่นงาน Master Sheet"
                        >
                          Master
                        </button>
                        <button
                          onClick={() => onSelectLine(meta.id, 'balancing')}
                          className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-amber-300 hover:text-white rounded transition-colors cursor-pointer"
                          title="ดู Line Balancing & Bottleneck"
                        >
                          Balancing
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 🚀 FEATURE: DEDICATED UPH SPEED & CAPACITY CONTROLLER SECTION  */}
      {/* ============================================================== */}
      <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-900/90 to-cyan-950/40 border border-cyan-500/40 rounded-xl space-y-4 shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Zap className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-white">
                  ระบบควบคุมและจำลองความเร็วสายการผลิต (Target Line UPH Controller & Simulator)
                </h3>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 px-2 py-0.5 rounded font-mono font-semibold">
                  ฟังค์ชั่นแก้ไข UPH
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                ปรับเปลี่ยนค่าเป้าหมาย UPH (Units Per Hour) เพื่อคำนวณ Takt Time, กำลังการผลิต, และจำนวนคนที่ต้องใช้แบบอัตโนมัติทันที
              </p>
            </div>
          </div>

          {/* Line Selector for UPH Control */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-950 border border-slate-800 rounded-lg self-start md:self-auto">
            <span className="text-xs text-slate-400 px-2">เลือกไลน์:</span>
            <button
              onClick={() => setSelectedUphLine('line-a')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                selectedUphLine === 'line-a'
                  ? 'bg-cyan-500 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Line A ({lines['line-a'].shiftConfig.targetUph || 100} UPH)
            </button>
            <button
              onClick={() => setSelectedUphLine('line-b')}
              className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                selectedUphLine === 'line-b'
                  ? 'bg-amber-400 text-slate-950'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Line B ({lines['line-b'].shiftConfig.targetUph || 110} UPH)
            </button>
          </div>
        </div>

        {/* UPH Interactive Stepper & Sliders */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-center pt-2 border-t border-slate-800">
          {/* Left: UPH Numeric Stepper & Presets (7 cols) */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex items-center gap-3">
              <span className="text-xs text-slate-300 font-medium">ความเร็วเป้าหมาย ({lines[selectedUphLine].name}):</span>
              
              {/* Stepper Down */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleConfigChange(selectedUphLine, 'targetUph', Math.max(10, activeUphCurrent - 10))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded"
                  title="ลดลง 10 UPH"
                >
                  -10
                </button>
                <button
                  onClick={() => handleConfigChange(selectedUphLine, 'targetUph', Math.max(10, activeUphCurrent - 5))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded"
                  title="ลดลง 5 UPH"
                >
                  -5
                </button>
                <button
                  onClick={() => handleConfigChange(selectedUphLine, 'targetUph', Math.max(10, activeUphCurrent - 1))}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded"
                  title="ลดลง 1 UPH"
                >
                  -1
                </button>
              </div>

              {/* Main UPH Numeric Input */}
              <div className="relative w-28">
                <input
                  type="number"
                  min="20"
                  max="300"
                  value={activeUphCurrent}
                  onChange={(e) =>
                    handleConfigChange(selectedUphLine, 'targetUph', parseInt(e.target.value) || 0)
                  }
                  className="w-full text-center bg-slate-950 border-2 border-cyan-400 focus:border-cyan-300 focus:outline-none rounded-lg py-1 px-2 text-xl font-mono font-bold text-cyan-300 tabular-nums shadow-inner"
                  title="พิมพ์ตัวเลข UPH ที่ต้องการได้ทันที"
                />
                <span className="absolute right-2 top-2 text-[10px] text-cyan-500/70 font-mono font-bold">UPH</span>
              </div>

              {/* Stepper Up */}
              <div className="flex items-center gap-1">
                <button
                  onClick={() => handleConfigChange(selectedUphLine, 'targetUph', activeUphCurrent + 1)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded"
                  title="เพิ่มขึ้น 1 UPH"
                >
                  +1
                </button>
                <button
                  onClick={() => handleConfigChange(selectedUphLine, 'targetUph', activeUphCurrent + 5)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded"
                  title="เพิ่มขึ้น 5 UPH"
                >
                  +5
                </button>
                <button
                  onClick={() => handleConfigChange(selectedUphLine, 'targetUph', activeUphCurrent + 10)}
                  className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono rounded"
                  title="เพิ่มขึ้น 10 UPH"
                >
                  +10
                </button>
              </div>

              {/* Apply to All Stations button */}
              <button
                onClick={() => handleApplyBatchUph(selectedUphLine, activeUphCurrent)}
                className="ml-auto px-2.5 py-1 text-xs font-medium text-cyan-300 bg-cyan-950/80 hover:bg-cyan-900 border border-cyan-500/50 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
                title="นำค่า UPH นี้ไปปรับให้กับทุกขั้นตอน (Stations) ในไลน์พร้อมกัน"
              >
                <RefreshCw className="w-3 h-3 text-cyan-400" />
                <span>ใช้กับทุกขั้นตอน</span>
              </button>
            </div>

            {/* Standard UPH Presets */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="text-[11px] text-slate-400 mr-1">ความเร็วยอดนิยม:</span>
              {[80, 90, 100, 110, 115, 120, 125, 130, 140].map((preset) => (
                <button
                  key={preset}
                  onClick={() => handleConfigChange(selectedUphLine, 'targetUph', preset)}
                  className={`px-2 py-0.5 text-xs font-mono rounded transition-colors ${
                    activeUphCurrent === preset
                      ? 'bg-cyan-400 text-slate-950 font-bold'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {preset}
                </button>
              ))}
            </div>
          </div>

          {/* Right: Instant IE Calculated Impacts (5 cols) */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-2 text-xs font-mono bg-slate-950/80 p-2.5 rounded-xl border border-slate-800">
            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Takt Time คำนวณได้</span>
              <span className="text-base font-bold text-emerald-400 tabular-nums">
                {activeTaktTime} s
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                (3600 / {activeUphCurrent})
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-sans">กำลังผลิตต่อวัน (2 กะ)</span>
              <span className="text-base font-bold text-cyan-300 tabular-nums">
                {formatNumber(activeUphSummary.dailyCapacityStandard)}
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                ชิ้น/วัน
              </span>
            </div>

            <div>
              <span className="text-[10px] text-slate-400 block font-sans">Line UPPH</span>
              <span className="text-base font-bold text-purple-300 tabular-nums">
                {activeUphSummary.lineUpph}
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                ชิ้น/คน-ชม.
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 📊 FEATURE: MONTHLY MANPOWER CHART SEPARATED BY LINE A & LINE B */}
      {/* ============================================================== */}
      <MonthlyLineManpowerChart
        lines={lines}
        lineASummary={lineASummary}
        lineBSummary={lineBSummary}
        onSelectMonth={() => onSelectLine('line-b', 'forecast')}
      />

      {/* Side-by-Side Line A vs Line B Direct Parameters Editor */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ============================================================== */}
        {/* Line A Card & Direct Editor */}
        {/* ============================================================== */}
        <div className="p-4 bg-slate-900/60 border border-cyan-500/30 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 inline-block shrink-0"></span>
              <input
                type="text"
                value={lines['line-a'].name}
                onChange={(e) => handleLineNameChange('line-a', e.target.value)}
                className="text-base font-bold text-white bg-transparent border-b border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none w-full"
                title="คลิกเพื่อแก้ไขชื่อ Line A"
              />
            </div>
            <button
              onClick={() => onSelectLine('line-a', 'master')}
              className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium shrink-0 cursor-pointer"
            >
              <span>ดูแผ่นงาน Line A</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">รุ่น/คำอธิบาย:</span>
            <input
              type="text"
              value={lines['line-a'].modelType}
              onChange={(e) => handleModelTypeChange('line-a', e.target.value)}
              className="text-xs text-slate-300 bg-slate-950/70 border border-slate-700/80 rounded px-2 py-0.5 w-full focus:border-cyan-400 focus:outline-none"
            />
          </div>

          {/* Line A Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Total DL (คน)</span>
              <span className="text-base font-bold text-cyan-300 tabular-nums">
                {lineASummary.totalDl} คน
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                A: {lineASummary.totalDlShiftA} · B: {lineASummary.totalDlShiftB}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Total IDL (คน)</span>
              <span className="text-base font-bold text-purple-300 tabular-nums">
                {formatNumber(lineASummary.totalIdl, 1)} คน
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                Leader + QI + Sup
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Grand Total MP</span>
              <span className="text-base font-bold text-white tabular-nums">
                {formatNumber(lineASummary.grandTotalMp, 1)} คน
              </span>
              <span className="text-[10px] text-amber-400 block font-sans">
                Spare: {lineASummary.totalSpare} คน
              </span>
            </div>
          </div>

          {/* Line A Parameter Inputs (ALL EDITABLE) */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-cyan-300 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>พารามิเตอร์การผลิต Line A (แก้ไขได้ทุกช่อง):</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* UPH Input */}
              <div>
                <label className="text-[10px] text-cyan-400 font-semibold block mb-0.5">Line Target UPH</label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={lines['line-a'].shiftConfig.targetUph || 100}
                    onChange={(e) =>
                      handleConfigChange('line-a', 'targetUph', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border-2 border-cyan-500/60 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-cyan-300 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">UPH</span>
                </div>
              </div>

              {/* Operating Hours */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">เวลาทำงาน/กะ</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="12"
                    value={lines['line-a'].shiftConfig.plannedOperatingHours}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-a',
                        'plannedOperatingHours',
                        parseFloat(e.target.value) || 8
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-white font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">h</span>
                </div>
              </div>

              {/* Working Days */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">วันทำงาน/เดือน</label>
                <div className="relative">
                  <input
                    type="number"
                    min="15"
                    max="31"
                    value={lines['line-a'].shiftConfig.workingDaysPerMonth}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-a',
                        'workingDaysPerMonth',
                        parseInt(e.target.value) || 24
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-white font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">วัน</span>
                </div>
              </div>

              {/* Planned OEE % */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Planned OEE %</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="40"
                    max="100"
                    value={lines['line-a'].shiftConfig.plannedOeePct}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-a',
                        'plannedOeePct',
                        parseFloat(e.target.value) || 88
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-emerald-400 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Spare Buffer % */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Spare Buffer %</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="15"
                    value={lines['line-a'].shiftConfig.spareMpPct}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-a',
                        'spareMpPct',
                        parseFloat(e.target.value) || 4
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-amber-300 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Break Minutes */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">เวลาพัก (Break)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    max="120"
                    value={lines['line-a'].shiftConfig.breakMinutes}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-a',
                        'breakMinutes',
                        parseInt(e.target.value) || 60
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-slate-200 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">นาที</span>
                </div>
              </div>

              {/* OT Hours Shift A */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">OT กะ A (ชั่วโมง)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={lines['line-a'].shiftConfig.otHoursShiftA}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-a',
                        'otHoursShiftA',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-slate-200 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">h</span>
                </div>
              </div>

              {/* OT Hours Shift B */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">OT กะ B (ชั่วโมง)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={lines['line-a'].shiftConfig.otHoursShiftB}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-a',
                        'otHoursShiftB',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-slate-200 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">h</span>
                </div>
              </div>
            </div>

            {/* Calculated Line A Capacities */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">กำลังผลิตต่อกะ:</span>
                <span className="text-emerald-400 font-bold">
                  {Math.round(lineASummary.dailyCapacityStandard / 2)} ชิ้น/กะ
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">กำลังผลิตต่อวัน:</span>
                <span className="text-cyan-300 font-bold">{formatNumber(lineASummary.dailyCapacityStandard)} ชิ้น</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">กำลังผลิตต่อเดือน:</span>
                <span className="text-cyan-200 font-bold">{formatNumber(lineASummary.monthlyCapacityStandard)} ชิ้น</span>
              </div>
            </div>
          </div>
        </div>

        {/* ============================================================== */}
        {/* Line B Card & Direct Editor */}
        {/* ============================================================== */}
        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 flex-1 mr-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block shrink-0"></span>
              <input
                type="text"
                value={lines['line-b'].name}
                onChange={(e) => handleLineNameChange('line-b', e.target.value)}
                className="text-base font-bold text-white bg-transparent border-b border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none w-full"
                title="คลิกเพื่อแก้ไขชื่อ Line B"
              />
            </div>
            <button
              onClick={() => onSelectLine('line-b', 'master')}
              className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1 font-medium shrink-0 cursor-pointer"
            >
              <span>ดูแผ่นงาน Line B</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">รุ่น/คำอธิบาย:</span>
            <input
              type="text"
              value={lines['line-b'].modelType}
              onChange={(e) => handleModelTypeChange('line-b', e.target.value)}
              className="text-xs text-slate-300 bg-slate-950/70 border border-slate-700/80 rounded px-2 py-0.5 w-full focus:border-amber-400 focus:outline-none"
            />
          </div>

          {/* Line B Key Metrics Strip */}
          <div className="grid grid-cols-3 gap-2 text-xs font-mono">
            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Total DL (คน)</span>
              <span className="text-base font-bold text-amber-300 tabular-nums">
                {lineBSummary.totalDl} คน
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                A: {lineBSummary.totalDlShiftA} · B: {lineBSummary.totalDlShiftB}
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Total IDL (คน)</span>
              <span className="text-base font-bold text-purple-300 tabular-nums">
                {formatNumber(lineBSummary.totalIdl, 1)} คน
              </span>
              <span className="text-[10px] text-slate-500 block font-sans">
                Leader + QI + Sup
              </span>
            </div>

            <div className="p-2.5 bg-slate-950/80 rounded-lg border border-slate-800">
              <span className="text-[10px] text-slate-400 block font-sans">Grand Total MP</span>
              <span className="text-base font-bold text-white tabular-nums">
                {formatNumber(lineBSummary.grandTotalMp, 1)} คน
              </span>
              <span className="text-[10px] text-amber-400 block font-sans">
                Spare: {lineBSummary.totalSpare} คน
              </span>
            </div>
          </div>

          {/* Line B Parameter Inputs (ALL EDITABLE) */}
          <div className="p-3 bg-slate-950/70 rounded-xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                <Edit3 className="w-3.5 h-3.5" />
                <span>พารามิเตอร์การผลิต Line B (แก้ไขได้ทุกช่อง):</span>
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              {/* UPH Input */}
              <div>
                <label className="text-[10px] text-amber-400 font-semibold block mb-0.5">Line Target UPH</label>
                <div className="relative">
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={lines['line-b'].shiftConfig.targetUph || 110}
                    onChange={(e) =>
                      handleConfigChange('line-b', 'targetUph', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border-2 border-amber-500/60 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-amber-300 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">UPH</span>
                </div>
              </div>

              {/* Operating Hours */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">เวลาทำงาน/กะ</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="4"
                    max="12"
                    value={lines['line-b'].shiftConfig.plannedOperatingHours}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-b',
                        'plannedOperatingHours',
                        parseFloat(e.target.value) || 8
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-white font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">h</span>
                </div>
              </div>

              {/* Working Days */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">วันทำงาน/เดือน</label>
                <div className="relative">
                  <input
                    type="number"
                    min="15"
                    max="31"
                    value={lines['line-b'].shiftConfig.workingDaysPerMonth}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-b',
                        'workingDaysPerMonth',
                        parseInt(e.target.value) || 24
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-white font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">วัน</span>
                </div>
              </div>

              {/* Planned OEE % */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Planned OEE %</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="40"
                    max="100"
                    value={lines['line-b'].shiftConfig.plannedOeePct}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-b',
                        'plannedOeePct',
                        parseFloat(e.target.value) || 88
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-emerald-400 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Spare Buffer % */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">Spare Buffer %</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="15"
                    value={lines['line-b'].shiftConfig.spareMpPct}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-b',
                        'spareMpPct',
                        parseFloat(e.target.value) || 4
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-amber-300 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">%</span>
                </div>
              </div>

              {/* Break Minutes */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">เวลาพัก (Break)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="5"
                    min="0"
                    max="120"
                    value={lines['line-b'].shiftConfig.breakMinutes}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-b',
                        'breakMinutes',
                        parseInt(e.target.value) || 60
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-slate-200 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">นาที</span>
                </div>
              </div>

              {/* OT Hours Shift A */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">OT กะ A (ชั่วโมง)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={lines['line-b'].shiftConfig.otHoursShiftA}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-b',
                        'otHoursShiftA',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-slate-200 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">h</span>
                </div>
              </div>

              {/* OT Hours Shift B */}
              <div>
                <label className="text-[10px] text-slate-400 block mb-0.5">OT กะ B (ชั่วโมง)</label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    max="6"
                    value={lines['line-b'].shiftConfig.otHoursShiftB}
                    onChange={(e) =>
                      handleConfigChange(
                        'line-b',
                        'otHoursShiftB',
                        parseFloat(e.target.value) || 0
                      )
                    }
                    className="w-full bg-slate-900 border border-slate-700 hover:border-slate-500 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-slate-200 font-mono font-bold tabular-nums"
                  />
                  <span className="absolute right-2 top-1 text-[10px] text-slate-500">h</span>
                </div>
              </div>
            </div>

            {/* Calculated Line B Capacities */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800 text-[11px] font-mono">
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">กำลังผลิตต่อกะ:</span>
                <span className="text-emerald-400 font-bold">
                  {Math.round(lineBSummary.dailyCapacityStandard / 2)} ชิ้น/กะ
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">กำลังผลิตต่อวัน:</span>
                <span className="text-cyan-300 font-bold">{formatNumber(lineBSummary.dailyCapacityStandard)} ชิ้น</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px] font-sans">กำลังผลิตต่อเดือน:</span>
                <span className="text-cyan-200 font-bold">{formatNumber(lineBSummary.monthlyCapacityStandard)} ชิ้น</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Station-by-Station Matrix: EDITABLE PROCESSES, MP & UPH */}
      {/* ============================================================== */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 space-y-0 shadow-sm">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">
                ตารางเปรียบเทียบและแก้ไขกำลังคนตามขั้นตอน (Editable Process Matrix: Line A vs Line B)
              </span>
              <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-mono">
                {lines['line-b'].stations.length} ขั้นตอน
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              สามารถพิมพ์แก้ไขชื่อขั้นตอน, จำนวนคนกะ A/B, และค่า UPH ในตารางนี้ได้โดยตรง
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* View Mode Toggle */}
            <button
              onClick={() => setShowDetailedMatrix(!showDetailedMatrix)}
              className="px-2.5 py-1 text-xs font-medium text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span>{showDetailedMatrix ? 'ซ่อนคอลัมน์ UPH/CT' : 'แสดงคอลัมน์ UPH/CT'}</span>
            </button>

            {/* Add Process Input */}
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                placeholder="+ ชื่อขั้นตอนใหม่..."
                value={newStationName}
                onChange={(e) => setNewStationName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddStationToBoth()}
                className="text-xs bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none w-40"
              />
              <button
                onClick={handleAddStationToBoth}
                className="px-2.5 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>เพิ่ม</span>
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-medium border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">No.</th>
                <th className="py-2.5 px-3 min-w-[180px]">Process / Station Name</th>
                <th className="py-2.5 px-2 w-16 text-center text-cyan-400">Line A (A)</th>
                <th className="py-2.5 px-2 w-16 text-center text-cyan-400">Line A (B)</th>
                <th className="py-2.5 px-2 w-16 text-right text-cyan-300">Total A</th>
                {showDetailedMatrix && (
                  <>
                    <th className="py-2.5 px-2 w-18 text-center text-cyan-400">A (UPH)</th>
                    <th className="py-2.5 px-2 w-16 text-center text-slate-400">A (CT)</th>
                  </>
                )}
                <th className="py-2.5 px-2 w-16 text-center text-amber-400">Line B (A)</th>
                <th className="py-2.5 px-2 w-16 text-center text-amber-400">Line B (B)</th>
                <th className="py-2.5 px-2 w-16 text-right text-amber-300">Total B</th>
                {showDetailedMatrix && (
                  <>
                    <th className="py-2.5 px-2 w-18 text-center text-amber-400">B (UPH)</th>
                    <th className="py-2.5 px-2 w-16 text-center text-slate-400">B (CT)</th>
                  </>
                )}
                <th className="py-2.5 px-3 w-20 text-right text-white font-bold">Plant Total</th>
                <th className="py-2.5 px-2 w-10 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {lines['line-b'].stations.map((stB, idx) => {
                const stA = lines['line-a'].stations[idx] || {
                  mpShiftA: 0,
                  mpShiftB: 0,
                  name: stB.name,
                  uph: 100,
                  cycleTimeSec: 25,
                };
                const totalA = stA.mpShiftA + stA.mpShiftB;
                const totalB = stB.mpShiftA + stB.mpShiftB;
                const plantTotalStation = totalA + totalB;

                return (
                  <tr key={stB.id || idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2 px-3 text-center text-slate-400 font-sans">
                      {idx + 1}
                    </td>

                    {/* Editable Process Name */}
                    <td className="py-1 px-3 font-sans">
                      <input
                        type="text"
                        value={stB.name}
                        onChange={(e) => handleStationNameChange(idx, e.target.value)}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-600 focus:border-cyan-400 focus:outline-none text-slate-200 font-medium py-0.5"
                        title="คลิกเพื่อแก้ไขชื่อขั้นตอน"
                      />
                    </td>

                    {/* Line A Shift A Input */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={stA.mpShiftA}
                        onChange={(e) =>
                          handleStationFieldChange('line-a', idx, 'mpShiftA', parseInt(e.target.value) || 0)
                        }
                        className="w-14 text-right bg-slate-950/80 border border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-1.5 py-0.5 text-cyan-300 font-bold tabular-nums"
                        title="แก้ไข DL Line A กะ A"
                      />
                    </td>

                    {/* Line A Shift B Input */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={stA.mpShiftB}
                        onChange={(e) =>
                          handleStationFieldChange('line-a', idx, 'mpShiftB', parseInt(e.target.value) || 0)
                        }
                        className="w-14 text-right bg-slate-950/80 border border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-1.5 py-0.5 text-cyan-300 font-bold tabular-nums"
                        title="แก้ไข DL Line A กะ B"
                      />
                    </td>

                    {/* Line A Total */}
                    <td className="py-2 px-2 text-right text-cyan-200 font-semibold tabular-nums">
                      {totalA}
                    </td>

                    {/* Line A Station UPH & CT (if detailed) */}
                    {showDetailedMatrix && (
                      <>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            min="10"
                            value={stA.uph || 100}
                            onChange={(e) =>
                              handleStationFieldChange('line-a', idx, 'uph', parseInt(e.target.value) || 0)
                            }
                            className="w-16 text-right bg-slate-950/80 border border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-1.5 py-0.5 text-emerald-400 font-bold tabular-nums"
                            title="แก้ไข UPH ของสถานี Line A"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={stA.cycleTimeSec}
                            onChange={(e) =>
                              handleStationFieldChange('line-a', idx, 'cycleTimeSec', parseFloat(e.target.value) || 0)
                            }
                            className="w-14 text-right bg-slate-950/80 border border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-1 py-0.5 text-slate-300 tabular-nums"
                            title="แก้ไข Cycle Time (CT วินาที) ของสถานี Line A"
                          />
                        </td>
                      </>
                    )}

                    {/* Line B Shift A Input */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={stB.mpShiftA}
                        onChange={(e) =>
                          handleStationFieldChange('line-b', idx, 'mpShiftA', parseInt(e.target.value) || 0)
                        }
                        className="w-14 text-right bg-slate-950/80 border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-1.5 py-0.5 text-amber-300 font-bold tabular-nums"
                        title="แก้ไข DL Line B กะ A"
                      />
                    </td>

                    {/* Line B Shift B Input */}
                    <td className="py-1.5 px-2 text-center">
                      <input
                        type="number"
                        min="0"
                        value={stB.mpShiftB}
                        onChange={(e) =>
                          handleStationFieldChange('line-b', idx, 'mpShiftB', parseInt(e.target.value) || 0)
                        }
                        className="w-14 text-right bg-slate-950/80 border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-1.5 py-0.5 text-amber-300 font-bold tabular-nums"
                        title="แก้ไข DL Line B กะ B"
                      />
                    </td>

                    {/* Line B Total */}
                    <td className="py-2 px-2 text-right text-amber-200 font-semibold tabular-nums">
                      {totalB}
                    </td>

                    {/* Line B Station UPH & CT (if detailed) */}
                    {showDetailedMatrix && (
                      <>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            min="10"
                            value={stB.uph || 110}
                            onChange={(e) =>
                              handleStationFieldChange('line-b', idx, 'uph', parseInt(e.target.value) || 0)
                            }
                            className="w-16 text-right bg-slate-950/80 border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-1.5 py-0.5 text-emerald-400 font-bold tabular-nums"
                            title="แก้ไข UPH ของสถานี Line B"
                          />
                        </td>
                        <td className="py-1.5 px-2 text-center">
                          <input
                            type="number"
                            step="0.5"
                            min="1"
                            value={stB.cycleTimeSec}
                            onChange={(e) =>
                              handleStationFieldChange('line-b', idx, 'cycleTimeSec', parseFloat(e.target.value) || 0)
                            }
                            className="w-14 text-right bg-slate-950/80 border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-1 py-0.5 text-slate-300 tabular-nums"
                            title="แก้ไข Cycle Time (CT วินาที) ของสถานี Line B"
                          />
                        </td>
                      </>
                    )}

                    {/* Plant Total */}
                    <td className="py-2 px-3 text-right text-white font-bold tabular-nums text-sm">
                      {plantTotalStation}
                    </td>

                    {/* Delete action */}
                    <td className="py-1.5 px-2 text-center">
                      <button
                        onClick={() => handleDeleteStation(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        title="ลบขั้นตอนนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              {/* Subtotal DL Row */}
              <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-white">
                <td colSpan={2} className="py-2.5 px-4 font-sans text-cyan-300">
                  Total Direct Labor (DL) รวมสองไลน์
                </td>
                <td className="py-2.5 px-2 text-center text-cyan-400 tabular-nums">
                  {lineASummary.totalDlShiftA}
                </td>
                <td className="py-2.5 px-2 text-center text-cyan-400 tabular-nums">
                  {lineASummary.totalDlShiftB}
                </td>
                <td className="py-2.5 px-2 text-right text-cyan-300 tabular-nums text-sm">
                  {lineASummary.totalDl}
                </td>
                {showDetailedMatrix && (
                  <td colSpan={2} className="py-2.5 px-2 text-center text-[10px] text-slate-400 font-sans">
                    Target {lineASummary.targetUph} UPH
                  </td>
                )}
                <td className="py-2.5 px-2 text-center text-amber-400 tabular-nums">
                  {lineBSummary.totalDlShiftA}
                </td>
                <td className="py-2.5 px-2 text-center text-amber-400 tabular-nums">
                  {lineBSummary.totalDlShiftB}
                </td>
                <td className="py-2.5 px-2 text-right text-amber-300 tabular-nums text-sm">
                  {lineBSummary.totalDl}
                </td>
                {showDetailedMatrix && (
                  <td colSpan={2} className="py-2.5 px-2 text-center text-[10px] text-slate-400 font-sans">
                    Target {lineBSummary.targetUph} UPH
                  </td>
                )}
                <td className="py-2.5 px-3 text-right text-white font-bold text-sm tabular-nums">
                  {plantSummary.totalPlantDl}
                </td>
                <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Indirect Labor (IDL) Comparison & Edit Section */}
      {/* ============================================================== */}
      <div className="border border-slate-800 rounded-xl overflow-hidden bg-slate-900/40 shadow-sm">
        <div className="p-3.5 bg-slate-900/80 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-white">
              แก้ไขกำลังคนทางอ้อมและสายสนับสนุน (Editable Indirect Labor - IDL Matrix)
            </span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-purple-400 font-mono">
              รวม IDL ทั้งโรงงาน: {formatNumber(plantSummary.totalPlantIdl, 1)} คน
            </span>
            <button
              onClick={handleAddIdlRole}
              className="px-2.5 py-1 text-xs font-medium text-purple-300 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>เพิ่มตำแหน่ง IDL</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-900/90 text-slate-400 font-medium border-b border-slate-800 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-4 min-w-[200px]">IDL Role / Position</th>
                <th className="py-2.5 px-3 w-32 text-center text-cyan-400">Line A (STD MP)</th>
                <th className="py-2.5 px-3 w-32 text-center text-amber-400">Line B (STD MP)</th>
                <th className="py-2.5 px-3 w-32 text-right text-white font-bold">Plant Total IDL</th>
                <th className="py-2.5 px-4">Role Description & Notes</th>
                <th className="py-2.5 px-2 w-10 text-center">Del</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {lines['line-b'].idlRoles.map((roleB, idx) => {
                const roleA = lines['line-a'].idlRoles[idx] || { stdMp: 0, title: roleB.title, notes: roleB.notes };
                const totalIdlRole = roleA.stdMp + roleB.stdMp;

                return (
                  <tr key={roleB.id || idx} className="hover:bg-slate-800/30 transition-colors">
                    {/* Editable Title */}
                    <td className="py-1.5 px-4 font-sans font-medium">
                      <input
                        type="text"
                        value={roleB.title}
                        onChange={(e) => {
                          handleIdlRoleChange('line-b', idx, 'title', e.target.value);
                          handleIdlRoleChange('line-a', idx, 'title', e.target.value);
                        }}
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-purple-400 focus:outline-none text-slate-200"
                        title="คลิกเพื่อแก้ไขชื่อตำแหน่ง IDL"
                      />
                    </td>

                    {/* Line A IDL Input */}
                    <td className="py-1.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={roleA.stdMp}
                        onChange={(e) =>
                          handleIdlRoleChange('line-a', idx, 'stdMp', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 text-right bg-slate-950/80 border border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-2 py-0.5 text-cyan-300 font-bold tabular-nums"
                        title="แก้ไข IDL Line A"
                      />
                    </td>

                    {/* Line B IDL Input */}
                    <td className="py-1.5 px-3 text-center">
                      <input
                        type="number"
                        min="0"
                        step="0.5"
                        value={roleB.stdMp}
                        onChange={(e) =>
                          handleIdlRoleChange('line-b', idx, 'stdMp', parseFloat(e.target.value) || 0)
                        }
                        className="w-20 text-right bg-slate-950/80 border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-2 py-0.5 text-amber-300 font-bold tabular-nums"
                        title="แก้ไข IDL Line B"
                      />
                    </td>

                    {/* Total IDL Role */}
                    <td className="py-2 px-3 text-right text-purple-300 font-bold tabular-nums">
                      {formatNumber(totalIdlRole, 1)} คน
                    </td>

                    {/* Role Notes Input */}
                    <td className="py-1.5 px-4 font-sans">
                      <input
                        type="text"
                        value={roleB.notes || ''}
                        onChange={(e) => {
                          handleIdlRoleChange('line-b', idx, 'notes', e.target.value);
                          handleIdlRoleChange('line-a', idx, 'notes', e.target.value);
                        }}
                        placeholder="หมายเหตุบทบาท / อัตราส่วน..."
                        className="w-full bg-transparent border-b border-transparent hover:border-slate-700 focus:border-purple-400 focus:outline-none text-slate-400 text-xs"
                      />
                    </td>

                    {/* Delete action */}
                    <td className="py-1.5 px-2 text-center">
                      <button
                        onClick={() => handleDeleteIdlRole(idx)}
                        className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        title="ลบตำแหน่งนี้"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })}

              <tr className="bg-slate-900 font-bold border-t-2 border-slate-700 text-white">
                <td className="py-2.5 px-4 font-sans text-purple-300">
                  SUM Total Indirect Labor (IDL)
                </td>
                <td className="py-2.5 px-3 text-center text-cyan-300 tabular-nums">
                  {formatNumber(lineASummary.totalIdl, 1)}
                </td>
                <td className="py-2.5 px-3 text-center text-amber-300 tabular-nums">
                  {formatNumber(lineBSummary.totalIdl, 1)}
                </td>
                <td className="py-2.5 px-3 text-right text-purple-200 text-sm tabular-nums">
                  {formatNumber(plantSummary.totalPlantIdl, 1)}
                </td>
                <td colSpan={2} className="py-2.5 px-4 text-xs font-normal text-slate-400 font-sans">
                  อัตราส่วน IDL/DL โรงงาน = {formatPct((plantSummary.totalPlantIdl / (plantSummary.totalPlantDl || 1)) * 100)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* ============================================================== */}
      {/* Production Plan vs Actual Factory Summary (EDITABLE VOLUMES & UPH) */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Plant Total Output Card */}
        <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-2.5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-xs text-slate-400">
              <span>ผลผลิตรวมโรงงาน (Plant Actual vs Plan)</span>
              <GitCompare className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="text-2xl font-bold font-mono text-white tabular-nums mt-1">
              {formatNumber(totalFactoryActual)} / {formatNumber(totalFactoryPlan)}{' '}
              <span className="text-xs font-normal text-slate-400">ชิ้น</span>
            </div>
            <div className="flex items-center gap-1.5 text-xs mt-1">
              <span className="text-slate-400">อัตราบรรลุเป้าหมายรวม:</span>
              <span
                className={`font-mono font-bold ${
                  totalFactoryAchieve >= 98
                    ? 'text-emerald-400'
                    : totalFactoryAchieve >= 90
                    ? 'text-amber-400'
                    : 'text-rose-400'
                }`}
              >
                {formatPct(totalFactoryAchieve)}
              </span>
            </div>
          </div>

          <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-800 flex items-center justify-between">
            <span>UPPH เฉลี่ยโรงงาน: {plantSummary.plantAverageUpph || 0.32}</span>
            <button
              onClick={() => onSelectLine('line-b', 'plan_vs_actual')}
              className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-1"
            >
              <span>ดูตารางผลผลิตเต็ม</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Line A Plan vs Actual Card with Direct Inputs */}
        <div className="p-4 bg-slate-900/60 border border-cyan-500/30 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="font-semibold text-white">Line A: ผลผลิตและ UPH</span>
            </span>
            <span
              className={`font-mono font-bold text-xs ${
                lineAAchieve >= 98 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {formatPct(lineAAchieve)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">ยอดตามแผน (Plan)</label>
              <input
                type="number"
                value={lineAPlanVol}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-a', 'planVolume', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-white font-mono font-bold text-sm tabular-nums"
                title="แก้ไขยอดตามแผน Line A"
              />
            </div>
            <div>
              <label className="text-[10px] text-cyan-400 font-semibold block mb-0.5">ผลิตจริง (Actual)</label>
              <input
                type="number"
                value={lineAActualVol}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-a', 'actualVolume', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-cyan-500/50 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-2 py-1 text-cyan-300 font-mono font-bold text-sm tabular-nums"
                title="แก้ไขผลผลิตจริง Line A"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Plan UPH</label>
              <input
                type="number"
                value={lineALatest.planUph || 100}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-a', 'planUph', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-slate-700 hover:border-cyan-400 focus:border-cyan-400 focus:outline-none rounded px-2 py-0.5 text-slate-300 font-mono font-bold tabular-nums"
                title="แก้ไข Plan UPH Line A"
              />
            </div>
            <div>
              <label className="text-[10px] text-emerald-400 font-semibold block mb-0.5">Actual UPH</label>
              <input
                type="number"
                value={lineALatest.actualUph || 101}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-a', 'actualUph', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-emerald-500/50 hover:border-emerald-400 focus:border-emerald-400 focus:outline-none rounded px-2 py-0.5 text-emerald-400 font-mono font-bold tabular-nums"
                title="แก้ไข Actual UPH Line A"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>UPPH: {lineALatest.actualUpph || 0.31}</span>
            <button
              onClick={() => setShowLossEditorLineA(!showLossEditorLineA)}
              className="text-cyan-400 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>{showLossEditorLineA ? 'ปิด Loss' : 'แก้ไขเวลาสูญเสีย (Loss)'}</span>
              {showLossEditorLineA ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expandable Loss Editor Line A */}
          {showLossEditorLineA && (
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs animate-in fade-in">
              <span className="text-[10px] font-semibold text-rose-400 block">เวลาสูญเสีย (Losses - นาที):</span>
              <div className="grid grid-cols-3 gap-1.5 font-mono">
                <div>
                  <label className="text-[9px] text-slate-400 block">Breakdown</label>
                  <input
                    type="number"
                    value={lineALatest.lineBreakdownMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-a', 'lineBreakdownMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Material</label>
                  <input
                    type="number"
                    value={lineALatest.materialShortageMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-a', 'materialShortageMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Changeover</label>
                  <input
                    type="number"
                    value={lineALatest.changeoverMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-a', 'changeoverMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Speed Loss</label>
                  <input
                    type="number"
                    value={lineALatest.speedLossMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-a', 'speedLossMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Absenteeism</label>
                  <input
                    type="number"
                    value={lineALatest.absenteeismLossMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-a', 'absenteeismLossMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Other Loss</label>
                  <input
                    type="number"
                    value={lineALatest.otherLossMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-a', 'otherLossMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Line B Plan vs Actual Card with Direct Inputs */}
        <div className="p-4 bg-slate-900/60 border border-amber-500/30 rounded-xl space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              <span className="font-semibold text-white">Line B: ผลผลิตและ UPH</span>
            </span>
            <span
              className={`font-mono font-bold text-xs ${
                lineBAchieve >= 98 ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {formatPct(lineBAchieve)}
            </span>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">ยอดตามแผน (Plan)</label>
              <input
                type="number"
                value={lineBPlanVol}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-b', 'planVolume', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-white font-mono font-bold text-sm tabular-nums"
                title="แก้ไขยอดตามแผน Line B"
              />
            </div>
            <div>
              <label className="text-[10px] text-amber-400 font-semibold block mb-0.5">ผลิตจริง (Actual)</label>
              <input
                type="number"
                value={lineBActualVol}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-b', 'actualVolume', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-amber-500/50 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-2 py-1 text-amber-300 font-mono font-bold text-sm tabular-nums"
                title="แก้ไขผลผลิตจริง Line B"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs pt-1">
            <div>
              <label className="text-[10px] text-slate-400 block mb-0.5">Plan UPH</label>
              <input
                type="number"
                value={lineBLatest.planUph || 110}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-b', 'planUph', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-slate-700 hover:border-amber-400 focus:border-amber-400 focus:outline-none rounded px-2 py-0.5 text-slate-300 font-mono font-bold tabular-nums"
                title="แก้ไข Plan UPH Line B"
              />
            </div>
            <div>
              <label className="text-[10px] text-emerald-400 font-semibold block mb-0.5">Actual UPH</label>
              <input
                type="number"
                value={lineBLatest.actualUph || 108}
                onChange={(e) =>
                  handlePlanActualFieldChange('line-b', 'actualUph', parseInt(e.target.value) || 0)
                }
                className="w-full bg-slate-950 border border-emerald-500/50 hover:border-emerald-400 focus:border-emerald-400 focus:outline-none rounded px-2 py-0.5 text-emerald-400 font-mono font-bold tabular-nums"
                title="แก้ไข Actual UPH Line B"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-400 flex items-center justify-between pt-1">
            <span>UPPH: {lineBLatest.actualUpph || 0.32}</span>
            <button
              onClick={() => setShowLossEditorLineB(!showLossEditorLineB)}
              className="text-amber-400 hover:underline cursor-pointer flex items-center gap-0.5"
            >
              <span>{showLossEditorLineB ? 'ปิด Loss' : 'แก้ไขเวลาสูญเสีย (Loss)'}</span>
              {showLossEditorLineB ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
          </div>

          {/* Expandable Loss Editor Line B */}
          {showLossEditorLineB && (
            <div className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 space-y-2 text-xs animate-in fade-in">
              <span className="text-[10px] font-semibold text-rose-400 block">เวลาสูญเสีย (Losses - นาที):</span>
              <div className="grid grid-cols-3 gap-1.5 font-mono">
                <div>
                  <label className="text-[9px] text-slate-400 block">Breakdown</label>
                  <input
                    type="number"
                    value={lineBLatest.lineBreakdownMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-b', 'lineBreakdownMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Material</label>
                  <input
                    type="number"
                    value={lineBLatest.materialShortageMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-b', 'materialShortageMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Changeover</label>
                  <input
                    type="number"
                    value={lineBLatest.changeoverMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-b', 'changeoverMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Speed Loss</label>
                  <input
                    type="number"
                    value={lineBLatest.speedLossMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-b', 'speedLossMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Absenteeism</label>
                  <input
                    type="number"
                    value={lineBLatest.absenteeismLossMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-b', 'absenteeismLossMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
                <div>
                  <label className="text-[9px] text-slate-400 block">Other Loss</label>
                  <input
                    type="number"
                    value={lineBLatest.otherLossMins || 0}
                    onChange={(e) =>
                      handlePlanActualFieldChange('line-b', 'otherLossMins', parseInt(e.target.value) || 0)
                    }
                    className="w-full bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5 text-slate-200 text-center"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
