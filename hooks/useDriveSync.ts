'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import {
  getDriveToken, setDriveToken, getDriveFileId, setDriveFileId,
  getLastSync, setLastSync, isSyncEnabled, setSyncEnabled,
  isTokenExpired, clearDriveToken, type DriveToken,
} from '@/lib/driveSync';
import { getAppData, setAppData } from '@/lib/store';
import { parseXlsx } from '@/lib/xlsxParser';

const SYNC_INTERVAL_MS = 5 * 60 * 1000; // 5 minuti

export type SyncStatus = 'idle' | 'syncing' | 'ok' | 'error';

export interface UseDriveSyncReturn {
  isConnected: boolean;
  syncEnabled: boolean;
  lastSync: string | null;
  syncStatus: SyncStatus;
  syncError: string | null;
  connect: () => void;
  disconnect: () => void;
  toggleSync: (v: boolean) => void;
  pushNow: () => Promise<void>;
  pullNow: () => Promise<void>;
}

export function useDriveSync(onDataUpdated?: () => void): UseDriveSyncReturn {
  const [isConnected, setIsConnected]   = useState(false);
  const [syncEnabled, setSyncEnabledUI] = useState(false);
  const [lastSync, setLastSyncUI]       = useState<string | null>(null);
  const [syncStatus, setSyncStatus]     = useState<SyncStatus>('idle');
  const [syncError, setSyncError]       = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pushQueueRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Init da localStorage
  useEffect(() => {
    const token = getDriveToken();
    setIsConnected(!!token);
    setSyncEnabledUI(isSyncEnabled());
    setLastSyncUI(getLastSync());
  }, []);

  // Intercetta token dal redirect OAuth (?drive_token=...)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const tokenRaw   = params.get('drive_token');
    const driveError = params.get('drive_error');

    if (tokenRaw) {
      try {
        const token = JSON.parse(decodeURIComponent(tokenRaw)) as DriveToken;
        setDriveToken(token);
        setIsConnected(true);
        setSyncEnabled(true);
        setSyncEnabledUI(true);
        // Pulisci URL
        window.history.replaceState({}, '', '/');
        // Pull immediato
        setTimeout(() => pullNow(), 500);
      } catch { setSyncError('Token OAuth non valido'); }
    }
    if (driveError) {
      setSyncError(`Errore OAuth: ${driveError}`);
      window.history.replaceState({}, '', '/');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Ottieni token valido (refresh se scaduto)
  const getValidToken = useCallback(async (): Promise<DriveToken | null> => {
    let token = getDriveToken();
    if (!token) return null;
    if (isTokenExpired(token)) {
      try {
        const res = await fetch('/api/drive/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: token.refresh_token }),
        });
        if (!res.ok) throw new Error('Refresh fallito');
        const refreshed = await res.json();
        token = { ...token, ...refreshed } as DriveToken;
        setDriveToken(token);
      } catch {
        clearDriveToken();
        setIsConnected(false);
        setSyncEnabledUI(false);
        setSyncError('Sessione scaduta. Riconnetti Drive.');
        return null;
      }
    }
    return token;
  }, []);

  // PUSH — esporta e carica su Drive
  const pushNow = useCallback(async () => {
    const data = getAppData();
    if (!data) return;
    const token = await getValidToken();
    if (!token) return;

    setSyncStatus('syncing');
    try {
      // Genera xlsx via API export
      const exportRes = await fetch('/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!exportRes.ok) throw new Error('Export fallito');
      const blob    = await exportRes.blob();
      const fileId  = getDriveFileId();

      const form = new FormData();
      form.append('file', blob, 'PMO_MOD_Tracker.xlsx');
      form.append('accessToken',  token.access_token);
      form.append('refreshToken', token.refresh_token);
      if (fileId) form.append('fileId', fileId);

      const uploadRes = await fetch('/api/drive/upload', { method: 'POST', body: form });
      if (!uploadRes.ok) throw new Error('Upload fallito');
      const { fileId: newFileId } = await uploadRes.json();

      if (newFileId) setDriveFileId(newFileId);
      const ts = new Date().toLocaleTimeString('it-IT');
      setLastSync(ts);
      setLastSyncUI(ts);
      setSyncStatus('ok');
      setSyncError(null);
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Errore push');
    }
  }, [getValidToken]);

  // PULL — scarica da Drive e aggiorna app
  const pullNow = useCallback(async () => {
    const fileId = getDriveFileId();
    const token  = await getValidToken();
    if (!token || !fileId) return;

    setSyncStatus('syncing');
    try {
      const res = await fetch('/api/drive/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileId, accessToken: token.access_token, refreshToken: token.refresh_token }),
      });
      if (!res.ok) throw new Error('Download fallito');
      const buffer = await res.arrayBuffer();
      const data   = parseXlsx(buffer);
      setAppData(data);
      onDataUpdated?.();
      const ts = new Date().toLocaleTimeString('it-IT');
      setLastSync(ts);
      setLastSyncUI(ts);
      setSyncStatus('ok');
      setSyncError(null);
    } catch (err) {
      setSyncStatus('error');
      setSyncError(err instanceof Error ? err.message : 'Errore pull');
    }
  }, [getValidToken, onDataUpdated]);

  // Auto-push con debounce (chiamato dopo ogni modifica dati)
  const schedulePush = useCallback(() => {
    if (!isSyncEnabled() || !getDriveToken()) return;
    if (pushQueueRef.current) clearTimeout(pushQueueRef.current);
    pushQueueRef.current = setTimeout(() => pushNow(), 3000); // 3s debounce
  }, [pushNow]);

  // Polling pull ogni 5 minuti
  useEffect(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (!syncEnabled || !isConnected) return;

    intervalRef.current = setInterval(() => {
      pullNow();
    }, SYNC_INTERVAL_MS);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [syncEnabled, isConnected, pullNow]);

  // Patch store.setAppData per triggerare auto-push
  useEffect(() => {
    if (!syncEnabled || !isConnected) return;
    // Intercetta chiamate a setAppData tramite evento custom
    const handler = () => schedulePush();
    window.addEventListener('pmo:data_updated', handler);
    return () => window.removeEventListener('pmo:data_updated', handler);
  }, [syncEnabled, isConnected, schedulePush]);

  const connect    = useCallback(() => { window.location.href = '/api/drive/auth'; }, []);
  const disconnect = useCallback(() => { clearDriveToken(); setIsConnected(false); setSyncEnabledUI(false); setSyncError(null); }, []);
  const toggleSync = useCallback((v: boolean) => { setSyncEnabled(v); setSyncEnabledUI(v); }, []);

  return { isConnected, syncEnabled, lastSync, syncStatus, syncError, connect, disconnect, toggleSync, pushNow, pullNow };
}
