import React, { useState } from 'react';
import {
  LayoutDashboard,
  FileSpreadsheet,
  TrendingUp,
  GitCompare,
  SlidersHorizontal,
  BookOpen,
  Download,
  Printer,
  RotateCcw,
  Layers,
  ChevronDown,
  Check,
} from 'lucide-react';
import { LineId, LineData, LineSummaryMetrics } from '../types/manpower';
import { ALL_LINES_METADATA } from '../data/initialData';

export type ActiveTab =
  | 'dashboard'
  | 'summary'
  | 'master'
  | 'forecast'
  | 'plan_vs_actual'
  | 'balancing'
  | 'guide';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  activeLineId: LineId | string;
  setActiveLineId: (lineId: any) => void;
  onOpenExport: () => void;
  onResetData: () => void;
  lines?: Record<string, LineData>;
  lineSummaries?: Record<string, LineSummaryMetrics>;
  lineAName?: string;
  lineBName?: string;
  lineAUph?: number;
  lineBUph?: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeLineId,
  setActiveLineId,
  onOpenExport,
  onResetData,
  lines,
  lineSummaries,
  lineAName = 'RF Production Line A',
  lineBName = 'RF Production Line B',
  lineAUph,
  lineBUph,
}) => {
  const [isLineMenuOpen, setIsLineMenuOpen] = useState(false);

  const handlePrint = () => {
    window.print();
  };

  const navItems: { id: ActiveTab; label: string; badge?: string; icon: React.ReactNode }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard รวม',
      icon: <LayoutDashboard className="w-4 h-4 mr-1.5 inline" />,
    },
    {
      id: 'summary',
      label: 'สรุป Manpower (7 Lines)',
      badge: 'NEW',
      icon: <Layers className="w-4 h-4 mr-1.5 inline text-cyan-400" />,
    },
    {
      id: 'master',
      label: 'Master Manpower',
      icon: <FileSpreadsheet className="w-4 h-4 mr-1.5 inline" />,
    },
    {
      id: 'forecast',
      label: 'Monthly Forecast',
      icon: <TrendingUp className="w-4 h-4 mr-1.5 inline" />,
    },
    {
      id: 'plan_vs_actual',
      label: 'Plan vs Actual',
      icon: <GitCompare className="w-4 h-4 mr-1.5 inline" />,
    },
    {
      id: 'balancing',
      label: 'Line Balancing',
      icon: <SlidersHorizontal className="w-4 h-4 mr-1.5 inline" />,
    },
    {
      id: 'guide',
      label: 'IE Guide',
      icon: <BookOpen className="w-4 h-4 mr-1.5 inline" />,
    },
  ];

  // Active line metadata
  const currentMeta =
    ALL_LINES_METADATA.find((m) => m.id === activeLineId) || {
      id: activeLineId,
      name: lines?.[activeLineId]?.name || (activeLineId === 'line-a' ? lineAName : lineBName),
      shortCode: activeLineId,
      department: 'assembly',
      departmentName: 'สายการประกอบ',
      color: '#06b6d4',
      badgeBg: 'bg-cyan-500/10 border-cyan-500/30',
      badgeText: 'text-cyan-400',
      borderHover: 'hover:border-cyan-500/50',
      description: '',
    };

  const currentLineUph =
    lineSummaries?.[activeLineId]?.targetUph ??
    lines?.[activeLineId]?.shiftConfig?.targetUph ??
    (activeLineId === 'line-a' ? lineAUph : lineBUph);

  return (
    <header className="sticky top-0 z-40 bg-slate-950/90 backdrop-blur-md border-b border-slate-800/80 px-4 lg:px-8 py-2.5 no-print">
      <div className="max-w-7xl mx-auto flex flex-col xl:flex-row xl:items-center xl:justify-between gap-3">
        {/* Zone 1: Wordmark + Multi-Line Switcher */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-lg bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 font-mono font-bold text-sm shadow-sm">
              IE
            </div>
            <div>
              <span className="text-base font-bold tracking-tight text-white block">
                IE Manpower Master & Capacity Planner
              </span>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="text-slate-300 font-medium">
                  {activeTab === 'dashboard'
                    ? 'Plant Overview (7 Lines)'
                    : activeTab === 'summary'
                    ? 'สรุป Manpower ทุก Process Line'
                    : currentMeta.name}
                </span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-cyan-400 font-mono text-[11px]">7 Process Lines Active</span>
              </div>
            </div>
          </div>

          {/* Line Switcher Dropdown (Supports all 7 Process Lines) */}
          <div className="relative">
            <button
              onClick={() => setIsLineMenuOpen(!isLineMenuOpen)}
              className="flex items-center gap-2 px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-700/80 hover:border-cyan-500/50 rounded-lg text-xs font-semibold text-white transition-all shadow-sm cursor-pointer"
              title="สลับ Process Line ที่ต้องการดูหรือแก้ไข"
            >
              <span
                className="w-2.5 h-2.5 rounded-full inline-block"
                style={{ backgroundColor: currentMeta.color }}
              ></span>
              <span className="font-bold text-slate-200">{currentMeta.shortCode}</span>
              {currentLineUph !== undefined && (
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 border border-slate-700">
                  {currentLineUph} UPH
                </span>
              )}
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
            </button>

            {/* Dropdown Menu */}
            {isLineMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsLineMenuOpen(false)}
                ></div>
                <div className="absolute left-0 mt-2 w-72 rounded-xl bg-slate-900 border border-slate-700 shadow-2xl p-2 z-50 text-xs">
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-800 mb-1.5 flex items-center justify-between">
                    <span>เลือกสายการผลิต (7 Process Lines)</span>
                    <span className="text-cyan-400">IE Data</span>
                  </div>

                  {/* Group 1: Main Assembly */}
                  <div className="mb-2">
                    <span className="px-2 py-0.5 text-[10px] text-cyan-400 font-semibold uppercase block">
                      สายการประกอบหลัก (Main Assembly)
                    </span>
                    {ALL_LINES_METADATA.filter((m) => m.department === 'assembly').map((m) => {
                      const isSelected = activeLineId === m.id;
                      const uph = lineSummaries?.[m.id]?.targetUph ?? lines?.[m.id]?.shiftConfig?.targetUph;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setActiveLineId(m.id);
                            setIsLineMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-cyan-500/20 text-cyan-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: m.color }}
                            ></span>
                            <span>{m.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {uph && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded">
                                {uph} UPH
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Group 2: Door Lines */}
                  <div className="mb-2">
                    <span className="px-2 py-0.5 text-[10px] text-emerald-400 font-semibold uppercase block">
                      สายการผลิตประตู (Door Production)
                    </span>
                    {ALL_LINES_METADATA.filter((m) => m.department === 'door').map((m) => {
                      const isSelected = activeLineId === m.id;
                      const uph = lineSummaries?.[m.id]?.targetUph ?? lines?.[m.id]?.shiftConfig?.targetUph;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setActiveLineId(m.id);
                            setIsLineMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-500/20 text-emerald-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: m.color }}
                            ></span>
                            <span>{m.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {uph && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded">
                                {uph} UPH
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Group 3: Parts & Molding */}
                  <div>
                    <span className="px-2 py-0.5 text-[10px] text-purple-400 font-semibold uppercase block">
                      ขึ้นรูปและชิ้นส่วนพลาสติก (Parts & Molding)
                    </span>
                    {ALL_LINES_METADATA.filter((m) => m.department === 'parts').map((m) => {
                      const isSelected = activeLineId === m.id;
                      const uph = lineSummaries?.[m.id]?.targetUph ?? lines?.[m.id]?.shiftConfig?.targetUph;
                      return (
                        <button
                          key={m.id}
                          onClick={() => {
                            setActiveLineId(m.id);
                            setIsLineMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-purple-500/20 text-purple-300 font-semibold'
                              : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className="w-2 h-2 rounded-full inline-block"
                              style={{ backgroundColor: m.color }}
                            ></span>
                            <span>{m.name}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {uph && (
                              <span className="text-[10px] font-mono text-slate-400 bg-slate-950 px-1 py-0.5 rounded">
                                {uph} UPH
                              </span>
                            )}
                            {isSelected && <Check className="w-3.5 h-3.5 text-purple-400" />}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Zone 2: Navigation Links / Segmented Control */}
        <nav className="flex items-center gap-1 overflow-x-auto p-1 bg-slate-900/90 border border-slate-800 rounded-lg">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all whitespace-nowrap flex items-center cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500 text-slate-950 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && !isActive && (
                  <span className="ml-1.5 px-1 py-0.2 text-[9px] font-bold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Actions */}
        <div className="flex items-center gap-2 self-end xl:self-auto">
          <button
            onClick={onResetData}
            title="รีเซ็ตเป็นข้อมูลมาตรฐาน (Reset to Default)"
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800/70 border border-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handlePrint}
            title="พิมพ์รายงาน (Print / Save PDF)"
            className="px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Print Report</span>
          </button>
          <button
            onClick={onOpenExport}
            className="px-3.5 py-1.5 text-xs font-semibold text-slate-950 bg-cyan-400 hover:bg-cyan-300 rounded-lg transition-all shadow-sm flex items-center gap-1.5 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Excel</span>
          </button>
        </div>
      </div>
    </header>
  );
};

