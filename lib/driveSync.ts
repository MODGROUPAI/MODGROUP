// Client-side Drive sync state
// Persiste in localStorage: token OAuth, file ID del tracker, ultimo sync

const KEY_TOKEN    = 'drive_token';
const KEY_FILE_ID  = 'drive_file_id';
const KEY_LAST_SYNC = 'drive_last_sync';
const KEY_ENABLED  = 'drive_sync_enabled';
const DEFAULT_FOLDER_ID = '1DRn8CQPBbDV4IIt4VG0kuWPm0tfROkFW';

function isBrowser() { return typeof window !== 'undefined'; }

export interface DriveToken {
  access_token: string;
  refresh_token: string;
  expiry_date: number;
}

export function getDriveToken(): DriveToken | null {
  if (!isBrowser()) return null;
  try {
    const raw = localStorage.getItem(KEY_TOKEN);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export function setDriveToken(token: DriveToken) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_TOKEN, JSON.stringify(token));
}

export function clearDriveToken() {
  if (!isBrowser()) return;
  localStorage.removeItem(KEY_TOKEN);
  localStorage.removeItem(KEY_FILE_ID);
  localStorage.removeItem(KEY_LAST_SYNC);
  localStorage.removeItem(KEY_ENABLED);
}

export function getDriveFileId(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEY_FILE_ID);
}

export function setDriveFileId(id: string) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_FILE_ID, id);
}

export function getLastSync(): string | null {
  if (!isBrowser()) return null;
  return localStorage.getItem(KEY_LAST_SYNC);
}

export function setLastSync(ts: string) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_LAST_SYNC, ts);
}

export function isSyncEnabled(): boolean {
  if (!isBrowser()) return false;
  return localStorage.getItem(KEY_ENABLED) === '1';
}

export function setSyncEnabled(v: boolean) {
  if (!isBrowser()) return;
  localStorage.setItem(KEY_ENABLED, v ? '1' : '0');
}

export function isTokenExpired(token: DriveToken): boolean {
  return Date.now() > token.expiry_date - 60_000; // 1 min di margine
}
