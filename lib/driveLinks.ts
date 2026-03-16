// Persistenza link Drive separata dall'AppData (non va nell'Excel)
const KEY = 'pmo_drive_links';

export function getDriveLinks(): Record<string, string> {
  try {
    const raw = sessionStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  // Fallback a localStorage per persistenza tra sessioni
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export function setDriveLink(clientId: string, url: string) {
  const links = getDriveLinks();
  if (url.trim()) {
    links[clientId] = url.trim();
  } else {
    delete links[clientId];
  }
  try { sessionStorage.setItem(KEY, JSON.stringify(links)); } catch {}
  try { localStorage.setItem(KEY, JSON.stringify(links)); } catch {}
}

export function removeDriveLink(clientId: string) {
  setDriveLink(clientId, '');
}
