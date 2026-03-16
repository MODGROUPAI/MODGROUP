# MOD Group — Piano Drive Aziendale Unificato

## Situazione attuale
- File clienti: misto Gmail + Modgroup + WhatsApp + email
- Account @modgroup.it: 4-6 persone (tutto il team)
- Obiettivo: Drive aziendale unico su @modgroup.it, interfacciato con MOD.PMO

---

## FASE 1 — Crea la struttura Drive aziendale (Mattia, 1 sessione)

Accedi con **m.brumana@modgroup.it** su drive.google.com e crea questa struttura:

```
📁 MOD Group — Shared Drive (Drive Condiviso aziendale)
│
├── 📁 00 — PMO & Sistema
│   ├── 📁 Backup PMO/           ← JSON export automatici dal gestionale
│   ├── 📁 Template Import/      ← Excel template per import clienti/team
│   ├── 📁 Configurazioni/       ← Settings e documentazione interna
│   └── 📁 Onboarding Team/      ← Guide per i nuovi collaboratori
│
├── 📁 01 — Clienti Attivi
│   ├── 📁 _TEMPLATE_CLIENTE/    ← Cartella modello da duplicare
│   │   ├── 📁 01_Brand_Kit/
│   │   ├── 📁 02_Contenuti/
│   │   │   ├── 📁 Approvati/
│   │   │   ├── 📁 In_lavorazione/
│   │   │   └── 📁 Archivio/
│   │   ├── 📁 03_Report/
│   │   ├── 📁 04_ADV/
│   │   ├── 📁 05_Contratti/
│   │   └── 📁 06_Riunioni/
│   │
│   ├── 📁 Sereno_Hotels/        ← (duplica da _TEMPLATE_)
│   ├── 📁 Convento_San_Panfilo/
│   ├── 📁 Tenuta_Pescarina/
│   ├── 📁 Spazio_C21/
│   ├── 📁 FDAI/
│   └── 📁 WeAreMOD/
│
├── 📁 02 — Commerciale
│   ├── 📁 Preventivi/
│   │   ├── 📁 2025/
│   │   └── 📁 2026/
│   ├── 📁 Contratti_Retainer/
│   ├── 📁 Lead_Pipeline/
│   └── 📁 Offerte_No_Go/
│
├── 📁 03 — Operativo
│   ├── 📁 Report_Mensili/
│   │   ├── 📁 2025/
│   │   └── 📁 2026/
│   ├── 📁 Time_Tracking/
│   ├── 📁 Template_Progetto/
│   └── 📁 Brief_Creativi/
│
├── 📁 04 — Re Model (Formazione)
│   ├── 📁 Corsi/
│   │   ├── 📁 WeAreMOD_Marketing/
│   │   └── 📁 AI_per_PMI/
│   ├── 📁 Materiali_Docenti/
│   ├── 📁 Certificati_Emessi/
│   └── 📁 Partecipanti/
│
└── 📁 05 — Team & Interno
    ├── 📁 Comunicazioni/
    ├── 📁 Formazione_Interna/
    └── 📁 Asset_MOD_Group/
        ├── 📁 Logo_Brandkit/
        ├── 📁 Template_Social/
        └── 📁 Foto_Team/
```

---

## FASE 2 — Crea un "Shared Drive" (non Drive personale)

**Importante:** usa un **Google Shared Drive** (Drive Condiviso), NON una cartella del tuo Drive personale.

Perché:
- I file appartengono all'azienda, non al singolo utente
- Se un membro del team lascia, i file rimangono
- Permessi granulari per ogni membro
- Appare uguale per tutti i membri del team

**Come crearlo:**
1. Drive.google.com → "Drive condivisi" (colonna sinistra) → "Nuovo"
2. Nome: **"MOD Group"**
3. Aggiungi membri (vedi FASE 3)

---

## FASE 3 — Aggiungi il team con i permessi corretti

| Membro | Account | Ruolo Drive | Accesso |
|--------|---------|-------------|---------|
| Mattia Brumana | m.brumana@modgroup.it | **Manager** | Tutto |
| Mario Valerio | (email @modgroup.it) | **Manager** | Tutto |
| Valentina Maccarelli | (email @modgroup.it) | **Contribuente** | Tutto tranne impostazioni |
| Evangelo | (email @modgroup.it) | **Contribuente** | 01_Clienti + 03_Operativo |
| Martina/Marti | (email @modgroup.it) | **Contribuente** | 01_Clienti + 03_Operativo |
| Altri collaboratori | email esterna | **Visualizzatore** | Solo cartelle specifiche |

---

## FASE 4 — Interfaccia con MOD.PMO

Il gestionale si sincronizza con Google Drive tramite OAuth.

**Setup in 3 minuti:**

1. Crea file `.env.local` nella cartella del progetto:
```
GOOGLE_CLIENT_ID=xxxxx.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=xxxxx
GOOGLE_DRIVE_FOLDER_ID=ID_CARTELLA_00_PMO
```

2. Per ottenere `GOOGLE_DRIVE_FOLDER_ID`:
   - Apri la cartella "00 — PMO & Sistema" su Drive
   - URL: `drive.google.com/drive/folders/1ABC123...`
   - Il codice dopo `/folders/` è il tuo Folder ID

3. Per le credenziali OAuth:
   - console.cloud.google.com
   - Nuovo progetto: "MOD PMO"
   - Abilita Google Drive API
   - Crea credenziali OAuth 2.0
   - URI redirect: `http://localhost:3000/api/drive/callback`
   - (dopo il deploy su Vercel aggiorna con l'URL pubblico)

---

## FASE 5 — Gestisci i due account (Gmail personale + Modgroup)

**Problema:** hai file su mattiabrumana@gmail.com che servono anche in azienda.

**Soluzione in 3 step:**

### Step A — Cartella ponte
Sul tuo Gmail personale, crea una cartella:
📁 **"MOD — Condiviso"**
Condividila con m.brumana@modgroup.it come Editor.
Qui metti i file che attraversano i due profili.

### Step B — Migrazione file clienti
Per ogni cliente con file su Gmail:
1. Apri la cartella su Gmail
2. Seleziona tutti i file
3. "Sposta" nella cartella corrispondente nel Shared Drive aziendale
4. I link esistenti si rompono — avvisa il team

### Step C — Regola d'oro da adottare
```
✅ File aziendali → sempre su @modgroup.it Shared Drive
✅ File personali/bozze → @gmail.com
✅ File che servono in entrambi → cartella "MOD — Condiviso"
❌ MAI inviare file clienti via WhatsApp (usa link Drive)
❌ MAI salvare file definitivi in locale
```

---

## FASE 6 — Struttura URL nel PMO

Per ogni cliente nel gestionale, inserisci nel campo "Drive Link":
```
https://drive.google.com/drive/folders/[ID_CARTELLA_CLIENTE]
```

Il PMO apre direttamente la cartella del cliente su Drive con un click.

Per i retainer/contratti:
```
https://drive.google.com/file/d/[ID_FILE]/view
```

---

## Naming convention — regole per tutto il team

Per mantenere il Drive ordinato nel tempo:

**Cartelle:** `NomeCliente_Anno` es. `Sereno_Hotels_2026`
**File contenuti:** `YYYYMMDD_Cliente_Tipo` es. `20260315_Sereno_Reel_Primavera`
**Report:** `Report_Cliente_MMYYYY` es. `Report_Sereno_032026`
**Preventivi:** `PRE_NNN_Cliente_Data` es. `PRE_042_Sereno_2026`
**Contratti:** `CTR_Cliente_Anno` es. `CTR_Sereno_2026`

---

## Timeline consigliata

| Settimana | Attività |
|-----------|----------|
| Settimana 1 | Crea Shared Drive + struttura cartelle |
| Settimana 2 | Aggiungi team + configura permessi |
| Settimana 3 | Migra file Gmail → Drive aziendale (un cliente alla volta) |
| Settimana 4 | Setup OAuth nel PMO + test sync |
| Mese 2 | Tutti i nuovi file solo su Drive aziendale |

---

## Checklist finale

- [ ] Shared Drive "MOD Group" creato su @modgroup.it
- [ ] Struttura cartelle creata da _TEMPLATE_
- [ ] Tutti i membri @modgroup.it aggiunti
- [ ] Cartella "MOD — Condiviso" creata su Gmail personale
- [ ] .env.local configurato nel PMO
- [ ] Drive Link inserito in ogni scheda cliente del gestionale
- [ ] Naming convention comunicata al team
- [ ] Prima riunione di allineamento con il team sul nuovo sistema

---

*Generato da MOD.PMO — modgroup.it*
