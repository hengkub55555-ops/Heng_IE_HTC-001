/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  StationData,
  IndirectLaborRole,
  ShiftConfig,
  MonthlyForecastItem,
  PlanVsActualRecord,
  LineData,
  LineId,
  LineSummaryMetrics,
} from './types/manpower';
import {
  INITIAL_LINES,
  INITIAL_PLAN_VS_ACTUAL_RECORDS,
} from './data/initialData';
import {
  calculateLineSummary,
  calculatePlantSummary,
  formatNumber,
} from './utils/ieCalculations';
import { Header, ActiveTab } from './components/Header';
import { SummaryDashboardTab } from './components/SummaryDashboardTab';
import { ManpowerSummaryView } from './components/ManpowerSummaryView';
import { MasterSheetTab } from './components/MasterSheetTab';
import { MonthlyForecastTab } from './components/MonthlyForecastTab';
import { PlanVsActualTab } from './components/PlanVsActualTab';
import { LineBalanceTab } from './components/LineBalanceTab';
import { IEGuideTab } from './components/IEGuideModal';
import { ExportModal } from './components/ExportModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeLineId, setActiveLineId] = useState<LineId>('line-b');
  const [isExportOpen, setIsExportOpen] = useState(false);

  // All 7 process lines package (Line A, Line B, Door A, Door B, Door C, Injection Inhouse, Thermoforming)
  const [lines, setLines] = useState<Record<string, LineData>>(() => {
    const saved = localStorage.getItem('ie_multilines_v4') || localStorage.getItem('ie_multilines_v3');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Ensure all 7 lines from INITIAL_LINES are present even if previous storage only had Line A & B
        return { ...INITIAL_LINES, ...parsed };
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_LINES;
  });

  // Plan vs Actual Records (tagged with lineId)
  const [planVsActualRecords, setPlanVsActualRecords] = useState<PlanVsActualRecord[]>(() => {
    const saved = localStorage.getItem('ie_pva_records_v4') || localStorage.getItem('ie_pva_records_v3');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_PLAN_VS_ACTUAL_RECORDS;
  });

  // Persist state to LocalStorage
  useEffect(() => {
    localStorage.setItem('ie_multilines_v4', JSON.stringify(lines));
  }, [lines]);

  useEffect(() => {
    localStorage.setItem('ie_pva_records_v4', JSON.stringify(planVsActualRecords));
  }, [planVsActualRecords]);

  // Current active line object
  const currentLine = lines[activeLineId] || lines['line-b'] || Object.values(lines)[0];

  // Calculate summaries for all lines dynamically
  const allLineSummaries = useMemo(() => {
    const res: Record<string, LineSummaryMetrics> = {};
    Object.keys(lines).forEach((lId) => {
      const l = lines[lId];
      if (l) {
        res[lId] = calculateLineSummary(
          l.stations,
          l.idlRoles,
          l.shiftConfig,
          l.id,
          l.name
        );
      }
    });
    return res;
  }, [lines]);

  const lineASummary =
    allLineSummaries['line-a'] ||
    calculateLineSummary(
      lines['line-a']?.stations || [],
      lines['line-a']?.idlRoles || [],
      lines['line-a']?.shiftConfig || ({} as any),
      'line-a',
      lines['line-a']?.name || 'Line A'
    );

  const lineBSummary =
    allLineSummaries['line-b'] ||
    calculateLineSummary(
      lines['line-b']?.stations || [],
      lines['line-b']?.idlRoles || [],
      lines['line-b']?.shiftConfig || ({} as any),
      'line-b',
      lines['line-b']?.name || 'Line B'
    );

  // Plant-wide consolidated metrics across all 7 lines
  const plantSummary = useMemo(() => {
    return calculatePlantSummary(allLineSummaries);
  }, [allLineSummaries]);

  // Active line summary
  const currentSummary = allLineSummaries[activeLineId] || lineBSummary;

  // Active Line Setters for sub-components
  const setStations: React.Dispatch<React.SetStateAction<StationData[]>> = (valOrFn) => {
    setLines((prev) => {
      const target = prev[activeLineId] || prev['line-b'];
      const currentStations = target.stations;
      const nextStations = typeof valOrFn === 'function' ? valOrFn(currentStations) : valOrFn;
      return {
        ...prev,
        [target.id]: {
          ...target,
          stations: nextStations,
        },
      };
    });
  };

  const setIdlRoles: React.Dispatch<React.SetStateAction<IndirectLaborRole[]>> = (valOrFn) => {
    setLines((prev) => {
      const target = prev[activeLineId] || prev['line-b'];
      const currentIdl = target.idlRoles;
      const nextIdl = typeof valOrFn === 'function' ? valOrFn(currentIdl) : valOrFn;
      return {
        ...prev,
        [target.id]: {
          ...target,
          idlRoles: nextIdl,
        },
      };
    });
  };

  const setShiftConfig: React.Dispatch<React.SetStateAction<ShiftConfig>> = (valOrFn) => {
    setLines((prev) => {
      const target = prev[activeLineId] || prev['line-b'];
      const currentConf = target.shiftConfig;
      const nextConf = typeof valOrFn === 'function' ? valOrFn(currentConf) : valOrFn;
      return {
        ...prev,
        [target.id]: {
          ...target,
          shiftConfig: nextConf,
        },
      };
    });
  };

  const setForecastData: React.Dispatch<React.SetStateAction<Partial<MonthlyForecastItem>[]>> = (
    valOrFn
  ) => {
    setLines((prev) => {
      const target = prev[activeLineId] || prev['line-b'];
      const currentF = target.forecastData;
      const nextF = typeof valOrFn === 'function' ? valOrFn(currentF) : valOrFn;
      return {
        ...prev,
        [target.id]: {
          ...target,
          forecastData: nextF,
        },
      };
    });
  };

  const setLineName = (name: string) => {
    setLines((prev) => {
      const target = prev[activeLineId] || prev['line-b'];
      return {
        ...prev,
        [target.id]: {
          ...target,
          name,
        },
      };
    });
  };

  // Explicit Save All trigger
  const handleSaveAll = () => {
    localStorage.setItem('ie_multilines_v4', JSON.stringify(lines));
    localStorage.setItem('ie_pva_records_v4', JSON.stringify(planVsActualRecords));
  };

  // Reset to default dataset
  const handleResetData = () => {
    if (
      window.confirm(
        'ต้องการรีเซ็ตข้อมูลทั้ง 7 Process Lines (Line A, B, Door A, B, C, Injection, Thermoforming) เป็นค่ามาตรฐาน IE หรือไม่?'
      )
    ) {
      setLines(INITIAL_LINES);
      setPlanVsActualRecords(INITIAL_PLAN_VS_ACTUAL_RECORDS);
      localStorage.removeItem('ie_multilines_v4');
      localStorage.removeItem('ie_multilines_v3');
      localStorage.removeItem('ie_pva_records_v4');
      localStorage.removeItem('ie_pva_records_v3');
    }
  };

  // Switch line from Dashboard or Summary
  const handleSelectLineFromDashboard = (
    lineId: string,
    targetTab: ActiveTab = 'master'
  ) => {
    setActiveLineId(lineId);
    setActiveTab(targetTab);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeLineId={activeLineId}
        setActiveLineId={setActiveLineId}
        onOpenExport={() => setIsExportOpen(true)}
        onResetData={handleResetData}
        lines={lines}
        lineSummaries={allLineSummaries}
        lineAName={lines['line-a']?.name || 'Line A'}
        lineBName={lines['line-b']?.name || 'Line B'}
        lineAUph={lineASummary.targetUph}
        lineBUph={lineBSummary.targetUph}
      />

      {/* Print-Only Header */}
      <div className="hidden print-only p-6 border-b border-slate-300 mb-6 bg-white text-slate-900">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              รายงานวิเคราะห์และวางแผนกำลังคน (IE Manpower Master & Capacity Report)
            </h1>
            <p className="text-sm text-slate-600 mt-1">
              โรงงานผลิตเครื่องใช้ไฟฟ้า: {lines['line-a']?.name} & {lines['line-b']?.name} (7 Process Lines)
            </p>
          </div>
          <div className="text-right text-xs text-slate-500 font-mono">
            พิมพ์วันที่: {new Date().toLocaleDateString('th-TH')}
          </div>
        </div>
      </div>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-6">
        {/* 1. Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <SummaryDashboardTab
            lines={lines}
            setLines={setLines}
            plantSummary={plantSummary}
            planVsActualRecords={planVsActualRecords}
            setPlanVsActualRecords={setPlanVsActualRecords}
            onSelectLine={handleSelectLineFromDashboard}
            onSaveAll={handleSaveAll}
          />
        )}

        {/* 2. Manpower Summary View (Full 7 Lines Summary) */}
        {activeTab === 'summary' && (
          <ManpowerSummaryView
            lines={lines}
            plantSummary={plantSummary}
            onSelectLine={(lineId, targetTab) => {
              setActiveLineId(lineId);
              setActiveTab(targetTab || 'master');
            }}
          />
        )}

        {/* 3. Master Manpower Tab */}
        {activeTab === 'master' && (
          <MasterSheetTab
            stations={currentLine.stations}
            setStations={setStations}
            idlRoles={currentLine.idlRoles}
            setIdlRoles={setIdlRoles}
            shiftConfig={currentLine.shiftConfig}
            setShiftConfig={setShiftConfig}
            summary={currentSummary}
            lineName={currentLine.name}
            setLineName={setLineName}
          />
        )}

        {/* 4. Monthly Forecast Tab */}
        {activeTab === 'forecast' && (
          <MonthlyForecastTab
            stations={currentLine.stations}
            idlRoles={currentLine.idlRoles}
            shiftConfig={currentLine.shiftConfig}
            forecastData={currentLine.forecastData}
            setForecastData={setForecastData}
            summary={currentSummary}
            lines={lines}
            lineASummary={lineASummary}
            lineBSummary={lineBSummary}
            activeLineId={activeLineId}
            setActiveLineId={setActiveLineId}
          />
        )}

        {/* 5. Plan vs Actual Tab */}
        {activeTab === 'plan_vs_actual' && (
          <PlanVsActualTab
            records={planVsActualRecords}
            setRecords={setPlanVsActualRecords}
            activeLineId={activeLineId}
            lines={lines}
          />
        )}

        {/* 6. Line Balancing Tab */}
        {activeTab === 'balancing' && (
          <LineBalanceTab
            stations={currentLine.stations}
            setStations={setStations}
            summary={currentSummary}
            shiftConfig={currentLine.shiftConfig}
          />
        )}

        {/* 7. IE Standards Guide */}
        {activeTab === 'guide' && <IEGuideTab />}
      </main>

      {/* Export Modal */}
      <ExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        lines={lines}
        activeLineId={activeLineId}
        plantSummary={plantSummary}
        planVsActualRecords={planVsActualRecords}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 py-4 px-4 lg:px-8 text-center text-xs text-slate-500 no-print mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>IE Manpower Master & Capacity Planner · 7 Process Lines Integrated · IE Standards</span>
          <div className="flex items-center gap-3">
            <span>Plant DL: {plantSummary.totalPlantDl} คน</span>
            <span aria-hidden="true">·</span>
            <span>Plant IDL: {formatNumber(plantSummary.totalPlantIdl, 1)} คน</span>
            <span aria-hidden="true">·</span>
            <span>Grand Total: {formatNumber(plantSummary.grandPlantTotalMp, 1)} คน</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
