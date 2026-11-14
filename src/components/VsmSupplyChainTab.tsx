import React, { useState, useMemo } from 'react';
import {
  LineData,
  VsmNodeConfig,
  VsmNodeEvaluation,
  VsmDeliveryStatus,
} from '../types/manpower';
import { INITIAL_VSM_CONFIGS } from '../data/initialData';
import {
  evaluateVsmSupplyChain,
  autoBalanceVsmConfigs,
} from '../utils/vsmCalculations';
import { formatNumber, exportToCsv } from '../utils/ieCalculations';
import {
  Workflow,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Clock,
  Layers,
  Gauge,
  Download,
  RotateCcw,
  Sparkles,
  PackageCheck,
  Truck,
  Factory,
  ExternalLink,
  AlertCircle,
  Sliders,
} from 'lucide-react';

interface VsmSupplyChainTabProps {
  lines: Record<string, LineData>;
  setLines: React.Dispatch<React.SetStateAction<Record<string, LineData>>>;
  vsmConfigs: VsmNodeConfig[];
  setVsmConfigs: React.Dispatch<React.SetStateAction<VsmNodeConfig[]>>;
  onNavigateToLine?: (
    lineId: string,
    targetTab?: 'master' | 'balancing' | 'forecast'
  ) => void;
}

const getStatusMeta = (status: VsmDeliveryStatus) => {
  if (status === 'ON_TIME') {
    return {
      label: 'ส่งทันเวลา (On-Time)',
      shortLabel: 'ทันเวลา',
      badgeClass:
        'bg-emerald-500/15 text-emerald-300 border border-emerald-500/35',
      cardBorder: 'border-emerald-500/35',
      icon: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
    };
  }
  if (status === 'AT_RISK') {
    return {
      label: 'เสี่ยงขาดช่วงพีค (At-Risk)',
      shortLabel: 'เสี่ยงขาด',
      badgeClass: 'bg-amber-500/15 text-amber-300 border border-amber-500/35',
      cardBorder: 'border-amber-500/40',
      icon: <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />,
    };
  }
  return {
    label: 'ส่งไม่ทัน / ขาดสต็อก (Shortage)',
    shortLabel: 'ไม่ทันเวลา',
    badgeClass: 'bg-rose-500/15 text-rose-300 border border-rose-500/40',
    cardBorder: 'border-rose-500/45',
    icon: <XCircle className="w-4 h-4 text-rose-400 shrink-0" />,
  };
};

export const VsmSupplyChainTab: React.FC<VsmSupplyChainTabProps> = ({
  lines,
  setLines,
  vsmConfigs,
  setVsmConfigs,
  onNavigateToLine,
}) => {
  const analysis = useMemo(
    () => evaluateVsmSupplyChain(lines, vsmConfigs),
    [lines, vsmConfigs]
  );

  const [selectedFeederId, setSelectedFeederId] = useState<string>(
    'line-thermoforming'
  );
  const [hoveredHourIdx, setHoveredHourIdx] = useState<number | null>(null);
  const [pendingUphAdjustments, setPendingUphAdjustments] = useState<
    { lineId: string; currentUph: number; requiredUph: number }[]
  >([]);

  const selectedEval: VsmNodeEvaluation =
    analysis.evaluations[selectedFeederId] ||
    analysis.feederEvaluations[0] ||
    analysis.mainLineEvaluations[0];

  // Update a single VSM node field
  const handleUpdateVsmNode = <K extends keyof VsmNodeConfig>(
    lineId: string,
    field: K,
    value: VsmNodeConfig[K]
  ) => {
    setVsmConfigs((prev) =>
      prev.map((cfg) =>
        cfg.lineId === lineId ? { ...cfg, [field]: value } : cfg
      )
    );
  };

  // Sync Target UPH or OEE directly into main `lines` state so all sheets stay aligned
  const handleUpdateLineShiftConfig = (
    lineId: string,
    field: 'targetUph' | 'plannedOeePct',
    value: number
  ) => {
    setLines((prev) => {
      const target = prev[lineId];
      if (!target) return prev;
      return {
        ...prev,
        [lineId]: {
          ...target,
          shiftConfig: {
            ...target.shiftConfig,
            [field]: value,
          },
        },
      };
    });
  };

  const handleAutoBalance = () => {
    const { updatedConfigs, uphAdjustmentsNeeded } = autoBalanceVsmConfigs(
      lines,
      vsmConfigs
    );
    setVsmConfigs(updatedConfigs);
    setPendingUphAdjustments(uphAdjustmentsNeeded);
  };

  const handleApplyUphUpgrades = () => {
    if (pendingUphAdjustments.length === 0) return;
    setLines((prev) => {
      const next = { ...prev };
      pendingUphAdjustments.forEach((adj) => {
        if (next[adj.lineId]) {
          next[adj.lineId] = {
            ...next[adj.lineId],
            shiftConfig: {
              ...next[adj.lineId].shiftConfig,
              targetUph: adj.requiredUph,
            },
          };
        }
      });
      return next;
    });
    setPendingUphAdjustments([]);
  };

  const handleResetVsm = () => {
    setVsmConfigs(INITIAL_VSM_CONFIGS);
    setPendingUphAdjustments([]);
  };

  const handleExportVsmCsv = () => {
    const headers = [
      'Line Code',
      'Line Name',
      'Role',
      'Part / Output',
      'Target UPH',
      'OEE (%)',
      'Net UPH',
      'Shifts/Day',
      'OT (hrs)',
      'Op Hours/Day',
      'Changeover (min)',
      'Transfer/Cure LT (min)',
      'Daily Capacity (units)',
      'Line A Alloc (%)',
      'Line B Alloc (%)',
      'Demand/Hr (units)',
      'Daily Demand (units)',
      'Daily Balance (+/-)',
      'Initial Buffer',
      'Head-Start (hrs)',
      'Min Buffer (24h)',
      'Safety Buffer Target',
      'First Shortage Time',
      'Status',
      'Recommended Action',
    ];

    const orderedEvals = [
      ...analysis.feederEvaluations,
      ...analysis.mainLineEvaluations,
    ];

    const rows = orderedEvals.map((ev) => [
      ev.shortCode,
      ev.lineName,
      ev.config.role === 'main_assembly'
        ? 'Main Assembly'
        : ev.config.role === 'sub_assembly_door'
        ? 'Door Sub-Assembly'
        : 'Upstream Molding/Parts',
      ev.config.partName,
      ev.grossUph,
      ev.oeePct,
      ev.netUph,
      ev.config.shiftsPerDay,
      ev.config.otHoursPerDay,
      ev.operatingHoursPerDay,
      ev.config.changeoverMinsPerDay,
      ev.config.transferLeadTimeMins,
      ev.dailyCapacityUnits,
      ev.config.allocationLineAPct,
      ev.config.allocationLineBPct,
      ev.totalDemandRatePerHr,
      ev.totalDailyDemand,
      ev.dailyBalance,
      ev.config.initialBufferStock,
      ev.config.headStartHours,
      ev.minBufferUnits,
      ev.safetyBufferUnits,
      ev.firstShortageClock || 'None (On-Time)',
      getStatusMeta(ev.status).label,
      ev.recommendedAction,
    ]);

    exportToCsv(
      `IE_VSM_Supply_Sync_${new Date().toISOString().slice(0, 10)}.csv`,
      headers,
      rows
    );
  };

  // Overall factory verdict banner style
  const overallMeta = getStatusMeta(analysis.overallStatus);

  // Prepare SVG chart bounds for selected feeder
  const timeline = selectedEval?.hourlyTimeline || [];
  const maxBufferVal = Math.max(
    100,
    selectedEval?.safetyBufferUnits || 100,
    ...timeline.map((p) => p.bufferEnd)
  );
  const minBufferVal = Math.min(0, ...timeline.map((p) => p.bufferEnd));
  const bufferSpan = Math.max(100, maxBufferVal - minBufferVal);
  const maxHourlyFlow = Math.max(
    50,
    ...timeline.map((p) => Math.max(p.supplyUnits, p.demandUnits))
  );

  // SVG coordinate helper (viewBox 800 x 230)
  const svgW = 800;
  const svgH = 220;
  const padL = 52;
  const padR = 20;
  const padT = 18;
  const padB = 28;
  const plotW = svgW - padL - padR;
  const plotH = svgH - padT - padB;

  const yForBuffer = (val: number) =>
    padT + ((maxBufferVal - val) / bufferSpan) * plotH;
  const xForHour = (idx: number) =>
    padL + (idx / Math.max(1, timeline.length - 1)) * plotW;

  const zeroY = yForBuffer(0);
  const safetyY = yForBuffer(selectedEval?.safetyBufferUnits || 0);

  const bufferLinePoints = timeline
    .map((pt, idx) => `${xForHour(idx).toFixed(1)},${yForBuffer(pt.bufferEnd).toFixed(1)}`)
    .join(' ');

  const hoveredPoint =
    hoveredHourIdx !== null && timeline[hoveredHourIdx]
      ? timeline[hoveredHourIdx]
      : null;

  const upstreamMoldingEvals = ['line-thermoforming', 'line-injection']
    .map((id) => analysis.evaluations[id])
    .filter(Boolean);
  const doorSubEvals = ['line-door-a', 'line-door-b', 'line-door-c']
    .map((id) => analysis.evaluations[id])
    .filter(Boolean);
  const mainAsmEvals = ['line-a', 'line-b']
    .map((id) => analysis.evaluations[id])
    .filter(Boolean);

  // Render a compact interactive VSM node card
  const renderVsmNodeCard = (ev: VsmNodeEvaluation, isMain: boolean = false) => {
    const statusInfo = getStatusMeta(ev.status);
    const isSelected = selectedFeederId === ev.config.lineId;

    return (
      <div
        key={ev.config.lineId}
        onClick={() => {
          if (!isMain) setSelectedFeederId(ev.config.lineId);
        }}
        className={`rounded-xl p-3.5 bg-slate-900/95 border transition-all ${
          !isMain ? 'cursor-pointer hover:bg-slate-800/80' : ''
        } ${
          isSelected && !isMain
            ? 'border-cyan-400 ring-1 ring-cyan-400/40 shadow-lg shadow-cyan-950/30'
            : statusInfo.cardBorder
        }`}
      >
        <div className="flex items-start justify-between gap-2 mb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: ev.color }}
              />
              <span className="text-xs font-bold text-white">
                {ev.shortCode}
              </span>
              <span className="text-[11px] text-slate-400 truncate max-w-[145px]">
                {ev.config.partName}
              </span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold ${statusInfo.badgeClass}`}
          >
            {statusInfo.icon}
            <span>{statusInfo.shortLabel}</span>
          </span>
        </div>

        {/* IE Data Box inside VSM node */}
        <div className="grid grid-cols-3 gap-1.5 bg-slate-950/90 border border-slate-800/90 rounded-lg p-2 text-[11px] font-mono tabular-nums">
          <div>
            <span className="text-[9px] text-slate-500 block font-sans">
              Net UPH
            </span>
            <span className="text-cyan-300 font-bold">{ev.netUph}</span>
            <span className="text-[9px] text-slate-500 ml-0.5">
              /{ev.grossUph}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block font-sans">
              {isMain ? 'Takt Time' : 'Demand/Hr'}
            </span>
            <span className="text-slate-200 font-bold">
              {isMain ? `${ev.taktTimeSec}s` : ev.totalDemandRatePerHr}
            </span>
          </div>
          <div>
            <span className="text-[9px] text-slate-500 block font-sans">
              {isMain ? 'Cap/Day' : 'Balance/Day'}
            </span>
            <span
              className={`font-bold ${
                isMain
                  ? 'text-emerald-300'
                  : ev.dailyBalance >= 0
                  ? 'text-emerald-400'
                  : 'text-rose-400'
              }`}
            >
              {isMain
                ? formatNumber(ev.dailyCapacityUnits)
                : `${ev.dailyBalance >= 0 ? '+' : ''}${formatNumber(
                    ev.dailyBalance
                  )}`}
            </span>
          </div>
        </div>

        {/* Bottom line: Shifts + Buffer/Lead Time */}
        <div className="mt-2.5 flex items-center justify-between text-[11px] text-slate-400 font-mono tabular-nums">
          <div className="flex items-center gap-2">
            <span>
              {ev.config.shiftsPerDay} กะ
              {ev.config.otHoursPerDay > 0
                ? `+OT${ev.config.otHoursPerDay}h`
                : ''}
            </span>
            <span className="text-slate-600">·</span>
            <span>LT {ev.config.transferLeadTimeMins}m</span>
          </div>
          {!isMain ? (
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-sans">WIP:</span>
              <span className="text-amber-300 font-bold">
                {formatNumber(ev.config.initialBufferStock)}
              </span>
              {ev.firstShortageClock && (
                <span className="text-rose-300 bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.2 rounded text-[10px]">
                  หมด {ev.firstShortageClock}
                </span>
              )}
            </div>
          ) : (
            <span className="text-cyan-400 font-sans">
              เป้าหมายส่งมอบหลัก
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 1. Top Verdict Banner & Action Toolbar */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <Workflow className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  Value Stream Mapping (VSM) — แผนประสานการส่ง Part จาก TF / Injection / Door สู่ Line A & B
                </h1>
                <p className="text-xs text-slate-400">
                  วิเคราะห์สมดุลกำลังผลิต ชั่วโมงเดินเครื่อง เวลา Transfer/Curing และสต็อกกันชน (Supermarket Buffer) ตลอด 24 ชม. เพื่อดูว่าส่ง Part ทันเวลาหรือไม่
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <button
              onClick={handleAutoBalance}
              className="px-3.5 py-2 text-xs font-bold bg-cyan-500 hover:bg-cyan-400 text-slate-950 rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              title="คำนวณกะงาน OT และ Buffer อัตโนมัติเพื่อให้ส่ง Part ทันเวลา"
            >
              <Sparkles className="w-4 h-4" />
              <span>ปรับแผนอัตโนมัติ (Auto-Balance Supply)</span>
            </button>
            <button
              onClick={handleResetVsm}
              className="px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>รีเซ็ตค่า VSM</span>
            </button>
            <button
              onClick={handleExportVsmCsv}
              className="px-3 py-2 text-xs font-semibold text-emerald-300 hover:text-emerald-200 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-500/35 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export VSM CSV</span>
            </button>
          </div>
        </div>

        {/* Pending UPH Upgrade Prompt after Auto-Balance */}
        {pendingUphAdjustments.length > 0 && (
          <div className="mt-4 p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5 text-xs">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <p className="font-bold text-amber-200">
                  ปรับเป็น 3 กะ (24 ชม.) แล้วยังมีไลน์ต้นน้ำที่ความเร็ว (UPH) ไม่ทันยอดใช้รวมของ Line A + Line B:
                </p>
                <p className="text-amber-300/90 font-mono">
                  {pendingUphAdjustments
                    .map(
                      (a) =>
                        `${analysis.evaluations[a.lineId]?.shortCode || a.lineId}: ${a.currentUph} → ${a.requiredUph} UPH`
                    )
                    .join(' · ')}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={handleApplyUphUpgrades}
                className="px-3 py-1.5 text-xs font-bold bg-amber-400 hover:bg-amber-300 text-slate-950 rounded-lg transition-colors cursor-pointer"
              >
                ปรับ Target UPH บน Line Data ทันที
              </button>
              <button
                onClick={() => setPendingUphAdjustments([])}
                className="px-2.5 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800 rounded-lg cursor-pointer"
              >
                ปิด
              </button>
            </div>
          </div>
        )}

        {/* Top KPI Summary Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-5">
          {/* Overall Delivery Verdict */}
          <div
            className={`sm:col-span-2 lg:col-span-2 rounded-xl p-3.5 border flex items-center justify-between gap-3 ${overallMeta.badgeClass}`}
          >
            <div className="flex items-start gap-2.5">
              <div className="mt-0.5">{overallMeta.icon}</div>
              <div>
                <span className="text-[10px] uppercase tracking-wider font-semibold opacity-85 block">
                  ผลการประเมินการส่งมอบ Part รวม (Factory Delivery Verdict)
                </span>
                <div className="text-sm font-bold text-white mt-0.5">
                  {analysis.overallStatus === 'ON_TIME'
                    ? 'ส่ง Part ทันเวลา 100% — ไลน์ A และ B เดินต่อเนื่องไม่สะดุด'
                    : analysis.overallStatus === 'AT_RISK'
                    ? 'ส่งทันเวลาแต่ Buffer เสี่ยงขาดช่วงพีค (ควรเพิ่มสต็อกกันชน)'
                    : `ส่งไม่ทันเวลา — พบ ${analysis.shortageCount} ไลน์เสี่ยงขาด Part จน Line Stop`}
                </div>
                <div className="text-[11px] mt-1 flex flex-wrap items-center gap-2 font-mono tabular-nums">
                  <span className="text-emerald-300">
                    ทันเวลา: {analysis.onTimeCount}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-amber-300">
                    เสี่ยงขาด: {analysis.atRiskCount}
                  </span>
                  <span className="text-slate-500">·</span>
                  <span className="text-rose-300">
                    ขาดสต็อก: {analysis.shortageCount}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Combined Main Assembly Demand */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Factory className="w-3.5 h-3.5 text-cyan-400" />
              ยอดใช้ Part รวม (Line A + B)
            </span>
            <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">
              {formatNumber(analysis.totalDailyDemandCombined)}{' '}
              <span className="text-xs font-normal text-slate-400">
                units/day
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
              A: {formatNumber(analysis.totalDailyDemandUnitsA)} · B:{' '}
              {formatNumber(analysis.totalDailyDemandUnitsB)}
            </div>
          </div>

          {/* Critical Path Lead Time */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              VSM Critical Lead Time
            </span>
            <div className="text-xl font-bold text-white font-mono tabular-nums mt-1">
              {analysis.totalLeadTimeHours}{' '}
              <span className="text-xs font-normal text-slate-400">hrs</span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono tabular-nums mt-0.5">
              Value-Added Time: {analysis.totalValueAddedSec} sec
            </div>
          </div>

          {/* Process Cycle Efficiency */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-3.5">
            <span className="text-[11px] text-slate-400 flex items-center gap-1.5">
              <Gauge className="w-3.5 h-3.5 text-emerald-400" />
              Process Cycle Efficiency (PCE)
            </span>
            <div className="text-xl font-bold text-cyan-300 font-mono tabular-nums mt-1">
              {analysis.processCycleEfficiencyPct}%
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              VA / Total Lead Time Ratio
            </div>
          </div>
        </div>
      </div>

      {/* 2. Visual End-to-End Value Stream Map (VSM) Diagram + Lead Time Ladder */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>แผนผังการไหลของวัสดุและข้อมูล (Value Stream Flow Map)</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              คลิกการ์ดในกลุ่ม Parts หรือ Door เพื่อดูกราฟจำลองระดับสต็อก 24 ชม. ด้านล่าง
            </p>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono tabular-nums">
            <Truck className="w-3.5 h-3.5 text-cyan-400" />
            <span>
              MRP Control Sync · Takt Line A:{' '}
              {analysis.evaluations['line-a']?.taktTimeSec || 0}s · Takt Line B:{' '}
              {analysis.evaluations['line-b']?.taktTimeSec || 0}s
            </span>
          </div>
        </div>

        {/* 3-Tier Flow Map */}
        <div className="grid grid-cols-1 lg:grid-cols-11 gap-3 items-stretch">
          {/* Tier 1: Upstream Molding & Parts (TF & Injection) */}
          <div className="lg:col-span-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-300">
                  1. Upstream Parts & Molding
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ต้นน้ำ (TF / Inj)
                </span>
              </div>
              <div className="space-y-2.5">
                {upstreamMoldingEvals.map((ev) => renderVsmNodeCard(ev, false))}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 flex items-center justify-between">
              <span>ส่งตรงเข้า Door & Main Line</span>
              <span className="font-mono text-purple-300">Supermarket #1</span>
            </div>
          </div>

          {/* Connector 1 -> 2 */}
          <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center text-slate-500 gap-1">
            <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 text-center">
              Kanban
              <br />
              Pull
            </div>
            <ArrowRight className="w-5 h-5 text-cyan-400" />
          </div>

          {/* Tier 2: Door Sub-Assembly (Door A, B, C) */}
          <div className="lg:col-span-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-300">
                  2. Door Sub-Assembly (A/B/C)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  กลางน้ำ (ประตู)
                </span>
              </div>
              <div className="space-y-2.5">
                {doorSubEvals.map((ev) => renderVsmNodeCard(ev, false))}
              </div>
            </div>
            <div className="text-[10px] text-slate-500 pt-1 border-t border-slate-800/80 flex items-center justify-between">
              <span>โฟม/ประกอบประตู (Curing + Move)</span>
              <span className="font-mono text-emerald-300">Supermarket #2</span>
            </div>
          </div>

          {/* Connector 2 -> 3 */}
          <div className="hidden lg:flex lg:col-span-1 flex-col items-center justify-center text-slate-500 gap-1">
            <div className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-[10px] font-mono text-slate-400 text-center">
              JIT
              <br />
              Feed
            </div>
            <ArrowRight className="w-5 h-5 text-cyan-400" />
          </div>

          {/* Tier 3: Main Assembly (Line A & Line B) */}
          <div className="lg:col-span-3 bg-slate-950/60 border border-slate-800 rounded-xl p-3 space-y-3 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-300">
                  3. Main Assembly (Customer)
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  ปลายน้ำ (Line A & B)
                </span>
              </div>
              <div className="space-y-2.5">
                {mainAsmEvals.map((ev) => renderVsmNodeCard(ev, true))}
              </div>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-[11px] space-y-1">
              <div className="flex items-center justify-between text-slate-400">
                <span>ความพร้อม Part ต้นน้ำรวม:</span>
                <span className="font-mono font-bold text-white">
                  {analysis.onTimeCount}/5 ไลน์ทันเวลา
                </span>
              </div>
              <p className="text-[10px] text-slate-400">
                {analysis.shortageCount > 0
                  ? 'ต้องปรับกะงาน/OT หรือ Buffer ของสายที่ขาด เพื่อป้องกัน Line A/B หยุดเดิน'
                  : 'ชิ้นส่วนทุกกลุ่มพร้อมจ่ายเข้าไลน์ประกอบหลักตามแผน'}
              </p>
            </div>
          </div>
        </div>

        {/* VSM Lead Time Timeline Ladder */}
        <div className="p-3.5 bg-slate-950/80 border border-slate-800 rounded-xl space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <span className="font-semibold text-slate-200">
              VSM Lead Time Ladder (Value-Added Processing vs. Wait & Transfer Time)
            </span>
            <div className="flex items-center gap-3 font-mono tabular-nums text-[11px]">
              <span className="text-emerald-400">
                VA Time: {analysis.totalValueAddedSec} sec
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-amber-300">
                NVA / Buffer & Transit: {analysis.totalLeadTimeHours} hrs
              </span>
              <span className="text-slate-600">|</span>
              <span className="text-cyan-300 font-bold">
                PCE: {analysis.processCycleEfficiencyPct}%
              </span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] font-mono tabular-nums">
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-purple-300 font-sans font-medium">
                TF / Injection Stage
              </span>
              <span className="text-slate-300">
                VA {analysis.evaluations['line-thermoforming']?.cycleTimeSec || 0}s · Wait{' '}
                {analysis.evaluations['line-thermoforming']?.bufferCoverageHours || 0}h + LT{' '}
                {analysis.evaluations['line-thermoforming']?.config.transferLeadTimeMins || 0}m
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-emerald-300 font-sans font-medium">
                Door Sub-Assembly Stage
              </span>
              <span className="text-slate-300">
                VA {analysis.evaluations['line-door-b']?.cycleTimeSec || 0}s · Wait{' '}
                {analysis.evaluations['line-door-b']?.bufferCoverageHours || 0}h + Cure{' '}
                {analysis.evaluations['line-door-b']?.config.transferLeadTimeMins || 0}m
              </span>
            </div>
            <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between">
              <span className="text-cyan-300 font-sans font-medium">
                Line A & B Assembly Stage
              </span>
              <span className="text-slate-300">
                VA {analysis.evaluations['line-b']?.cycleTimeSec || 0}s · Takt{' '}
                {analysis.evaluations['line-b']?.taktTimeSec || 0}s
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 24-Hour Material Supply vs Consumption & Buffer Simulator */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <PackageCheck className="w-4 h-4 text-cyan-400" />
              <span>
                จำลองระดับสต็อกกันชน 24 ชั่วโมง (24h Supermarket Buffer Curve Simulator)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              ตรวจจับเวลาที่สต็อกหน้าไลน์อาจหมดลง (First Shortage Time) โดยคำนวณทั้ง Delay จาก Transfer/Curing Lead Time และชั่วโมงเริ่มงานล่วงหน้า (Head-start)
            </p>
          </div>

          {/* Feeder Line Selector */}
          <div className="flex flex-wrap items-center gap-1.5">
            {analysis.feederEvaluations.map((ev) => {
              const isSelected = ev.config.lineId === selectedEval?.config.lineId;
              const sMeta = getStatusMeta(ev.status);
              return (
                <button
                  key={ev.config.lineId}
                  onClick={() => setSelectedFeederId(ev.config.lineId)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer border ${
                    isSelected
                      ? 'bg-cyan-500 text-slate-950 border-cyan-400 shadow-sm'
                      : 'bg-slate-950 text-slate-300 border-slate-800 hover:border-slate-700 hover:text-white'
                  }`}
                >
                  {!isSelected && sMeta.icon}
                  <span>{ev.shortCode}</span>
                </button>
              );
            })}
          </div>
        </div>

        {selectedEval && (
          <>
            {/* Selected Feeder Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 font-mono tabular-nums">
              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-sans block">
                  สมดุลรายชั่วโมง (Hourly)
                </span>
                <span
                  className={`text-base font-bold ${
                    selectedEval.hourlyBalance >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedEval.hourlyBalance >= 0 ? '+' : ''}
                  {selectedEval.hourlyBalance}/ชม.
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ผลิต {selectedEval.netUph} vs ใช้ {selectedEval.totalDemandRatePerHr}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-sans block">
                  สมดุลรายวัน (Daily)
                </span>
                <span
                  className={`text-base font-bold ${
                    selectedEval.dailyBalance >= 0
                      ? 'text-emerald-400'
                      : 'text-rose-400'
                  }`}
                >
                  {selectedEval.dailyBalance >= 0 ? '+' : ''}
                  {formatNumber(selectedEval.dailyBalance)}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  {formatNumber(selectedEval.dailyCapacityUnits)} vs{' '}
                  {formatNumber(selectedEval.totalDailyDemand)}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-sans block">
                  Min Buffer ในรอบ 24 ชม.
                </span>
                <span
                  className={`text-base font-bold ${
                    selectedEval.minBufferUnits < 0
                      ? 'text-rose-400'
                      : selectedEval.minBufferUnits < selectedEval.safetyBufferUnits
                      ? 'text-amber-300'
                      : 'text-emerald-400'
                  }`}
                >
                  {formatNumber(selectedEval.minBufferUnits)} ชิ้น
                </span>
                <span className="text-[10px] text-slate-500 block">
                  เกณฑ์ปลอดภัย ≥ {formatNumber(selectedEval.safetyBufferUnits)}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-sans block">
                  เวลาที่เริ่มขาดสต็อก
                </span>
                <span
                  className={`text-base font-bold ${
                    selectedEval.firstShortageClock
                      ? 'text-rose-400'
                      : 'text-emerald-400'
                  }`}
                >
                  {selectedEval.firstShortageClock || 'ไม่ขาด (ตลอดวัน)'}
                </span>
                <span className="text-[10px] text-slate-500 block">
                  Lead Time {selectedEval.config.transferLeadTimeMins} นาที
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3">
                <span className="text-[10px] text-slate-400 font-sans block">
                  สต็อกคงเหลือสิ้นวัน
                </span>
                <span
                  className={`text-base font-bold ${
                    selectedEval.endingBufferUnits >= 0
                      ? 'text-cyan-300'
                      : 'text-rose-400'
                  }`}
                >
                  {formatNumber(selectedEval.endingBufferUnits)} ชิ้น
                </span>
                <span className="text-[10px] text-slate-500 block">
                  ตั้งต้น {formatNumber(selectedEval.config.initialBufferStock)}
                </span>
              </div>

              <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-3 flex flex-col justify-center">
                <span className="text-[10px] text-slate-400 font-sans block mb-1">
                  สถานะการส่งมอบ
                </span>
                <span
                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold font-sans w-fit ${
                    getStatusMeta(selectedEval.status).badgeClass
                  }`}
                >
                  {getStatusMeta(selectedEval.status).icon}
                  <span>{getStatusMeta(selectedEval.status).shortLabel}</span>
                </span>
              </div>
            </div>

            {/* Actionable Diagnosis Box */}
            <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
              <div className="flex items-start gap-2">
                {getStatusMeta(selectedEval.status).icon}
                <div>
                  <span className="font-semibold text-white">
                    {selectedEval.lineName}:
                  </span>{' '}
                  <span className="text-slate-300">{selectedEval.statusReason}</span>
                </div>
              </div>
              <div className="text-cyan-300 font-medium shrink-0">
                คำแนะนำ IE: {selectedEval.recommendedAction}
              </div>
            </div>

            {/* SVG 24-Hour Curve & Hourly Bar Chart */}
            <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-4">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-[11px]">
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-3 h-0.5 bg-cyan-400 inline-block" />
                    ระดับสต็อก Buffer (ชิ้น)
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500/40 border border-emerald-400/60 inline-block" />
                    Supply มาถึงต่อชม.
                  </span>
                  <span className="flex items-center gap-1.5 text-slate-300">
                    <span className="w-2.5 h-2.5 rounded-sm bg-amber-500/35 border border-amber-400/60 inline-block" />
                    Demand ใช้ต่อชม.
                  </span>
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-3 h-0.5 border-t border-dashed border-rose-400 inline-block" />
                    เส้น 0 (Line Stop)
                  </span>
                </div>

                {hoveredPoint ? (
                  <div className="text-[11px] font-mono tabular-nums text-cyan-300 bg-slate-900 border border-slate-700 px-2.5 py-1 rounded-md">
                    {hoveredPoint.clockLabel} · Supply +{hoveredPoint.supplyUnits} · Demand -{hoveredPoint.demandUnits} · Buffer:{' '}
                    <span
                      className={
                        hoveredPoint.bufferEnd < 0
                          ? 'text-rose-400 font-bold'
                          : 'text-white font-bold'
                      }
                    >
                      {formatNumber(hoveredPoint.bufferEnd)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[11px] text-slate-500">
                    ชี้บนกราฟเพื่อดูตัวเลขรายชั่วโมง (08:00 – 07:00)
                  </span>
                )}
              </div>

              <div className="w-full overflow-x-auto">
                <svg
                  viewBox={`0 0 ${svgW} ${svgH}`}
                  className="w-full min-w-[640px] h-56 select-none"
                >
                  {/* Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((t, i) => {
                    const y = padT + t * plotH;
                    const val = Math.round(maxBufferVal - t * bufferSpan);
                    return (
                      <g key={i}>
                        <line
                          x1={padL}
                          y1={y}
                          x2={svgW - padR}
                          y2={y}
                          stroke="#1e293b"
                          strokeWidth={1}
                        />
                        <text
                          x={padL - 8}
                          y={y + 3}
                          textAnchor="end"
                          className="fill-slate-500 text-[10px] font-mono"
                        >
                          {val}
                        </text>
                      </g>
                    );
                  })}

                  {/* Zero Line (Shortage threshold) */}
                  {zeroY >= padT && zeroY <= padT + plotH && (
                    <g>
                      <line
                        x1={padL}
                        y1={zeroY}
                        x2={svgW - padR}
                        y2={zeroY}
                        stroke="#fb7185"
                        strokeWidth={1.5}
                        strokeDasharray="5 4"
                      />
                      <text
                        x={svgW - padR - 4}
                        y={zeroY - 4}
                        textAnchor="end"
                        className="fill-rose-400 text-[9px] font-mono"
                      >
                        0 (Line Stop)
                      </text>
                    </g>
                  )}

                  {/* Safety Buffer Target Line */}
                  {safetyY >= padT && safetyY <= padT + plotH && (
                    <line
                      x1={padL}
                      y1={safetyY}
                      x2={svgW - padR}
                      y2={safetyY}
                      stroke="#fbbf24"
                      strokeWidth={1}
                      strokeDasharray="3 3"
                    />
                  )}

                  {/* Hourly Supply & Demand faint background bars (bottom 35% scale) */}
                  {timeline.map((pt, idx) => {
                    const cx = xForHour(idx);
                    const sBarH = (pt.supplyUnits / maxHourlyFlow) * (plotH * 0.32);
                    const dBarH = (pt.demandUnits / maxHourlyFlow) * (plotH * 0.32);
                    const baseY = padT + plotH;
                    return (
                      <g key={`bars-${idx}`}>
                        <rect
                          x={cx - 8}
                          y={baseY - sBarH}
                          width={7}
                          height={sBarH}
                          rx={1.5}
                          fill="rgba(16, 185, 129, 0.35)"
                        />
                        <rect
                          x={cx + 1}
                          y={baseY - dBarH}
                          width={7}
                          height={dBarH}
                          rx={1.5}
                          fill="rgba(245, 158, 11, 0.35)"
                        />
                      </g>
                    );
                  })}

                  {/* Buffer Polyline */}
                  {bufferLinePoints && (
                    <polyline
                      fill="none"
                      stroke="#22d3ee"
                      strokeWidth={2.5}
                      strokeLinejoin="round"
                      strokeLinecap="round"
                      points={bufferLinePoints}
                    />
                  )}

                  {/* Interactive Points & X-axis labels */}
                  {timeline.map((pt, idx) => {
                    const cx = xForHour(idx);
                    const cy = yForBuffer(pt.bufferEnd);
                    const isShortage = pt.bufferEnd < 0;
                    const isRisk =
                      !isShortage &&
                      pt.bufferEnd < (selectedEval?.safetyBufferUnits || 0);
                    const dotColor = isShortage
                      ? '#fb7185'
                      : isRisk
                      ? '#fbbf24'
                      : '#22d3ee';
                    const isHovered = hoveredHourIdx === idx;

                    return (
                      <g
                        key={pt.hourIndex}
                        onMouseEnter={() => setHoveredHourIdx(idx)}
                        onMouseLeave={() => setHoveredHourIdx(null)}
                        className="cursor-crosshair"
                      >
                        {/* Hover column hitbox */}
                        <rect
                          x={cx - plotW / 48}
                          y={padT}
                          width={plotW / 24}
                          height={plotH}
                          fill={
                            isHovered
                              ? 'rgba(34, 211, 238, 0.08)'
                              : 'transparent'
                          }
                        />
                        <circle
                          cx={cx}
                          cy={cy}
                          r={isHovered ? 5 : isShortage ? 4 : 3}
                          fill={dotColor}
                          stroke="#020617"
                          strokeWidth={1.5}
                        />
                        {idx % 2 === 0 && (
                          <text
                            x={cx}
                            y={svgH - 8}
                            textAnchor="middle"
                            className="fill-slate-400 text-[10px] font-mono"
                          >
                            {pt.clockLabel}
                          </text>
                        )}
                      </g>
                    );
                  })}
                </svg>
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Interactive VSM Synchronization & Dispatch Matrix Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <span>
                ตารางปรับจูนแผน VSM รายสายการผลิต (Interactive Supply-Demand Sync Matrix)
              </span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              แก้ไขค่ากะงาน, OT, เวลาเปลี่ยนรุ่น (SMED), Transfer Lead Time, สัดส่วนป้อน Line A/B และ Buffer ได้โดยตรง — Target UPH และ OEE% จะซิงค์เข้าหน้า Master ทันที
            </p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3 sticky left-0 bg-slate-950 z-10">
                  สายการผลิต / Part
                </th>
                <th className="py-2.5 px-2 text-right">Target UPH</th>
                <th className="py-2.5 px-2 text-right">OEE %</th>
                <th className="py-2.5 px-2 text-right">Net UPH</th>
                <th className="py-2.5 px-2 text-center">กะ/วัน</th>
                <th className="py-2.5 px-2 text-right">OT (ชม.)</th>
                <th className="py-2.5 px-2 text-right">SMED (นาที)</th>
                <th className="py-2.5 px-2 text-right">Lead Time (นาที)</th>
                <th className="py-2.5 px-2 text-right">ป้อน A / B (%)</th>
                <th className="py-2.5 px-2 text-right">Buffer ตั้งต้น</th>
                <th className="py-2.5 px-2 text-right">Head-Start (ชม.)</th>
                <th className="py-2.5 px-2 text-right">กำลังผลิต/วัน</th>
                <th className="py-2.5 px-2 text-right">ยอดใช้/วัน</th>
                <th className="py-2.5 px-2 text-right">ผลต่าง (+/-)</th>
                <th className="py-2.5 px-3">สถานะส่งมอบ & จุดขาด</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
              {[...analysis.feederEvaluations, ...analysis.mainLineEvaluations].map(
                (ev) => {
                  const isMain = ev.config.role === 'main_assembly';
                  const statusMeta = getStatusMeta(ev.status);

                  return (
                    <tr
                      key={ev.config.lineId}
                      className={`hover:bg-slate-800/40 transition-colors ${
                        isMain ? 'bg-slate-950/40' : ''
                      }`}
                    >
                      <td className="py-2.5 px-3 sticky left-0 bg-slate-900/95 z-10 font-sans min-w-[190px]">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span
                                className="w-2 h-2 rounded-full shrink-0"
                                style={{ backgroundColor: ev.color }}
                              />
                              <span className="font-bold text-white">
                                {ev.shortCode}
                              </span>
                              {isMain && (
                                <span className="text-[9px] px-1.5 py-0.2 rounded bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                                  Main
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate max-w-[165px]">
                              {ev.config.partName}
                            </span>
                          </div>
                          {onNavigateToLine && (
                            <button
                              onClick={() =>
                                onNavigateToLine(ev.config.lineId, 'master')
                              }
                              title={`เปิดหน้า Master ของ ${ev.shortCode}`}
                              className="p-1 text-slate-500 hover:text-cyan-400 rounded cursor-pointer"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Target UPH (synced with lines) */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={10}
                          max={500}
                          value={ev.grossUph}
                          onChange={(e) =>
                            handleUpdateLineShiftConfig(
                              ev.config.lineId,
                              'targetUph',
                              Math.max(1, Number(e.target.value) || 0)
                            )
                          }
                          className="w-16 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-white focus:outline-none"
                        />
                      </td>

                      {/* OEE % */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={30}
                          max={100}
                          value={ev.oeePct}
                          onChange={(e) =>
                            handleUpdateLineShiftConfig(
                              ev.config.lineId,
                              'plannedOeePct',
                              Math.min(100, Math.max(10, Number(e.target.value) || 0))
                            )
                          }
                          className="w-14 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-white focus:outline-none"
                        />
                      </td>

                      {/* Net UPH */}
                      <td className="py-2 px-2 text-right font-bold text-cyan-300">
                        {ev.netUph}
                      </td>

                      {/* Shifts */}
                      <td className="py-2 px-2 text-center">
                        <select
                          value={ev.config.shiftsPerDay}
                          onChange={(e) =>
                            handleUpdateVsmNode(
                              ev.config.lineId,
                              'shiftsPerDay',
                              Number(e.target.value) as 1 | 2 | 3
                            )
                          }
                          className="bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-white focus:outline-none cursor-pointer"
                        >
                          <option value={1}>1 กะ</option>
                          <option value={2}>2 กะ</option>
                          <option value={3}>3 กะ</option>
                        </select>
                      </td>

                      {/* OT hours */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={8}
                          step={0.5}
                          value={ev.config.otHoursPerDay}
                          onChange={(e) =>
                            handleUpdateVsmNode(
                              ev.config.lineId,
                              'otHoursPerDay',
                              Math.max(0, Math.min(8, Number(e.target.value) || 0))
                            )
                          }
                          className="w-14 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-white focus:outline-none"
                        />
                      </td>

                      {/* Changeover Mins */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={240}
                          value={ev.config.changeoverMinsPerDay}
                          onChange={(e) =>
                            handleUpdateVsmNode(
                              ev.config.lineId,
                              'changeoverMinsPerDay',
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="w-14 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-white focus:outline-none"
                        />
                      </td>

                      {/* Transfer Lead Time Mins */}
                      <td className="py-2 px-2 text-right">
                        <input
                          type="number"
                          min={0}
                          max={480}
                          value={ev.config.transferLeadTimeMins}
                          onChange={(e) =>
                            handleUpdateVsmNode(
                              ev.config.lineId,
                              'transferLeadTimeMins',
                              Math.max(0, Number(e.target.value) || 0)
                            )
                          }
                          className="w-14 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-white focus:outline-none"
                        />
                      </td>

                      {/* Split A / B % */}
                      <td className="py-2 px-2 text-right">
                        {isMain ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <div className="flex items-center justify-end gap-1">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={ev.config.allocationLineAPct}
                              onChange={(e) =>
                                handleUpdateVsmNode(
                                  ev.config.lineId,
                                  'allocationLineAPct',
                                  Math.min(100, Math.max(0, Number(e.target.value) || 0))
                                )
                              }
                              className="w-12 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1 py-1 text-right text-white focus:outline-none"
                              title="สัดส่วนจ่าย Line A (%)"
                            />
                            <span className="text-slate-600">/</span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              value={ev.config.allocationLineBPct}
                              onChange={(e) =>
                                handleUpdateVsmNode(
                                  ev.config.lineId,
                                  'allocationLineBPct',
                                  Math.min(100, Math.max(0, Number(e.target.value) || 0))
                                )
                              }
                              className="w-12 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1 py-1 text-right text-white focus:outline-none"
                              title="สัดส่วนจ่าย Line B (%)"
                            />
                          </div>
                        )}
                      </td>

                      {/* Initial Buffer */}
                      <td className="py-2 px-2 text-right">
                        {isMain ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            step={10}
                            value={ev.config.initialBufferStock}
                            onChange={(e) =>
                              handleUpdateVsmNode(
                                ev.config.lineId,
                                'initialBufferStock',
                                Math.max(0, Number(e.target.value) || 0)
                              )
                            }
                            className="w-16 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-amber-300 focus:outline-none"
                          />
                        )}
                      </td>

                      {/* Head-Start Hours */}
                      <td className="py-2 px-2 text-right">
                        {isMain ? (
                          <span className="text-slate-500">—</span>
                        ) : (
                          <input
                            type="number"
                            min={0}
                            max={12}
                            step={0.5}
                            value={ev.config.headStartHours}
                            onChange={(e) =>
                              handleUpdateVsmNode(
                                ev.config.lineId,
                                'headStartHours',
                                Math.max(0, Math.min(12, Number(e.target.value) || 0))
                              )
                            }
                            className="w-14 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-white focus:outline-none"
                          />
                        )}
                      </td>

                      {/* Daily Capacity */}
                      <td className="py-2 px-2 text-right text-slate-200 font-semibold">
                        {formatNumber(ev.dailyCapacityUnits)}
                      </td>

                      {/* Daily Demand */}
                      <td className="py-2 px-2 text-right text-slate-300">
                        {formatNumber(ev.totalDailyDemand)}
                      </td>

                      {/* Daily Balance */}
                      <td
                        className={`py-2 px-2 text-right font-bold ${
                          isMain
                            ? 'text-slate-500'
                            : ev.dailyBalance >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }`}
                      >
                        {isMain
                          ? '—'
                          : `${ev.dailyBalance >= 0 ? '+' : ''}${formatNumber(
                              ev.dailyBalance
                            )}`}
                      </td>

                      {/* Status & Shortage Time */}
                      <td className="py-2 px-3 font-sans min-w-[180px]">
                        <div className="flex flex-col gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold w-fit ${statusMeta.badgeClass}`}
                          >
                            {statusMeta.icon}
                            <span>{statusMeta.label}</span>
                          </span>
                          {!isMain && ev.firstShortageClock && (
                            <span className="text-[10px] font-mono text-rose-300">
                              ขาดสต็อกเวลา {ev.firstShortageClock} (Min:{' '}
                              {formatNumber(ev.minBufferUnits)})
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                }
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Daily Shift Dispatch & Kanban Delivery Plan */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div>
          <h2 className="text-base font-bold text-white flex items-center gap-2">
            <Truck className="w-4 h-4 text-emerald-400" />
            <span>
              แผนรอบส่ง Part และขนาด Lot (Kanban Dispatch Cadence Plan)
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            กำหนดขนาด Lot ต่อคันเข็น (Pallet/Trolley) เพื่อคำนวณความถี่รอบการส่ง Part จาก TF, Injection และ Door เข้าสู่ไลน์ประกอบ A และ B
          </p>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-slate-950 text-slate-400 text-[10px] uppercase tracking-wider border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-3">สายส่ง Part</th>
                <th className="py-2.5 px-3">ชิ้นส่วนที่ส่ง</th>
                <th className="py-2.5 px-3 text-right">ใช้ป้อน Line A (ชิ้น/ชม.)</th>
                <th className="py-2.5 px-3 text-right">ใช้ป้อน Line B (ชิ้น/ชม.)</th>
                <th className="py-2.5 px-3 text-right">รวมอัตราการใช้/ชม.</th>
                <th className="py-2.5 px-3 text-right">ขนาด Lot (ชิ้น/คัน)</th>
                <th className="py-2.5 px-3 text-right">รอบส่งทุกๆ (นาที)</th>
                <th className="py-2.5 px-3 text-right">จำนวนเที่ยว/กะ (8 ชม.)</th>
                <th className="py-2.5 px-3">แนวทางปฏิบัติหน้างาน IE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 font-mono tabular-nums">
              {analysis.feederEvaluations.map((ev) => {
                const lotSize = Math.max(1, ev.config.lotSize || 40);
                const intervalMins =
                  ev.totalDemandRatePerHr > 0
                    ? Math.round((lotSize / ev.totalDemandRatePerHr) * 60)
                    : 0;
                const tripsPerShift =
                  ev.totalDemandRatePerHr > 0
                    ? Math.ceil((ev.totalDemandRatePerHr * 8) / lotSize)
                    : 0;

                return (
                  <tr key={ev.config.lineId} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 font-sans font-bold text-white">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ backgroundColor: ev.color }}
                        />
                        <span>{ev.shortCode}</span>
                      </div>
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300">
                      {ev.config.partName}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {ev.demandRateLineAPerHr}
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-300">
                      {ev.demandRateLineBPerHr}
                    </td>
                    <td className="py-2.5 px-3 text-right font-bold text-cyan-300">
                      {ev.totalDemandRatePerHr}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <input
                        type="number"
                        min={5}
                        max={500}
                        step={5}
                        value={ev.config.lotSize}
                        onChange={(e) =>
                          handleUpdateVsmNode(
                            ev.config.lineId,
                            'lotSize',
                            Math.max(1, Number(e.target.value) || 1)
                          )
                        }
                        className="w-16 bg-slate-950 border border-slate-700 focus:border-cyan-400 rounded px-1.5 py-1 text-right text-white focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-300 font-semibold">
                      ทุก {intervalMins} นาที
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-200">
                      {tripsPerShift} เที่ยว
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-300 max-w-xs">
                      <div className="flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                        <span>{ev.recommendedAction}</span>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
