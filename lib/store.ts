import type { AppData } from './types';

let _data: AppData | null = null;

function isBrowser() { return typeof window !== 'undefined'; }

export function setAppData(data: AppData) {
  _data = data;
  try { localStorage.setItem('pmo_data', JSON.stringify(data)); } catch {}
  if (isBrowser()) window.dispatchEvent(new CustomEvent('pmo:data_updated'));
}

export function getAppData(): AppData | null {
  if (_data) return _data;
  try {
    const raw = localStorage.getItem('pmo_data');
    if (raw) { _data = JSON.parse(raw) as AppData; return _data; }
  } catch {}
  return null;
}

export function updateAppData(partial: Partial<AppData>) {
  const current = getAppData();
  if (!current) return;
  setAppData({ ...current, ...partial });
}

export function clearAppData() {
  _data = null;
  try { localStorage.removeItem('pmo_data'); } catch {}
}
