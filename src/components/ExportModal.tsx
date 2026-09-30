import React, { useState } from 'react';
import {
  LineData,
  LineSummaryMetrics,
  PlantSummaryMetrics,
  PlanVsActualRecord,
} from '../types/manpower';
import {
  exportToCsv,
  copyToExcelClipboard,
  calculateStationMetrics,
  calculateForecastItem,
} from '../utils/ieCalculations';
import {
  X,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  Printer,
  Layers,
} from 'lucide-react';

interface ExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: Record<string, LineData>;
  activeLineId: string;
  plantSummary: PlantSummaryMetrics;
  planVsActualRecords: PlanVsActualRecord[];
}

export const ExportModal: React.FC<ExportModalProps> = ({
  isOpen,
  onClose,
  lines,
  activeLineId,
  plantSummary,
  planVsActualRecords,
}) => {
  const [exportTarget, setExportTarget] = useState<'active' | 'both'>('active');
  const [copiedType, setCopiedType] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentLine = lines[activeLineId] || lines['line-b'] || Object.values(lines)[0];
  const currentSummary =
    plantSummary.lineSummaries?.[activeLineId] ||
    (activeLineId === 'line-a' ? plantSummary.lineASummary : plantSummary.lineBSummary);

  // 1. Export Master Manpower
  const handleExportMasterCsv = () => {
    const headers = [
      'Line',
      'No',
      'Detail (Process / Station)',
      'Category',
      'STD MP Shift-A',
      'STD MP Shift-B',
      'Total MP',
      'UPH',
      'CT (sec)',
      'UPPH',
      'Output/shift',
      'Notes',
    ];

    const rows: (string | number)[][] = [];

    const linesToExport = exportTarget === 'both' ? [lines['line-a'], lines['line-b']] : [currentLine];

    linesToExport.forEach((line) => {
      const summary = line.id === 'line-a' ? plantSummary.lineASummary : plantSummary.lineBSummary;

      // Stations
      line.stations.forEach((s) => {
        const m = calculateStationMetrics(s, line.shiftConfig.plannedOperatingHours);
        rows.push([
          line.name,
          s.no,
          s.name,
          s.category,
          s.mpShiftA,
          s.mpShiftB,
          s.mpShiftA + s.mpShiftB,
          s.uph,
          s.cycleTimeSec,
          m.finalUpph,
          m.finalOutputShift,
          s.notes || '',
        ]);
      });

      // Subtotal DL
      rows.push([
        line.name,
        '',
        `Total ${line.name} (DL)`,
        'DL',
        summary.totalDlShiftA,
        summary.totalDlShiftB,
        summary.totalDl,
        summary.targetUph,
        summary.bottleneckCt,
        summary.lineUpph,
        '',
        '',
      ]);

      // IDL
      line.idlRoles.forEach((r) => {
        rows.push([
          line.name,
          '',
          r.title,
          r.category,
          r.stdMp,
          '',
          r.stdMp,
          '',
          '',
          '',
          '',
          r.notes || '',
        ]);
      });

      rows.push([
        line.name,
        '',
        `SUM Total IDL (${line.name})`,
        'IDL',
        summary.totalIdl,
        '',
        summary.totalIdl,
        '',
        '',
        '',
        '',
        '',
      ]);

      // Spares
      rows.push([
        line.name,
        '',
        'Spare - Shift A',
        'DL',
        summary.spareShiftA,
        '',
        summary.spareShiftA,
        '',
        '',
        '',
        '',
        `${line.shiftConfig.spareMpPct}% buffer`,
      ]);
      rows.push([
        line.name,
        '',
        'Spare - Shift B',
        'DL',
        '',
        summary.spareShiftB,
        summary.spareShiftB,
        '',
        '',
        '',
        '',
        `${line.shiftConfig.spareMpPct}% buffer`,
      ]);

      rows.push([
        line.name,
        '',
        `Grand Total Manpower (${line.name})`,
        'TOTAL',
        '',
        '',
        summary.grandTotalMp,
        summary.targetUph,
        '',
        '',
        '',
        '',
      ]);

      rows.push([]); // blank separator
    });

    if (exportTarget === 'both') {
      rows.push([
        'FACTORY PLANT',
        '',
        'GRAND TOTAL FACTORY MANPOWER',
        'PLANT',
        plantSummary.totalPlantDlShiftA,
        plantSummary.totalPlantDlShiftB,
        plantSummary.grandPlantTotalMp,
        '',
        '',
        plantSummary.plantAverageUpph,
        '',
        'Line A + Line B Combined',
      ]);
    }

    const filename =
      exportTarget === 'both'
        ? 'Factory_All_Lines_Master_Manpower.csv'
        : `${currentLine.name.replace(/\s+/g, '_')}_Master_Manpower.csv`;

    exportToCsv(filename, headers, rows);
  };

  // 2. Export Monthly Forecast
  const handleExportForecastCsv = () => {
    const headers = [
      'Line',
      'Month Name',
      'Working Days',
      'Target Volume (units)',
      'Shift Mode',
      'OT Hours/Day',
      'Daily Target (units/day)',
      'Required UPH',
      'Takt Time (sec)',
      'Total Required DL',
      'Total Required IDL',
      'Total Required Spare',
      'Grand Total MP',
      'MP Delta vs Base',
      'Capacity Utilization %',
    ];

    const rows: (string | number)[][] = [];
    const linesToExport = exportTarget === 'both' ? [lines['line-a'], lines['line-b']] : [currentLine];

    linesToExport.forEach((line) => {
      const summary = line.id === 'line-a' ? plantSummary.lineASummary : plantSummary.lineBSummary;
      const calculatedMonths = line.forecastData.map((item) =>
        calculateForecastItem(
          item,
          line.stations,
          line.idlRoles,
          line.shiftConfig,
          summary.totalDlShiftA,
          summary.grandTotalMp
        )
      );

      calculatedMonths.forEach((m) => {
        rows.push([
          line.name,
          m.monthName,
          m.workingDays,
          m.targetMonthlyVolume,
          m.shiftMode,
          m.otHoursPerDay,
          m.dailyTargetVolume,
          m.requiredUph,
          m.taktTimeSec,
          m.totalRequiredDl,
          m.totalRequiredIdl,
          m.totalRequiredSpare,
          m.grandTotalMp,
          m.mpDeltaFromBase,
          `${m.capacityUtilizationPct}%`,
        ]);
      });
      rows.push([]);
    });

    const filename =
      exportTarget === 'both'
        ? 'Factory_All_Lines_Monthly_Forecast.csv'
        : `${currentLine.name.replace(/\s+/g, '_')}_Monthly_Forecast.csv`;

    exportToCsv(filename, headers, rows);
  };

  // 3. Export Plan vs Actual
  const handleExportPlanVsActualCsv = () => {
    const headers = [
      'Date',
      'Line',
      'Shift',
      'Plan Volume',
      'Actual Volume',
      'Achievement Rate %',
      'Plan DL MP',
      'Actual DL MP',
      'Plan Operating Hours',
      'Actual Hours + OT',
      'Plan UPPH',
      'Actual UPPH',
      'Line Breakdown (mins)',
      'Material Shortage (mins)',
      'Changeover (mins)',
      'Absenteeism Loss (mins)',
      'Speed Loss (mins)',
      'Other Loss (mins)',
      'Notes',
    ];

    const filteredRecords =
      exportTarget === 'both'
        ? planVsActualRecords
        : planVsActualRecords.filter((r) => r.lineId === activeLineId);

    const rows = filteredRecords.map((r) => {
      const achievePct = r.planVolume > 0 ? (r.actualVolume / r.planVolume) * 100 : 0;
      return [
        r.date,
        r.lineName,
        r.shift,
        r.planVolume,
        r.actualVolume,
        `${achievePct.toFixed(1)}%`,
        r.planDlMp,
        r.actualDlMp,
        r.planOperatingHours,
        r.actualOperatingHours + r.actualOtHours,
        r.planUpph,
        r.actualUpph,
        r.lineBreakdownMins,
        r.materialShortageMins,
        r.changeoverMins,
        r.absenteeismLossMins,
        r.speedLossMins,
        r.otherLossMins,
        r.notes || '',
      ];
    });

    exportToCsv('Plant_Plan_Vs_Actual_Report.csv', headers, rows);
  };

  const handleCopyClipboard = async (type: 'master' | 'forecast' | 'pva') => {
    let headers: string[] = [];
    let rows: (string | number)[][] = [];

    if (type === 'master') {
      headers = ['No', 'Detail', 'Cat', 'Shift-A', 'Shift-B', 'Total MP', 'UPH', 'CT (s)', 'UPPH'];
      rows = currentLine.stations.map((s) => {
        const m = calculateStationMetrics(s, currentLine.shiftConfig.plannedOperatingHours);
        return [s.no, s.name, s.category, s.mpShiftA, s.mpShiftB, s.mpShiftA + s.mpShiftB, s.uph, s.cycleTimeSec, m.finalUpph];
      });
    } else if (type === 'forecast') {
      headers = ['Month', 'Target Vol', 'Shift', 'Req UPH', 'Takt (s)', 'DL MP', 'IDL MP', 'Total MP'];
      const calculatedMonths = currentLine.forecastData.map((item) =>
        calculateForecastItem(
          item,
          currentLine.stations,
          currentLine.idlRoles,
          currentLine.shiftConfig,
          currentSummary.totalDlShiftA,
          currentSummary.grandTotalMp
        )
      );
      rows = calculatedMonths.map((m) => [m.monthName, m.targetMonthlyVolume, m.shiftMode, m.requiredUph, m.taktTimeSec, m.totalRequiredDl, m.totalRequiredIdl, m.grandTotalMp]);
    } else {
      headers = ['Date', 'Line', 'Shift', 'Plan Vol', 'Actual Vol', 'Plan MP', 'Actual MP', 'Act UPPH'];
      rows = planVsActualRecords.map((r) => [r.date, r.lineName, r.shift, r.planVolume, r.actualVolume, r.planDlMp, r.actualDlMp, r.actualUpph]);
    }

    const success = await copyToExcelClipboard(headers, rows);
    if (success) {
      setCopiedType(type);
      setTimeout(() => setCopiedType(null), 2500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-xl overflow-hidden shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
            <h3 className="text-base font-bold text-white">
              ส่งออกข้อมูล (Export to Excel / CSV / Print)
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scope selector */}
        <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
          <span className="text-xs text-slate-300 font-medium">ขอบเขตข้อมูลที่ต้องการส่งออก:</span>
          <div className="flex items-center gap-1 bg-slate-900 p-1 border border-slate-800 rounded-lg text-xs">
            <button
              onClick={() => setExportTarget('active')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                exportTarget === 'active'
                  ? 'bg-cyan-500 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              เฉพาะ {currentLine.name}
            </button>
            <button
              onClick={() => setExportTarget('both')}
              className={`px-3 py-1 rounded font-medium transition-colors ${
                exportTarget === 'both'
                  ? 'bg-emerald-400 text-slate-950 font-bold'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              รวมทั้งโรงงาน (Line A + Line B)
            </button>
          </div>
        </div>

        {/* Export Options Cards */}
        <div className="space-y-3">
          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                1. Master Manpower & Line Sheet
              </span>
              <span className="text-[11px] text-slate-400">
                ข้อมูลขั้นตอนการผลิต DL, IDL, Spare Buffer และ Cycle Time
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopyClipboard('master')}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedType === 'master' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'master' ? 'Copied!' : 'Copy TSV'}</span>
              </button>
              <button
                onClick={handleExportMasterCsv}
                className="px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                2. Monthly Forecast & Capacity Plan
              </span>
              <span className="text-[11px] text-slate-400">
                ตารางพยากรณ์ 12 เดือน, Takt Time, DL/IDL ที่ต้องใช้ และ Headcount Delta
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopyClipboard('forecast')}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedType === 'forecast' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'forecast' ? 'Copied!' : 'Copy TSV'}</span>
              </button>
              <button
                onClick={handleExportForecastCsv}
                className="px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>

          <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl flex items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-white block">
                3. Plan vs Actual & Loss Logs
              </span>
              <span className="text-[11px] text-slate-400">
                ประวัติผลผลิตจริง, ประสิทธิภาพ UPPH, และการแจกแจงเวลาสูญเสีย (Losses)
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={() => handleCopyClipboard('pva')}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                {copiedType === 'pva' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedType === 'pva' ? 'Copied!' : 'Copy TSV'}</span>
              </button>
              <button
                onClick={handleExportPlanVsActualCsv}
                className="px-3 py-1 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export CSV</span>
              </button>
            </div>
          </div>
        </div>

        {/* Direct Print Button */}
        <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
          <button
            onClick={() => {
              onClose();
              window.print();
            }}
            className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Printer className="w-4 h-4 text-cyan-400" />
            <span>พิมพ์รายงานฉบับเต็ม (Print / Save as PDF)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white cursor-pointer"
          >
            ปิด
          </button>
        </div>
      </div>
    </div>
  );
};
