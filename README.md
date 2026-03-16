# MOD Group PMO App 🚀
Applicazione interna per la gestione operativa e commerciale di MOD Group.

## 🛠️ Requisiti
- **Node.js** v18 o superiore
- **Vercel Account** per il deploy
- **Google Cloud Console** per le API di Drive

## 📌 Regole del Progetto
- **Interfaccia:** Completamente in Italiano.
- **Codice:** Variabili e commenti in Inglese.
- **Filosofia:** MVP semplice e pulito per 8-10 utenti.
- **Data Source:** Google Sheets / Drive API.

## 🚀 Funzionalità Principali
| Sezione | Descrizione |
|---|---|
| **Dashboard** | KPI live, task in scadenza e alert budget. |
| **Tracker** | Gestione Task con vista Tabella e Kanban. |
| **Clienti** | Anagrafica completa con link diretti a Drive. |
| **Lead/Pipeline** | Gestione commerciale dal primo contatto alla commessa. |
| **AI Agent** | Integrazione con Gemini per analisi dati e newsletter. |

## 💻 Installazione Locale
1. `npm install` per installare le dipendenze.
2. Crea un file `.env.local` con le tue chiavi Google.
3. `npm run dev` per avviare l'app su http://localhost:3000

## 🌐 Deploy
L'app è configurata per il deploy automatico su **Vercel** tramite il branch `main` di GitHub.
