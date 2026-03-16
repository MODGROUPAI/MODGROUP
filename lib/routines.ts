// ── Routine operative — companion silenzioso per ruolo ────────────────────────

import type { UserRole } from './roles';

export type RoutineFrequency = 'daily' | 'weekly_monday' | 'weekly_friday' | 'monthly';

export interface RoutineItem {
  id: string;
  emoji: string;
  text: string;
  description?: string;
  frequency: RoutineFrequency;
  createTask?: boolean;       // crea task nel tracker se spuntato
  category: 'check' | 'action' | 'review' | 'creative' | 'admin';
}

export interface RoleRoutine {
  role: UserRole;
  greetings: string[];        // messaggi mattutini con personalità
  weeklyKickoff: string[];    // lunedì mattina
  weeklyWrapup: string[];     // venerdì fine giornata
  monthlyReview: string[];    // inizio mese
  items: RoutineItem[];
}

const ROUTINES: Record<UserRole, RoleRoutine> = {

  ceo: {
    role: 'ceo',
    greetings: [
      "Buongiorno, Direttore. I numeri ti aspettano ☕",
      "Un nuovo giorno, nuove opportunità per MOD Group 🚀",
      "Il team è pronto. Sei pronto anche tu? 📊",
      "Buongiorno! La pipeline non si gestisce da sola 😄",
    ],
    weeklyKickoff: [
      "Settimana nuova, opportunità nuove. Controlla il forecast prima di tutto 📈",
      "Lunedì — il momento migliore per fare il punto sulla pipeline 💼",
    ],
    weeklyWrapup: [
      "Venerdì! Come è andata la settimana? Dai un'occhiata ai KPI prima del weekend 🎯",
      "Fine settimana — 5 minuti per chiudere i loop aperti e partire bene lunedì ✅",
    ],
    monthlyReview: [
      "Nuovo mese! Momento perfetto per rivedere forecast e redditività 💰",
    ],
    items: [
      // Daily
      { id:'ceo_d1', emoji:'📊', text:'KPI clienti', description:'Semaforo rapido — chi ha bisogno di attenzione oggi', frequency:'daily', category:'check' },
      { id:'ceo_d2', emoji:'⚠️', text:'Task in ritardo', description:'Controlla se ci sono blocchi operativi da sbloccare', frequency:'daily', category:'check' },
      { id:'ceo_d3', emoji:'💬', text:'Aggiornamento team', description:'Un messaggio rapido al team per allineare le priorità', frequency:'daily', category:'action' },
      // Weekly Monday
      { id:'ceo_w1', emoji:'💰', text:'Revisione pipeline', description:'Aggiorna le probabilità dei lead in corso', frequency:'weekly_monday', category:'review', createTask:true },
      { id:'ceo_w2', emoji:'📈', text:'Forecast ricavi', description:'Controlla la proiezione del mese in corso', frequency:'weekly_monday', category:'review' },
      { id:'ceo_w3', emoji:'👥', text:'Workload team', description:'Verifica che nessuno sia sovraccarico', frequency:'weekly_monday', category:'check' },
      // Weekly Friday
      { id:'ceo_f1', emoji:'🎯', text:'Chiusura lead caldi', description:'Segui up sui preventivi inviati questa settimana', frequency:'weekly_friday', category:'action', createTask:true },
      { id:'ceo_f2', emoji:'📋', text:'Report settimana', description:'5 righe di summary per avere memoria della settimana', frequency:'weekly_friday', category:'admin' },
      // Monthly
      { id:'ceo_m1', emoji:'📑', text:'Rinnovo retainer', description:'Controlla i contratti in scadenza entro 30 giorni', frequency:'monthly', category:'admin', createTask:true },
      { id:'ceo_m2', emoji:'📊', text:'Report mensile clienti', description:'Avvia la generazione dei report per tutti i clienti attivi', frequency:'monthly', category:'review', createTask:true },
    ],
  },

  account: {
    role: 'account',
    greetings: [
      "Buongiorno! I tuoi clienti ti aspettano ☀️",
      "Giornata nuova, relazioni da coltivare 🤝",
      "Pronti a fare la differenza per i clienti oggi? 💪",
      "Buongiorno! Controlla prima le scadenze, poi il caffè ☕😄",
    ],
    weeklyKickoff: [
      "Lunedì — inizia la settimana con un check su tutti i clienti attivi 👀",
      "Nuova settimana! Pianifica le riunioni e allinea le aspettative coi clienti 📅",
    ],
    weeklyWrapup: [
      "Venerdì! Hai risposto a tutti i clienti? Controlla prima di staccare 📨",
      "Fine settimana — aggiorna lo stato dei progetti e chiudi i loop aperti ✅",
    ],
    monthlyReview: [
      "Inizio mese — pianifica le riunioni mensili con tutti i clienti attivi 🗓",
    ],
    items: [
      // Daily
      { id:'acc_d1', emoji:'📅', text:'Scadenze oggi', description:'Cosa va consegnato o approvato entro oggi', frequency:'daily', category:'check' },
      { id:'acc_d2', emoji:'💬', text:'Messaggi clienti', description:'Rispondi ai messaggi WhatsApp/email in sospeso', frequency:'daily', category:'action' },
      { id:'acc_d3', emoji:'✅', text:'Approvazioni pending', description:'Contenuti che aspettano risposta del cliente', frequency:'daily', category:'check' },
      { id:'acc_d4', emoji:'📝', text:'Aggiorna note cliente', description:'Annota gli aggiornamenti dalle conversazioni di oggi', frequency:'daily', category:'admin' },
      // Weekly Monday
      { id:'acc_w1', emoji:'🗓', text:'Brief riunioni settimana', description:'Prepara i brief pre-riunione con AI per ogni cliente', frequency:'weekly_monday', category:'action', createTask:true },
      { id:'acc_w2', emoji:'👥', text:'Semaforo clienti', description:'Controlla lo stato di salute di ogni cliente', frequency:'weekly_monday', category:'check' },
      { id:'acc_w3', emoji:'📤', text:'Piano editoriale settimana', description:'Verifica che tutti i contenuti della settimana siano approvati', frequency:'weekly_monday', category:'review' },
      // Weekly Friday
      { id:'acc_f1', emoji:'📊', text:'Update stato progetti', description:'Aggiorna lo stato di ogni commessa attiva', frequency:'weekly_friday', category:'admin' },
      { id:'acc_f2', emoji:'🔔', text:'Notifiche clienti', description:'Invia update settimanale ai clienti che lo richiedono', frequency:'weekly_friday', category:'action', createTask:true },
      // Monthly
      { id:'acc_m1', emoji:'🗓', text:'Pianifica riunioni mensili', description:'Prenota le call mensili con tutti i clienti attivi', frequency:'monthly', category:'admin', createTask:true },
      { id:'acc_m2', emoji:'📋', text:'Report mensile', description:'Invia il report mensile a ogni cliente', frequency:'monthly', category:'action', createTask:true },
      { id:'acc_m3', emoji:'📑', text:'Verifica retainer', description:'Controlla che tutti i pagamenti del mese siano registrati', frequency:'monthly', category:'review' },
    ],
  },

  smm: {
    role: 'smm',
    greetings: [
      "Buongiorno! 📱 Il feed non si aggiorna da solo (ancora) 😄",
      "Nuova giornata, nuovi contenuti da creare ✨",
      "Il tuo pubblico ti aspetta ☀️ Cosa pubblichiamo oggi?",
      "Buongiorno! Prima i trend, poi il caffè 🔥",
      "Content is king. E oggi regni tu 👑",
    ],
    weeklyKickoff: [
      "Lunedì creativo! 🎨 Pianifica i contenuti della settimana prima di tutto",
      "Settimana nuova — controlla i trend e pianifica i post. Si parte! 🚀",
    ],
    weeklyWrapup: [
      "Venerdì! Hai programmato i post del weekend? 📅",
      "Fine settimana — controlla le performance e porta le idee per la prossima 💡",
    ],
    monthlyReview: [
      "Nuovo mese! Genera il piano editoriale completo con l'AI 🤖✨",
    ],
    items: [
      // Daily
      { id:'smm_d1', emoji:'📊', text:'Controlla engagement', description:'Rispondi ai commenti e messaggi di ieri', frequency:'daily', category:'action' },
      { id:'smm_d2', emoji:'📅', text:'Post di oggi', description:'Verifica che tutti i contenuti di oggi siano pronti e approvati', frequency:'daily', category:'check' },
      { id:'smm_d3', emoji:'🔥', text:'Trend check', description:'Cosa sta succedendo sui social oggi? Opportunità da cavalcare', frequency:'daily', category:'creative' },
      { id:'smm_d4', emoji:'✅', text:'Approvazioni in attesa', description:'Contenuti che il cliente deve ancora approvare', frequency:'daily', category:'check' },
      // Weekly Monday
      { id:'smm_w1', emoji:'📅', text:'Piano editoriale settimana', description:'Definisci tutti i contenuti da creare e programmare', frequency:'weekly_monday', category:'action', createTask:true },
      { id:'smm_w2', emoji:'✨', text:'Crea contenuti AI', description:'Usa il pianificatore AI per generare caption e idee', frequency:'weekly_monday', category:'creative' },
      { id:'smm_w3', emoji:'📤', text:'Manda approvazioni clienti', description:'Invia i contenuti della settimana per l\'approvazione', frequency:'weekly_monday', category:'action', createTask:true },
      // Weekly Friday
      { id:'smm_f1', emoji:'📊', text:'Analisi performance', description:'Quali contenuti hanno funzionato meglio questa settimana?', frequency:'weekly_friday', category:'review' },
      { id:'smm_f2', emoji:'💡', text:'Idee settimana prossima', description:'Annota 3 idee contenuto per la settimana prossima', frequency:'weekly_friday', category:'creative' },
      { id:'smm_f3', emoji:'📅', text:'Programma weekend', description:'Verifica che i post del weekend siano schedulati', frequency:'weekly_friday', category:'check' },
      // Monthly
      { id:'smm_m1', emoji:'🤖', text:'Piano editoriale AI', description:'Genera il piano editoriale completo del mese con AI', frequency:'monthly', category:'creative', createTask:true },
      { id:'smm_m2', emoji:'📊', text:'Report social mensile', description:'Analisi performance organica e a pagamento', frequency:'monthly', category:'review', createTask:true },
      { id:'smm_m3', emoji:'🔍', text:'Audit hashtag', description:'Aggiorna gli hashtag set per ogni cliente', frequency:'monthly', category:'admin' },
    ],
  },

  designer: {
    role: 'designer',
    greetings: [
      "Buongiorno! 🎨 Cosa creiamo di bello oggi?",
      "Nuova giornata, nuove grafiche da costruire ✏️",
      "Il brief ti aspetta. Inizia da lì 📋",
      "Buongiorno! Occhio ai dettagli — è quello che fa la differenza 👁",
    ],
    weeklyKickoff: [
      "Lunedì! Controlla i brief aperti e pianifica le produzioni della settimana 🎨",
      "Settimana nuova — dai un'occhiata alle revisioni in attesa e inizia da lì ✏️",
    ],
    weeklyWrapup: [
      "Venerdì! Hai caricato tutti gli asset approvati? 📦",
      "Fine settimana — chiudi le revisioni aperte e prepara la lista per lunedì ✅",
    ],
    monthlyReview: [
      "Inizio mese — aggiorna gli asset di ogni cliente e verifica i brand kit 🎨",
    ],
    items: [
      { id:'des_d1', emoji:'📋', text:'Brief da lavorare', description:'Contenuti con note visual assegnati oggi', frequency:'daily', category:'check' },
      { id:'des_d2', emoji:'🔄', text:'Revisioni in attesa', description:'Feedback ricevuti — cosa devi modificare?', frequency:'daily', category:'review' },
      { id:'des_d3', emoji:'📁', text:'Carica asset approvati', description:'Salva su Drive gli asset approvati dal cliente', frequency:'daily', category:'admin' },
      { id:'des_w1', emoji:'🎨', text:'Review brand consistency', description:'I contenuti di questa settimana rispettano il brand di ogni cliente?', frequency:'weekly_monday', category:'review' },
      { id:'des_w2', emoji:'🖼', text:'Aggiorna asset library', description:'Carica i nuovi asset nella libreria del cliente', frequency:'weekly_friday', category:'admin' },
      { id:'des_m1', emoji:'📦', text:'Audit asset clienti', description:'Verifica che ogni cliente abbia loghi, font e palette aggiornati', frequency:'monthly', category:'admin', createTask:true },
    ],
  },

  pm: {
    role: 'pm',
    greetings: [
      "Buongiorno! 📋 Il cantiere è aperto — inizia dal tracker",
      "Nuova giornata operativa. Chi è bloccato? Scopriamolo subito 🔍",
      "Buongiorno! Budget, task e timeline — in questo ordine ☕",
      "Il PM non si ferma mai. Ma oggi inizia con calma 😄",
    ],
    weeklyKickoff: [
      "Lunedì operativo! Controlla workload e blocchi prima di tutto 📊",
      "Settimana nuova — distribuisci i task e allinea il team sulle priorità 👥",
    ],
    weeklyWrapup: [
      "Venerdì! Aggiorna lo stato di tutte le commesse prima del weekend 💼",
      "Fine settimana — fai il punto sul budget ore di ogni progetto ⏱",
    ],
    monthlyReview: [
      "Inizio mese — rivedi i budget ore e pianifica le commesse del mese 📋",
    ],
    items: [
      { id:'pm_d1', emoji:'🚨', text:'Task in ritardo', description:'Chi è bloccato? Cosa sbloccare oggi?', frequency:'daily', category:'check' },
      { id:'pm_d2', emoji:'👥', text:'Check workload', description:'Verifica che nessuno sia sovraccarico o sotto-utilizzato', frequency:'daily', category:'check' },
      { id:'pm_d3', emoji:'⏱', text:'Log ore giornaliero', description:'Hai loggato le ore di oggi nel time tracker?', frequency:'daily', category:'admin' },
      { id:'pm_w1', emoji:'📊', text:'Status report commesse', description:'Aggiorna lo stato di avanzamento di ogni commessa', frequency:'weekly_monday', category:'review', createTask:true },
      { id:'pm_w2', emoji:'⚠️', text:'Alert budget ore', description:'Quali commesse sono vicine al limite? Avvisa il CEO', frequency:'weekly_monday', category:'check' },
      { id:'pm_w3', emoji:'🎯', text:'Priorità settimana', description:'Definisci le 3 priorità operative della settimana con il team', frequency:'weekly_monday', category:'action' },
      { id:'pm_f1', emoji:'📈', text:'Verifica avanzamento', description:'I task pianificati per questa settimana sono stati completati?', frequency:'weekly_friday', category:'review' },
      { id:'pm_f2', emoji:'📋', text:'Pianifica settimana prossima', description:'Assegna i task della settimana prossima', frequency:'weekly_friday', category:'action', createTask:true },
      { id:'pm_m1', emoji:'⏱', text:'Report ore mensile', description:'Analisi ore fatturabili vs totali per cliente', frequency:'monthly', category:'review', createTask:true },
      { id:'pm_m2', emoji:'💰', text:'Verifica redditività', description:'Controlla il margine di ogni commessa attiva', frequency:'monthly', category:'review' },
    ],
  },
};

export function getRoutine(role: UserRole): RoleRoutine {
  return ROUTINES[role];
}

export function getRoutineItems(role: UserRole, frequency: RoutineFrequency): RoutineItem[] {
  return ROUTINES[role]?.items.filter(i => i.frequency === frequency) ?? [];
}

export function getTodayGreeting(role: UserRole): string {
  const greetings = ROUTINES[role]?.greetings ?? ['Buongiorno!'];
  const dayOfYear = Math.floor((Date.now() - new Date(new Date().getFullYear(),0,0).getTime()) / 86400000);
  return greetings[dayOfYear % greetings.length];
}

export function getContextualMessage(role: UserRole): string {
  const day = new Date().getDay();
  if (day === 1) {
    const msgs = ROUTINES[role]?.weeklyKickoff ?? [];
    return msgs[Math.floor(Math.random() * msgs.length)] ?? getTodayGreeting(role);
  }
  if (day === 5) {
    const msgs = ROUTINES[role]?.weeklyWrapup ?? [];
    return msgs[Math.floor(Math.random() * msgs.length)] ?? getTodayGreeting(role);
  }
  if (new Date().getDate() <= 2) {
    return ROUTINES[role]?.monthlyReview[0] ?? getTodayGreeting(role);
  }
  return getTodayGreeting(role);
}

const STORAGE_KEY = 'pmo_routine_completed';

export function getCompletedToday(role: UserRole): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const today = new Date().toISOString().slice(0, 10);
    return data[`${role}_${today}`] ?? [];
  } catch { return []; }
}

export function markCompleted(role: UserRole, itemId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    const today = new Date().toISOString().slice(0, 10);
    const key = `${role}_${today}`;
    data[key] = [...(data[key] ?? []), itemId];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {}
}

export function getStreakDays(role: UserRole): number {
  if (typeof window === 'undefined') return 0;
  try {
    const data = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}');
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const key = `${role}_${dateStr}`;
      if (data[key]?.length > 0) streak++;
      else if (i > 0) break;
    }
    return streak;
  } catch { return 0; }
}
