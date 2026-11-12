import { LineData, PlanVsActualRecord } from '../types/manpower';
import { getAccessToken } from './googleAuth';

export interface DriveBackupMetadata {
  id: string;
  name: string;
  mimeType: string;
  size?: string;
  modifiedTime: string;
  createdTime: string;
  webViewLink?: string;
}

export interface IEManpowerBackupPayload {
  app: string;
  version: string;
  exportedAt: string;
  exportedBy?: string;
  lineCount: number;
  lines: Record<string, LineData>;
  planVsActualRecords: PlanVsActualRecord[];
  summaryInfo?: {
    totalDl: number;
    totalIdl: number;
    grandTotalMp: number;
  };
  notes?: string;
}

const DRIVE_API_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';

/**
 * List all IE Manpower backup files in Google Drive
 */
export async function listDriveBackups(): Promise<DriveBackupMetadata[]> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อเข้าถึง Google Drive');
  }

  const query = encodeURIComponent("name contains 'IE_Manpower' and trashed = false");
  const fields = encodeURIComponent('files(id, name, mimeType, size, modifiedTime, createdTime, webViewLink)');
  const url = `${DRIVE_API_URL}?q=${query}&fields=${fields}&orderBy=modifiedTime desc&pageSize=30`;

  const response = await fetch(url, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `เกิดข้อผิดพลาดในการดึงรายการไฟล์ (${response.status})`);
  }

  const data = await response.json();
  return (data.files || []) as DriveBackupMetadata[];
}

/**
 * Upload a new backup file to Google Drive using multipart upload
 */
export async function createDriveBackup(
  payload: IEManpowerBackupPayload,
  customFileName?: string
): Promise<DriveBackupMetadata> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อบันทึกไฟล์ลง Google Drive');
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 16);
  const fileName = customFileName?.trim()
    ? (customFileName.endsWith('.json') ? customFileName : `${customFileName}.json`)
    : `IE_Manpower_Backup_${timestamp}.json`;

  const metadata = {
    name: fileName,
    mimeType: 'application/json',
    description: `IE Manpower Planner Backup (${payload.lineCount} lines, Grand Total MP: ${payload.summaryInfo?.grandTotalMp || 'N/A'})`,
  };

  const fileContent = JSON.stringify(payload, null, 2);
  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    fileContent +
    closeDelim;

  const response = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,createdTime,webViewLink`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `เกิดข้อผิดพลาดในการอัปโหลด (${response.status})`);
  }

  return await response.json();
}

/**
 * Update an existing backup file in Google Drive (Overwrites content)
 */
export async function updateDriveBackup(
  fileId: string,
  payload: IEManpowerBackupPayload
): Promise<DriveBackupMetadata> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google');
  }

  const fileContent = JSON.stringify(payload, null, 2);

  const response = await fetch(`${DRIVE_UPLOAD_URL}/${fileId}?uploadType=media&fields=id,name,mimeType,size,modifiedTime,createdTime,webViewLink`, {
    method: 'PATCH',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=UTF-8',
    },
    body: fileContent,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `เกิดข้อผิดพลาดในการอัปเดตไฟล์ (${response.status})`);
  }

  return await response.json();
}

/**
 * Download and parse a backup file from Google Drive
 */
export async function downloadDriveBackup(fileId: string): Promise<IEManpowerBackupPayload> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อดาวน์โหลดข้อมูล');
  }

  const response = await fetch(`${DRIVE_API_URL}/${fileId}?alt=media`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `เกิดข้อผิดพลาดในการอ่านไฟล์ (${response.status})`);
  }

  const data = await response.json();
  if (!data || typeof data !== 'object') {
    throw new Error('รูปแบบไฟล์ไม่ถูกต้อง');
  }

  return data as IEManpowerBackupPayload;
}

/**
 * Delete a file in Google Drive
 */
export async function deleteDriveBackup(fileId: string): Promise<void> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('กรุณาลงชื่อเข้าใช้ Google เพื่อลบไฟล์');
  }

  const response = await fetch(`${DRIVE_API_URL}/${fileId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });

  if (!response.ok && response.status !== 204) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error?.message || `เกิดข้อผิดพลาดในการลบไฟล์ (${response.status})`);
  }
}
