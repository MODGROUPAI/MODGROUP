export function cn(...inputs: (string | undefined | null | false)[]): string {
  return inputs.filter(Boolean).join(' ');
}

export function formatDate(value: unknown): string {
  if (!value) return '—';
  const s = String(value).split('T')[0];
  if (!s.match(/^\d{4}-\d{2}-\d{2}$/)) return s;
  const [y, m, d] = s.split('-');
  return `${d}/${m}/${y}`;
}

// Restituisce la data locale come stringa ISO YYYY-MM-DD
// (evita il bug UTC di toISOString() che può dare "ieri" in fusi orari positivi)
export function localDateISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// Aggiunge N giorni a una data e restituisce la stringa ISO locale
export function addDaysISO(date: Date, days: number): string {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}
