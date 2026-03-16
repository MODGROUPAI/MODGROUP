'use client';
import { storeSave, storeLoad } from '@/lib/storage';

import { useState, useEffect, useCallback } from 'react';
import { getAppData, updateAppData } from '@/lib/store';
import type { AppData } from '@/lib/types';

const EMPTY: AppData = {
  tasks: [], clients: [], leads: [], deals: [],
  noGo: [], hotelContacts: [],
  teamMembers: [
    { id:'tm_1', fullName:'Mattia Brumana',      lastName:'Brumana',  role:'CEO / SMM / Docente Re Model', colorHex:'#F26522', email:'m.brumana@modgroup.it',   phone:'', startDate:'', notes:'', isActive:true },
    { id:'tm_2', fullName:'Mario Valerio',        lastName:'Valerio',  role:'CEO / Founder',  colorHex:'#D4AF37', email:'mario@modgroup.it',        phone:'', startDate:'', notes:'', isActive:true },
    { id:'tm_3', fullName:'Valentina Maccarelli', lastName:'Maccarelli', role:'Senior Account', colorHex:'#3b9eff', email:'valentina@modgroup.it',  phone:'', startDate:'', notes:'', isActive:true },
    { id:'tm_4', fullName:'Evangelo',             lastName:'',         role:'Art Director',   colorHex:'#a855f7', email:'evangelo@modgroup.it',     phone:'', startDate:'', notes:'', isActive:true },
    { id:'tm_5', fullName:'Martina',              lastName:'',         role:'SMM / Graphic',  colorHex:'#22c55e', email:'martina@modgroup.it',      phone:'', startDate:'', notes:'', isActive:true },
  ],
  archivedProjects: [], suppliers: [], pipeline: [], timeLogs: [], templates: [], quotes: [], editorialContent: [],
};

export function useData() {
  const [data, setData] = useState<AppData>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  const refresh = useCallback(() => {
    const d = getAppData();
    setData(d ?? EMPTY);
    setLoaded(true);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener('focus', refresh);
    return () => window.removeEventListener('focus', refresh);
  }, [refresh]);

  const update = useCallback((partial: Partial<AppData>) => {
    updateAppData(partial);
    refresh();
  }, [refresh]);

  return { data, loaded, refresh, update };
}
