/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  StationData,
  IndirectLaborRole,
  ShiftConfig,
  MonthlyForecastItem,
  PlanVsActualRecord,
  LineData,
  LineId,
  LineSummaryMetrics,
  VsmNodeConfig,
} from './types/manpower';
import {
  INITIAL_LINES,
  INITIAL_PLAN_VS_ACTUAL_RECORDS,
  INITIAL_VSM_CONFIGS,
} from './data/initialData';
import {
  calculateLineSummary,
  calculatePlantSummary,
  formatNumber,
} from './utils/ieCalculations';
import { Header, ActiveTab } from './components/Header';
import { SummaryDashboardTab } from './components/SummaryDashboardTab';
import { ManpowerSummaryView } from './components/ManpowerSummaryView';
import { VsmSupplyChainTab } from './components/VsmSupplyChainTab';
import { MasterSheetTab } from './components/MasterSheetTab';
import { MonthlyForecastTab } from './components/MonthlyForecastTab';
import { PlanVsActualTab } from './components/PlanVsActualTab';
import { LineBalanceTab } from './components/LineBalanceTab';
import { IEGuideTab } from './components/IEGuideModal';
import { ExportModal } from './components/ExportModal';
import { GoogleDriveBackupModal } from './components/GoogleDriveBackupModal';
import { User } from 'firebase/auth';
import { initAuth, getAccessToken } from './services/googleAuth';
import { upsertMasterDriveBackup } from './services/googleDriveService';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [activeLineId, setActiveLineId] = useState<LineId>('line-b');
  const [isExportOpen, setIsExportOpen] = useState(false);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState<boolean>(() => {
    return localStorage.getItem('ie_drive_autosave') === 'true';
  });
  const [autoSaveEdits, setAutoSaveEdits] = useState<boolean>(() => {
    return localStorage.getItem('ie_autosave_edits') !== 'false';
  });
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved' | 'error'>('saved');
  const [lastLocalSavedTime, setLastLocalSavedTime] = useState<string | null>(() => {
    return localStorage.getItem('ie_last_local_saved') || null;
  });
  const [lastSyncedTime, setLastSyncedTime] = useState<string | null>(() => {
    return localStorage.getItem('ie_drive_last_synced') || null;
  });
  const isInitialMountRef = useRef(true);

  // Track Google Auth on app load
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => {
        setCurrentUser(user);
      },
      () => {
        setCurrentUser(null);
      }
    );
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    localStorage.setItem('ie_drive_autosave', String(autoSaveEnabled));
  }, [autoSaveEnabled]);

  useEffect(() => {
    localStorage.setItem('ie_autosave_edits', String(autoSaveEdits));
  }, [autoSaveEdits]);

  useEffect(() => {
    if (lastSyncedTime) {
      localStorage.setItem('ie_drive_last_synced', lastSyncedTime);
    }
  }, [lastSyncedTime]);

  useEffect(() => {
    if (lastLocalSavedTime) {
      localStorage.setItem('ie_last_local_saved', lastLocalSavedTime);
    }
  }, [lastLocalSavedTime]);

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

  // VSM Supply Synchronization Plan across TF, Injection, Door A/B/C -> Line A & B
  const [vsmPlan, setVsmPlan] = useState<VsmNodeConfig[]>(() => {
    const saved = localStorage.getItem('ie_vsm_plan_v4');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error(e);
      }
    }
    return INITIAL_VSM_CONFIGS;
  });

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

  // Unified Auto-Save Edits Effect (LocalStorage immediate + debounced Drive Master sync when opted in)
  useEffect(() => {
    if (isInitialMountRef.current) {
      isInitialMountRef.current = false;
      return;
    }

    if (!autoSaveEdits) {
      setSaveStatus('unsaved');
      return;
    }

    localStorage.setItem('ie_multilines_v4', JSON.stringify(lines));
    localStorage.setItem('ie_pva_records_v4', JSON.stringify(planVsActualRecords));
    localStorage.setItem('ie_vsm_plan_v4', JSON.stringify(vsmPlan));
    const localTimeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastLocalSavedTime(localTimeStr);

    if (autoSaveEnabled && currentUser) {
      setSaveStatus('saving');
      const timer = setTimeout(async () => {
        try {
          const token = await getAccessToken();
          if (!token) {
            setSaveStatus('saved');
            return;
          }
          const payload = {
            app: 'IE Manpower Master & Capacity Planner',
            version: '4.1.0',
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser.email || 'Anonymous',
            lineCount: Object.keys(lines).length,
            lines,
            planVsActualRecords,
            vsmPlan,
            summaryInfo: {
              totalDl: plantSummary.totalPlantDl,
              totalIdl: plantSummary.totalPlantIdl,
              grandTotalMp: plantSummary.grandPlantTotalMp,
            },
            notes: 'Auto-saved edits from IE Manpower & VSM',
          };
          await upsertMasterDriveBackup(payload, 'IE_Manpower_Master.json');
          const syncStr = new Date().toLocaleTimeString('th-TH');
          setLastSyncedTime(syncStr);
          setSaveStatus('saved');
        } catch (err) {
          console.warn('Auto-save to Google Drive skipped or failed:', err);
          setSaveStatus('error');
        }
      }, 2500);
      return () => clearTimeout(timer);
    }

    setSaveStatus('saved');
  }, [lines, planVsActualRecords, vsmPlan, autoSaveEdits, autoSaveEnabled, currentUser, plantSummary]);

  // Explicit Save All trigger (Local storage + Google Drive Master upsert)
  const handleSaveAll = async () => {
    setSaveStatus('saving');
    localStorage.setItem('ie_multilines_v4', JSON.stringify(lines));
    localStorage.setItem('ie_pva_records_v4', JSON.stringify(planVsActualRecords));
    localStorage.setItem('ie_vsm_plan_v4', JSON.stringify(vsmPlan));
    const localTimeStr = new Date().toLocaleTimeString('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setLastLocalSavedTime(localTimeStr);

    if (autoSaveEnabled && currentUser) {
      try {
        const token = await getAccessToken();
        if (token) {
          const payload = {
            app: 'IE Manpower Master & Capacity Planner',
            version: '4.1.0',
            exportedAt: new Date().toISOString(),
            exportedBy: currentUser.email || 'Anonymous',
            lineCount: Object.keys(lines).length,
            lines,
            planVsActualRecords,
            vsmPlan,
            summaryInfo: {
              totalDl: plantSummary.totalPlantDl,
              totalIdl: plantSummary.totalPlantIdl,
              grandTotalMp: plantSummary.grandPlantTotalMp,
            },
            notes: 'Manual save & Master sync',
          };
          await upsertMasterDriveBackup(payload, 'IE_Manpower_Master.json');
          const nowStr = new Date().toLocaleTimeString('th-TH');
          setLastSyncedTime(nowStr);
        }
        setSaveStatus('saved');
      } catch (err) {
        console.warn('Save to Google Drive failed:', err);
        setSaveStatus('error');
      }
    } else {
      setSaveStatus('saved');
    }
  };

  const handleToggleAutoSaveEdits = () => {
    setAutoSaveEdits((prev) => {
      const next = !prev;
      if (next && saveStatus === 'unsaved') {
        setTimeout(() => {
          handleSaveAll();
        }, 0);
      }
      return next;
    });
  };

  // Reset to default dataset
  const handleConfirmResetData = () => {
    setLines(INITIAL_LINES);
    setPlanVsActualRecords(INITIAL_PLAN_VS_ACTUAL_RECORDS);
    setVsmPlan(INITIAL_VSM_CONFIGS);
    localStorage.removeItem('ie_multilines_v4');
    localStorage.removeItem('ie_multilines_v3');
    localStorage.removeItem('ie_pva_records_v4');
    localStorage.removeItem('ie_pva_records_v3');
    localStorage.removeItem('ie_vsm_plan_v4');
    setSaveStatus('saved');
    setConfirmResetOpen(false);
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
        onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
        isDriveConnected={!!currentUser}
        userEmail={currentUser?.email}
        onResetData={() => setConfirmResetOpen(true)}
        autoSaveEdits={autoSaveEdits}
        onToggleAutoSaveEdits={handleToggleAutoSaveEdits}
        saveStatus={saveStatus}
        lastSavedTime={lastLocalSavedTime}
        onManualSave={handleSaveAll}
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
            onOpenGoogleDrive={() => setIsDriveModalOpen(true)}
            isDriveConnected={!!currentUser}
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

        {/* 2.5 Value Stream Mapping (VSM) & Supply Synchronization Sheet */}
        {activeTab === 'vsm' && (
          <VsmSupplyChainTab
            lines={lines}
            setLines={setLines}
            vsmConfigs={vsmPlan}
            setVsmConfigs={setVsmPlan}
            onNavigateToLine={(lineId, targetTab) => {
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

      {/* Google Drive Persistent Backup & Restore Modal */}
      <GoogleDriveBackupModal
        isOpen={isDriveModalOpen}
        onClose={() => setIsDriveModalOpen(false)}
        lines={lines}
        setLines={setLines}
        planVsActualRecords={planVsActualRecords}
        setPlanVsActualRecords={setPlanVsActualRecords}
        vsmPlan={vsmPlan}
        setVsmPlan={setVsmPlan}
        plantSummary={plantSummary}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        autoSaveEnabled={autoSaveEnabled}
        setAutoSaveEnabled={setAutoSaveEnabled}
        lastSyncedTime={lastSyncedTime}
        setLastSyncedTime={setLastSyncedTime}
      />

      {/* Reset Confirmation Modal */}
      {confirmResetOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/40 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white">
              ยืนยันการรีเซ็ตข้อมูลมาตรฐาน IE (Reset to Default)
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              ต้องการรีเซ็ตข้อมูลทั้ง 7 Process Lines (Line A, B, Door A, B, C, Injection, Thermoforming), Plan vs Actual และแผน VSM กลับเป็นค่ามาตรฐาน IE หรือไม่?
            </p>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmResetOpen(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                ยกเลิก
              </button>
              <button
                onClick={handleConfirmResetData}
                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-xl text-xs font-bold cursor-pointer"
              >
                ยืนยันรีเซ็ตข้อมูล
              </button>
            </div>
          </div>
        </div>
      )}

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
