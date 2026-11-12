import React, { useState, useEffect } from 'react';
import {
  X,
  Cloud,
  CloudUpload,
  CloudDownload,
  RefreshCw,
  Trash2,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  HardDrive,
  ShieldCheck,
  LogOut,
  Sparkles,
  Database,
  ArrowRight,
  Sliders,
} from 'lucide-react';
import { User } from 'firebase/auth';
import {
  googleSignIn,
  googleSignOut,
  getAccessToken,
  initAuth,
} from '../services/googleAuth';
import {
  listDriveBackups,
  createDriveBackup,
  updateDriveBackup,
  downloadDriveBackup,
  deleteDriveBackup,
  DriveBackupMetadata,
  IEManpowerBackupPayload,
} from '../services/googleDriveService';
import { LineData, PlanVsActualRecord, PlantSummaryMetrics } from '../types/manpower';
import { formatNumber } from '../utils/ieCalculations';

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  lines: Record<string, LineData>;
  setLines: React.Dispatch<React.SetStateAction<Record<string, LineData>>>;
  planVsActualRecords: PlanVsActualRecord[];
  setPlanVsActualRecords: React.Dispatch<React.SetStateAction<PlanVsActualRecord[]>>;
  plantSummary: PlantSummaryMetrics;
  currentUser: User | null;
  setCurrentUser: (user: User | null) => void;
  autoSaveEnabled: boolean;
  setAutoSaveEnabled: (enabled: boolean) => void;
  lastSyncedTime: string | null;
  setLastSyncedTime: (time: string | null) => void;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  isOpen,
  onClose,
  lines,
  setLines,
  planVsActualRecords,
  setPlanVsActualRecords,
  plantSummary,
  currentUser,
  setCurrentUser,
  autoSaveEnabled,
  setAutoSaveEnabled,
  lastSyncedTime,
  setLastSyncedTime,
}) => {
  const [token, setToken] = useState<string | null>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [backups, setBackups] = useState<DriveBackupMetadata[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);
  const [backupNote, setBackupNote] = useState('');
  const [customName, setCustomName] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Confirmation modals
  const [confirmRestoreFile, setConfirmRestoreFile] = useState<DriveBackupMetadata | null>(null);
  const [confirmDeleteFile, setConfirmDeleteFile] = useState<DriveBackupMetadata | null>(null);

  // Monitor auth status
  useEffect(() => {
    if (!isOpen) return;

    getAccessToken().then((t) => {
      setToken(t);
      if (t) {
        fetchBackupList();
      }
    });

    const unsubscribe = initAuth(
      (user, t) => {
        setCurrentUser(user);
        setToken(t);
        fetchBackupList();
      },
      () => {
        // Not authenticated
      }
    );

    return () => unsubscribe();
  }, [isOpen]);

  const fetchBackupList = async () => {
    setIsLoadingBackups(true);
    setStatusMessage(null);
    try {
      const list = await listDriveBackups();
      setBackups(list);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err.message || 'ไม่สามารถดึงรายการไฟล์สำรองจาก Google Drive ได้', type: 'error' });
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const res = await googleSignIn();
      setCurrentUser(res.user);
      setToken(res.accessToken);
      setStatusMessage({ text: `เชื่อมต่อกับบัญชี ${res.user.email} เรียบร้อยแล้ว`, type: 'success' });
      await fetchBackupList();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err.message || 'การลงชื่อเข้าใช้ล้มเหลว กรุณาลองใหม่อีกครั้ง', type: 'error' });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSignOut();
      setCurrentUser(null);
      setToken(null);
      setBackups([]);
      setStatusMessage({ text: 'ออกจากระบบ Google Drive แล้ว', type: 'info' });
    } catch (err: any) {
      console.error(err);
    }
  };

  // Build the complete backup payload
  const buildPayload = (notes?: string): IEManpowerBackupPayload => {
    const lineKeys = Object.keys(lines);
    return {
      app: 'IE Manpower Master & Capacity Planner',
      version: '4.0.0',
      exportedAt: new Date().toISOString(),
      exportedBy: currentUser?.email || 'Anonymous',
      lineCount: lineKeys.length,
      lines,
      planVsActualRecords,
      summaryInfo: {
        totalDl: plantSummary.totalPlantDl,
        totalIdl: plantSummary.totalPlantIdl,
        grandTotalMp: plantSummary.grandPlantTotalMp,
      },
      notes: notes || backupNote,
    };
  };

  // Create new backup file on Google Drive
  const handleSaveToDrive = async (isMaster: boolean = false) => {
    setIsSaving(true);
    setStatusMessage(null);
    try {
      const payload = buildPayload();
      const fileName = isMaster
        ? 'IE_Manpower_Master.json'
        : customName.trim()
        ? customName.trim()
        : undefined;

      const created = await createDriveBackup(payload, fileName);
      const nowStr = new Date().toLocaleTimeString('th-TH');
      setLastSyncedTime(nowStr);
      setStatusMessage({
        text: `สำรองข้อมูลสำเร็จ! ไฟล์ "${created.name}" ถูกบันทึกลงใน Google Drive ของคุณเรียบร้อยแล้ว`,
        type: 'success',
      });
      setCustomName('');
      setBackupNote('');
      await fetchBackupList();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err.message || 'บันทึกข้อมูลไม่สำเร็จ', type: 'error' });
    } finally {
      setIsSaving(false);
    }
  };

  // Execute restore from Google Drive file
  const handleExecuteRestore = async () => {
    if (!confirmRestoreFile) return;

    setIsRestoring(true);
    setStatusMessage(null);
    try {
      const payload = await downloadDriveBackup(confirmRestoreFile.id);

      if (!payload.lines || typeof payload.lines !== 'object') {
        throw new Error('ไฟล์ที่เลือกไม่มีข้อมูลสายการผลิต (Invalid lines data)');
      }

      // Update state
      setLines(payload.lines);
      if (Array.isArray(payload.planVsActualRecords)) {
        setPlanVsActualRecords(payload.planVsActualRecords);
      }

      // Update LocalStorage for safety
      localStorage.setItem('ie_multilines_v4', JSON.stringify(payload.lines));
      if (Array.isArray(payload.planVsActualRecords)) {
        localStorage.setItem('ie_pva_records_v4', JSON.stringify(payload.planVsActualRecords));
      }

      const nowStr = new Date().toLocaleTimeString('th-TH');
      setLastSyncedTime(nowStr);
      setStatusMessage({
        text: `กู้คืนข้อมูลสำเร็จ! ข้อมูลสายการผลิต (${Object.keys(payload.lines).length} ไลน์) ถูกโหลดมาใช้งานในระบบแล้ว`,
        type: 'success',
      });
      setConfirmRestoreFile(null);
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err.message || 'กู้คืนข้อมูลไม่สำเร็จ', type: 'error' });
    } finally {
      setIsRestoring(false);
    }
  };

  // Execute delete backup from Google Drive
  const handleExecuteDelete = async () => {
    if (!confirmDeleteFile) return;

    try {
      await deleteDriveBackup(confirmDeleteFile.id);
      setStatusMessage({
        text: `ลบไฟล์ "${confirmDeleteFile.name}" ออกจาก Google Drive แล้ว`,
        type: 'info',
      });
      setConfirmDeleteFile(null);
      await fetchBackupList();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({ text: err.message || 'ลบไฟล์ไม่สำเร็จ', type: 'error' });
    }
  };

  // Download JSON locally (offline backup)
  const handleDownloadLocalJson = () => {
    const payload = buildPayload('Local Offline Backup');
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `IE_Manpower_Offline_Backup_${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-6">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500/20 via-cyan-500/20 to-blue-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-sm">
              <Cloud className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-white tracking-tight">
                  บันทึกและสำรองข้อมูลบน Google Drive (Persistent Cloud Storage)
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
                  Google Drive API
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                สำรองข้อมูล 7 Process Lines และประวัติการผลิตขึ้น Google Drive เพื่อให้เว็บบันทึกข้อมูลถาวรและเปิดใช้งานได้จากทุกที่
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Notification */}
        {statusMessage && (
          <div
            className={`px-5 py-3 border-b text-xs flex items-center justify-between ${
              statusMessage.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-500/30 text-emerald-300'
                : statusMessage.type === 'error'
                ? 'bg-rose-950/40 border-rose-500/30 text-rose-300'
                : 'bg-cyan-950/40 border-cyan-500/30 text-cyan-300'
            }`}
          >
            <div className="flex items-center gap-2">
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : statusMessage.type === 'error' ? (
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
              ) : (
                <Cloud className="w-4 h-4 text-cyan-400 shrink-0" />
              )}
              <span>{statusMessage.text}</span>
            </div>
            <button
              onClick={() => setStatusMessage(null)}
              className="text-slate-400 hover:text-white ml-2 text-xs"
            >
              ปิด
            </button>
          </div>
        )}

        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Section 1: Google Account Connection Card */}
          <div className="p-4 bg-slate-950/70 border border-slate-800 rounded-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5">
                {currentUser?.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google User'}
                    className="w-11 h-11 rounded-full border-2 border-cyan-500/50"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-bold">
                    {currentUser?.displayName ? currentUser.displayName[0].toUpperCase() : 'G'}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-white">
                      {currentUser ? currentUser.displayName || 'Google User' : 'ยังไม่ได้เชื่อมต่อ Google Drive'}
                    </span>
                    {currentUser && token ? (
                      <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-400">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        เชื่อมต่อแล้ว
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-400">
                        ออฟไลน์
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {currentUser?.email ? currentUser.email : 'เชื่อมต่อบัญชี Google ของคุณเพื่อบันทึกไฟล์ลงในไดรฟ์ส่วนตัวโดยตรง'}
                  </p>
                  {lastSyncedTime && (
                    <p className="text-[11px] text-cyan-400 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>ซิงค์ล่าสุดเวลา: {lastSyncedTime}</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Login / Logout Button */}
              <div className="flex items-center gap-2">
                {currentUser && token ? (
                  <button
                    onClick={handleSignOut}
                    className="px-3.5 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5 text-slate-400" />
                    <span>ออกจากระบบ</span>
                  </button>
                ) : (
                  /* Official Google Sign-In Button */
                  <button
                    onClick={handleSignIn}
                    disabled={isSigningIn}
                    className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs rounded-xl shadow-md transition-all flex items-center gap-2.5 cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                    <span>{isSigningIn ? 'กำลังเชื่อมต่อ...' : 'ลงชื่อเข้าใช้ด้วย Google (Sign in)'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Auto-Save Toggle */}
            {currentUser && token && (
              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-slate-300 font-medium">โหมดบันทึกอัตโนมัติ (Auto-Sync to Google Drive):</span>
                  <span className="text-[11px] text-slate-400">
                    เมื่อคุณกดบันทึกข้อมูลในระบบ ระบบจะอัปเดตไฟล์ Master บน Google Drive โดยอัตโนมัติ
                  </span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveEnabled}
                    onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-cyan-500"></div>
                </label>
              </div>
            )}
          </div>

          {/* Section 2: Create Backup */}
          <div className="p-4 bg-slate-950/60 border border-slate-800 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CloudUpload className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">
                  บันทึกข้อมูลขึ้น Google Drive (Backup Now)
                </h3>
              </div>
              <span className="text-[11px] font-mono text-cyan-400 bg-cyan-950/60 border border-cyan-500/30 px-2 py-0.5 rounded">
                7 Process Lines ({Object.keys(lines).length} สายการผลิต)
              </span>
            </div>

            <p className="text-xs text-slate-400">
              ระบบจะรวบรวมข้อมูลสถานีการผลิต (Stations), กำลังคนประจำกะ (DL กะ A/B), อัตราความเร็วเป้าหมาย (UPH), พนักงานสนับสนุน (IDL), ค่าเผื่อ (Spare), และข้อมูล Plan vs Actual ทั้ง 7 สายการผลิต บันทึกลงในไดรฟ์
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  ชื่อไฟล์กำหนดเอง (ถ้าเว้นว่างจะตั้งชื่อพร้อมเวลาอัตโนมัติ):
                </label>
                <input
                  type="text"
                  placeholder="เช่น IE_Backup_Q4_Final"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">
                  หมายเหตุ / บันทึกย่อ (Notes):
                </label>
                <input
                  type="text"
                  placeholder="เช่น ปรับปรุง UPH Line B และเพิ่มขั้นตอน Door C"
                  value={backupNote}
                  onChange={(e) => setBackupNote(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 focus:border-cyan-400 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <button
                onClick={() => handleSaveToDrive(false)}
                disabled={!token || isSaving}
                className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-40"
              >
                <CloudUpload className="w-4 h-4" />
                <span>{isSaving ? 'กำลังบันทึก...' : 'สร้างไฟล์สำรองใหม่ (Create Snapshot)'}</span>
              </button>

              <button
                onClick={() => handleSaveToDrive(true)}
                disabled={!token || isSaving}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-slate-700 hover:border-cyan-500/50 rounded-xl transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                title="บันทึกทับลงในไฟล์หลัก IE_Manpower_Master.json"
              >
                <Database className="w-4 h-4 text-cyan-400" />
                <span>บันทึกเป็นไฟล์ Master (IE_Manpower_Master.json)</span>
              </button>

              <button
                onClick={handleDownloadLocalJson}
                className="ml-auto px-3 py-2 text-xs text-slate-400 hover:text-white bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
                title="ดาวน์โหลดไฟล์ .json ลงเครื่องคอมพิวเตอร์ของคุณสำรองอีกชุด"
              >
                <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                <span>ดาวน์โหลดสำรองลงเครื่อง (Offline JSON)</span>
              </button>
            </div>
          </div>

          {/* Section 3: Cloud Backups List on Google Drive */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  รายการไฟล์สำรองบน Google Drive (Cloud Backups)
                </h3>
                <span className="text-xs text-slate-400">({backups.length} ไฟล์)</span>
              </div>
              <button
                onClick={fetchBackupList}
                disabled={!token || isLoadingBackups}
                className="px-2.5 py-1 text-xs text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                <span>รีเฟรช</span>
              </button>
            </div>

            {!token ? (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                <Cloud className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">กรุณาลงชื่อเข้าใช้ Google Drive เพื่อดูรายการไฟล์สำรองและกู้คืนข้อมูล</p>
                <button
                  onClick={handleSignIn}
                  className="mt-3 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-md inline-flex items-center gap-2 cursor-pointer"
                >
                  <span>ลงชื่อเข้าใช้ทันที</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : isLoadingBackups ? (
              <div className="p-8 text-center bg-slate-950/40 border border-slate-800 rounded-xl">
                <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin mx-auto mb-2" />
                <p className="text-xs text-slate-400">กำลังค้นหาไฟล์สำรองบน Google Drive ของคุณ...</p>
              </div>
            ) : backups.length === 0 ? (
              <div className="p-8 text-center bg-slate-950/40 border border-dashed border-slate-800 rounded-xl">
                <FileText className="w-8 h-8 text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-400">ยังไม่พบไฟล์สำรองบน Google Drive ของคุณ</p>
                <p className="text-[11px] text-slate-500 mt-1">คลิกปุ่ม &quot;สร้างไฟล์สำรองใหม่&quot; ด้านบนเพื่อเริ่มสำรองข้อมูลครั้งแรก</p>
              </div>
            ) : (
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-950 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">ชื่อไฟล์สำรอง</th>
                      <th className="py-2.5 px-3">วันที่แก้ไข / บันทึก</th>
                      <th className="py-2.5 px-3">ขนาดไฟล์</th>
                      <th className="py-2.5 px-3 text-right">การจัดการ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {backups.map((file) => {
                      const isMaster = file.name.includes('Master');
                      const dateStr = file.modifiedTime
                        ? new Date(file.modifiedTime).toLocaleString('th-TH')
                        : 'N/A';
                      const sizeKb = file.size
                        ? `${(parseInt(file.size) / 1024).toFixed(1)} KB`
                        : 'N/A';

                      return (
                        <tr key={file.id} className="hover:bg-slate-800/40 transition-colors">
                          <td className="py-2.5 px-3 font-sans">
                            <div className="flex items-center gap-2">
                              <FileText className={`w-4 h-4 shrink-0 ${isMaster ? 'text-amber-400' : 'text-cyan-400'}`} />
                              <div>
                                <span className="font-bold text-white block">
                                  {file.name}
                                </span>
                                {isMaster && (
                                  <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
                                    Primary Master File
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-300">
                            {dateStr}
                          </td>
                          <td className="py-2.5 px-3 text-slate-400">
                            {sizeKb}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 font-sans">
                              {/* Restore Button */}
                              <button
                                onClick={() => setConfirmRestoreFile(file)}
                                className="px-2.5 py-1 text-xs font-semibold bg-emerald-500/20 hover:bg-emerald-500 text-emerald-300 hover:text-slate-950 border border-emerald-500/30 rounded-lg transition-colors flex items-center gap-1 cursor-pointer"
                                title="กู้คืนข้อมูลจากไฟล์นี้มาใช้งาน"
                              >
                                <CloudDownload className="w-3.5 h-3.5" />
                                <span>กู้คืน (Restore)</span>
                              </button>

                              {/* View in Drive */}
                              {file.webViewLink && (
                                <a
                                  href={file.webViewLink}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                                  title="เปิดดูไฟล์ใน Google Drive"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                              )}

                              {/* Delete Backup Button */}
                              <button
                                onClick={() => setConfirmDeleteFile(file)}
                                className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
                                title="ลบไฟล์สำรองนี้"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
          <div className="flex items-center gap-2 text-[11px]">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>ความปลอดภัยระดับสูง: ข้อมูลถูกเก็บไว้บนบัญชี Google Drive ส่วนตัวของคุณโดยตรง</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl transition-colors cursor-pointer"
          >
            ปิดหน้าต่าง
          </button>
        </div>
      </div>

      {/* ============================================================== */}
      {/* ⚠️ EXPLICIT CONFIRMATION MODAL: RESTORE FROM DRIVE (MANDATORY)  */}
      {/* ============================================================== */}
      {confirmRestoreFile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-amber-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-amber-400">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">ยืนยันการกู้คืนข้อมูล (Confirm Restore)</h4>
                <p className="text-xs text-amber-300">ข้อมูลปัจจุบันจะถูกเขียนทับด้วยข้อมูลจากไฟล์สำรอง</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
              <div className="text-slate-400">
                ไฟล์ที่เลือก: <span className="text-white font-bold">{confirmRestoreFile.name}</span>
              </div>
              <div className="text-slate-400">
                บันทึกเมื่อ: <span className="text-slate-300">{new Date(confirmRestoreFile.modifiedTime).toLocaleString('th-TH')}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              คุณแน่ใจหรือไม่ว่าต้องการนำข้อมูลจากไฟล์สำรองนี้มาใช้งาน? ข้อมูลทั้ง 7 Process Lines (Line A, Line B, Door A, B, C, Injection, Thermoforming) และ Plan vs Actual จะถูกปรับปรุงให้ตรงกับข้อมูลในไฟล์นี้ทันที
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmRestoreFile(null)}
                disabled={isRestoring}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={handleExecuteRestore}
                disabled={isRestoring}
                className="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <CloudDownload className="w-4 h-4" />
                <span>{isRestoring ? 'กำลังโหลดข้อมูล...' : 'ยืนยันกู้คืนข้อมูล (Restore Now)'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* ⚠️ EXPLICIT CONFIRMATION MODAL: DELETE FROM DRIVE (MANDATORY)   */}
      {/* ============================================================== */}
      {confirmDeleteFile && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-sm">
          <div className="bg-slate-900 border border-rose-500/50 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/20 border border-rose-500/40 flex items-center justify-center">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-base font-bold text-white">ยืนยันการลบไฟล์สำรอง (Confirm Delete)</h4>
                <p className="text-xs text-rose-300">ไฟล์จะถูกลบออกจาก Google Drive อย่างถาวร</p>
              </div>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-1 font-mono">
              <div className="text-slate-400">
                ไฟล์ที่ต้องการลบ: <span className="text-white font-bold">{confirmDeleteFile.name}</span>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed font-sans">
              คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์สำรองนี้ออกจาก Google Drive? การกระทำนี้ไม่สามารถกู้คืนได้
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setConfirmDeleteFile(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                ยกเลิก (Cancel)
              </button>
              <button
                onClick={handleExecuteDelete}
                className="px-4 py-2 bg-rose-500 hover:bg-rose-400 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-4 h-4" />
                <span>ยืนยันลบไฟล์ (Delete Permanently)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
