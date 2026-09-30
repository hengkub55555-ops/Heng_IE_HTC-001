import React, { useState } from 'react';
import { StationData, LineSummaryMetrics, ShiftConfig } from '../types/manpower';
import { formatNumber, formatPct } from '../utils/ieCalculations';
import {
  SlidersHorizontal,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface LineBalanceTabProps {
  stations: StationData[];
  setStations: React.Dispatch<React.SetStateAction<StationData[]>>;
  summary: LineSummaryMetrics;
  shiftConfig: ShiftConfig;
}

export const LineBalanceTab: React.FC<LineBalanceTabProps> = ({
  stations,
  setStations,
  summary,
  shiftConfig,
}) => {
  // Target takt time reference (default matching target UPH -> 3600 / UPH)
  const initialTakt = summary.targetUph > 0 ? Number((3600 / summary.targetUph).toFixed(1)) : 23;
  const [targetTaktTime, setTargetTaktTime] = useState<number>(initialTakt);
  
  // Interactive Simulation: adjust cycle time or manpower of a station
  const [simulationStationId, setSimulationStationId] = useState<string>(stations[0]?.id || '');
  const [simulatedCtDelta, setSimulatedCtDelta] = useState<number>(-3); // reduce 3 sec via kaizen

  // Find max cycle time among stations
  const maxCt = Math.max(...stations.map((s) => s.cycleTimeSec), 1);
  const sumCt = stations.reduce((sum, s) => sum + s.cycleTimeSec, 0);
  const nStations = stations.length || 1;

  // Standard IE Line Balance Efficiency
  const lineBalanceEfficiency = Number(((sumCt / (nStations * maxCt)) * 100).toFixed(1));
  const balanceLoss = Number((100 - lineBalanceEfficiency).toFixed(1));

  // Smoothness Index: SI = sqrt( sum( (maxCt - CT_i)^2 ) )
  const smoothnessIndex = Number(
    Math.sqrt(stations.reduce((sum, s) => sum + Math.pow(maxCt - s.cycleTimeSec, 2), 0)).toFixed(1)
  );

  // Simulated metrics
  const simulatedStations = stations.map((s) => {
    if (s.id === simulationStationId) {
      return {
        ...s,
        cycleTimeSec: Math.max(5, s.cycleTimeSec + simulatedCtDelta),
      };
    }
    return s;
  });
  const simMaxCt = Math.max(...simulatedStations.map((s) => s.cycleTimeSec), 1);
  const simSumCt = simulatedStations.reduce((sum, s) => sum + s.cycleTimeSec, 0);
  const simLbe = Number(((simSumCt / (nStations * simMaxCt)) * 100).toFixed(1));
  const simUph = Math.round(3600 / simMaxCt);
  const uphDelta = simUph - summary.targetUph;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="pb-2 border-b border-slate-800">
        <h2 className="text-base font-bold text-white flex items-center gap-2">
          <SlidersHorizontal className="w-5 h-5 text-cyan-400" />
          <span>การวิเคราะห์สมดุลสายการผลิตและคอขวด (Line Balancing & Bottleneck Analysis)</span>
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          แผนภูมิแสดงเวลาการทำงานรอบการผลิต (Cycle Time) เทียบกับ Takt Time เพื่อค้นหาคอขวดและปรับเกลี่ยงาน (Yamazumi)
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">Line Balance Efficiency (LBE)</div>
          <div className="text-2xl font-bold font-mono text-emerald-400 tabular-nums">
            {lineBalanceEfficiency}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            เกณฑ์มาตรฐาน IE: $\ge$ 85% {lineBalanceEfficiency >= 85 ? '✅ ผ่าน' : '⚠️ ต้องปรับเกลี่ย'}
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">Balance Loss % (ความสูญเปล่า)</div>
          <div className="text-2xl font-bold font-mono text-amber-400 tabular-nums">
            {balanceLoss}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            เวลาสูญเสียจากการรอคอยงานในแต่ละสถานี
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">จุดคอขวดของสายผลิต (Bottleneck)</div>
          <div className="text-xl font-bold font-mono text-rose-400 tabular-nums truncate">
            {maxCt} วินาที
          </div>
          <div className="text-[11px] text-slate-300 truncate mt-1">
            ที่สถานี: {summary.bottleneckStationName}
          </div>
        </div>

        <div className="p-3.5 bg-slate-900/60 border border-slate-800 rounded-xl">
          <div className="text-slate-400 text-xs mb-1">Smoothness Index (SI)</div>
          <div className="text-2xl font-bold font-mono text-sky-400 tabular-nums">
            {smoothnessIndex}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            ยิ่งค่าน้อย ยิ่งกระจายภาระงานได้ราบรื่น
          </div>
        </div>
      </div>

      {/* Cycle Time vs Takt Time Yamazumi Chart */}
      <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-sm font-semibold text-white">
              แผนภาพเปรียบเทียบ Cycle Time แต่ละสถานี vs Takt Time
            </span>
            <p className="text-xs text-slate-400">
              สถานีที่แตะเส้นขีดจำกัด (เส้นสีแดง) คือคอขวดที่จำกัดความเร็วของทั้งไลน์ผลิต
            </p>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-emerald-400 font-medium">Target UPH:</span>
              <input
                type="number"
                min="20"
                max="300"
                value={targetTaktTime > 0 ? Math.round(3600 / targetTaktTime) : 110}
                onChange={(e) => {
                  const uph = parseInt(e.target.value) || 110;
                  setTargetTaktTime(Number((3600 / Math.max(1, uph)).toFixed(1)));
                }}
                className="w-16 bg-slate-950 border border-emerald-500/50 rounded-lg px-2 py-1 text-xs text-emerald-300 font-bold font-mono text-right"
                title="แก้ไข Target UPH ในหน้านี้เพื่อดูผลกระทบต่อ Takt Time"
              />
              <span className="text-xs text-slate-400 font-mono">UPH</span>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400">Target Takt Time:</span>
              <input
                type="number"
                min="5"
                max="60"
                step="0.5"
                value={targetTaktTime}
                onChange={(e) => setTargetTaktTime(parseFloat(e.target.value) || 23)}
                className="w-16 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-xs text-rose-400 font-bold font-mono text-right"
              />
              <span className="text-xs text-slate-500 font-mono">วินาที</span>
            </div>
          </div>
        </div>

        {/* SVG Yamazumi Chart */}
        <div className="h-64 w-full pt-4">
          {(() => {
            const chartH = 180;
            const chartW = 800;
            const barW = chartW / stations.length;
            const maxVal = Math.max(maxCt, targetTaktTime) * 1.25;

            return (
              <svg viewBox={`0 0 ${chartW} ${chartH + 40}`} className="w-full h-full overflow-visible">
                {/* Horizontal reference grid */}
                {[0.25, 0.5, 0.75, 1.0].map((r) => {
                  const y = chartH - (maxVal * r * chartH) / maxVal;
                  return (
                    <line
                      key={r}
                      x1="0"
                      y1={y}
                      x2={chartW}
                      y2={y}
                      stroke="#334155"
                      strokeDasharray="2 2"
                      strokeWidth="0.5"
                    />
                  );
                })}

                {/* Target Takt Time Line */}
                {(() => {
                  const taktY = chartH - (targetTaktTime / maxVal) * chartH;
                  return (
                    <g>
                      <line
                        x1="0"
                        y1={taktY}
                        x2={chartW}
                        y2={taktY}
                        stroke="#f43f5e"
                        strokeWidth="2"
                        strokeDasharray="4 2"
                      />
                      <text
                        x={chartW - 10}
                        y={taktY - 5}
                        textAnchor="end"
                        fontSize="10"
                        fill="#f43f5e"
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        Target Takt Time = {targetTaktTime}s
                      </text>
                    </g>
                  );
                })()}

                {/* Bars per Station */}
                {stations.map((st, i) => {
                  const barHeight = (st.cycleTimeSec / maxVal) * chartH;
                  const x = i * barW + barW * 0.15;
                  const w = barW * 0.7;
                  const y = chartH - barHeight;
                  const isBottleneck = st.cycleTimeSec === maxCt;

                  return (
                    <g key={st.id} className="group">
                      <rect
                        x={x}
                        y={y}
                        width={w}
                        height={barHeight}
                        rx="3"
                        className={`transition-all ${
                          isBottleneck
                            ? 'fill-rose-500'
                            : 'fill-cyan-500/80 group-hover:fill-cyan-400'
                        }`}
                      />

                      {/* CT Value on top of bar */}
                      <text
                        x={x + w / 2}
                        y={y - 6}
                        textAnchor="middle"
                        fontSize="10"
                        fill={isBottleneck ? '#fb7185' : '#e2e8f0'}
                        fontWeight="bold"
                        fontFamily="monospace"
                      >
                        {st.cycleTimeSec}s
                      </text>

                      {/* Station Label */}
                      <text
                        x={x + w / 2}
                        y={chartH + 16}
                        textAnchor="middle"
                        fontSize="9"
                        fill="#94a3b8"
                        fontFamily="sans-serif"
                      >
                        {st.name.length > 14 ? `${st.name.substring(0, 12)}..` : st.name}
                      </text>
                      <text
                        x={x + w / 2}
                        y={chartH + 28}
                        textAnchor="middle"
                        fontSize="8"
                        fill="#64748b"
                        fontFamily="monospace"
                      >
                        MP: {st.mpShiftA}
                      </text>
                    </g>
                  );
                })}
              </svg>
            );
          })()}
        </div>
      </div>

      {/* Interactive Kaizen / Line Re-balancing Simulator */}
      <div className="p-4 bg-slate-900/90 border border-cyan-500/30 rounded-xl space-y-4">
        <div className="flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white">
            แบบจำลองการไคเซ็นปรับเกลี่ยงาน (Line Re-balancing & Kaizen Simulator)
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          ทดลองลดรอบเวลาหรือโยกย้ายกำลังคนในจุดคอขวด เพื่อดูผลลัพธ์ของความเร็วสายการผลิต (UPH) และ Line Efficiency ทันที
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
          <div>
            <label className="block text-xs text-slate-400 mb-1">เลือกขั้นตอนที่จะปรับปรุง (Kaizen Target)</label>
            <select
              value={simulationStationId}
              onChange={(e) => setSimulationStationId(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:border-cyan-500"
            >
              {stations.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.no}. {s.name} (CT: {s.cycleTimeSec}s · MP: {s.mpShiftA})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">
              ปรับลด/เพิ่ม Cycle Time (วินาที):
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min="-15"
                max="15"
                step="0.5"
                value={simulatedCtDelta}
                onChange={(e) => setSimulatedCtDelta(parseFloat(e.target.value) || 0)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-amber-300 font-mono font-bold"
              />
              <span className="text-xs text-slate-500 font-mono whitespace-nowrap">s</span>
            </div>
          </div>

          <div className="p-3 bg-slate-950/70 border border-slate-800 rounded-lg flex flex-col justify-center">
            <span className="text-[11px] text-slate-400 block mb-0.5">ผลลัพธ์การจำลอง (Simulated Outcome):</span>
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold font-mono text-cyan-300">
                {simUph} UPH
              </span>
              <span
                className={`text-xs font-mono font-bold ${
                  uphDelta > 0 ? 'text-emerald-400' : uphDelta < 0 ? 'text-rose-400' : 'text-slate-400'
                }`}
              >
                ({uphDelta >= 0 ? `+${uphDelta}` : uphDelta} UPH)
              </span>
              <span className="text-xs text-slate-400">· LBE: {simLbe}%</span>
            </div>
          </div>
        </div>

        {/* Suggestion alert */}
        <div className="p-3 bg-cyan-950/30 border border-cyan-500/20 rounded-lg flex items-start gap-2 text-xs text-cyan-200">
          <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block text-cyan-100">ข้อเสนอแนะทางวิศวกรรม IE:</span>
            หากสามารถทำการไคเซ็นลดเวลาการประกอบชิ้นส่วน หรือกระจายงานบางส่วนจากสถานีที่เป็นคอขวด ({summary.bottleneckStationName}) จะสามารถปลดล็อกกำลังการผลิตของสายผลิตให้เร็วขึ้นได้โดยไม่ต้องลงทุนเพิ่ม!
          </div>
        </div>
      </div>
    </div>
  );
};
