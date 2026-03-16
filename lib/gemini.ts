// ── Gemini API — client centralizzato ────────────────────────────────────────
// Unico punto di accesso a Gemini in tutta l'app.
// Per cambiare modello o aggiungere retry basta modificare questo file.

export const GEMINI_MODEL = 'gemini-2.5-flash';
const MODEL = GEMINI_MODEL;
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

function getKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pmo_gemini_key')
      ?? localStorage.getItem('pmo_anthropic_key')
      ?? '';
}

export interface GeminiMessage {
  role: 'user' | 'model';
  content: string;
}

export interface GeminiOptions {
  system?:      string;          // system instruction
  messages?:    GeminiMessage[]; // storia conversazione multi-turn
  maxTokens?:   number;          // default 1200
  temperature?: number;          // default 0.7
  webSearch?:   boolean;         // attiva Google Search grounding
  json?:        boolean;         // chiede risposta JSON pura (aggiunge istruzione)
}

// Ritorna il testo della risposta o lancia un errore con messaggio chiaro
export async function gemini(prompt: string, opts: GeminiOptions = {}): Promise<string> {
  const key = getKey();
  if (!key) throw new Error('API key Gemini non configurata — vai in GOD Mode → API Keys');

  const {
    system, messages = [], maxTokens = 1200,
    temperature = 0.7, webSearch = false, json = false,
  } = opts;

  // Prepara il testo del prompt (con istruzione JSON se richiesta)
  const finalPrompt = json
    ? prompt + '\n\nRispondi ESCLUSIVAMENTE con JSON valido, senza testo prima o dopo, senza markdown o backtick.'
    : prompt;

  // Costruisce contents: storia + messaggio corrente
  const contents = [
    ...messages.map(m => ({
      role: m.role,
      parts: [{ text: m.content }],
    })),
    { role: 'user', parts: [{ text: finalPrompt }] },
  ];

  const body: Record<string, unknown> = {
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature },
  };

  if (system) {
    body.system_instruction = { parts: [{ text: system }] };
  }
  if (webSearch) {
    body.tools = [{ googleSearch: {} }];
  }

  // Retry automatico su errori temporanei (rate limit, timeout)
  let lastError = '';
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res  = await fetch(`${API_URL}?key=${key}`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(body),
      });
      const data = await res.json();

      if (data.error) {
        const msg = data.error.message ?? 'Errore API Gemini';
        // Errori non recuperabili — lancia subito
        if (msg.includes('API key') || msg.includes('not valid') || msg.includes('not found')) {
          throw new Error(msg);
        }
        lastError = msg;
        // Attendi prima del retry
        if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
        continue;
      }

      const text = data.candidates?.[0]?.content?.parts
        ?.map((p: { text?: string }) => p.text ?? '')
        .join('') ?? '';

      return text;
    } catch (e: unknown) {
      if (e instanceof Error && (e.message.includes('API key') || e.message.includes('not valid'))) {
        throw e; // Errore non recuperabile
      }
      lastError = e instanceof Error ? e.message : 'Errore di connessione';
      if (attempt === 0) await new Promise(r => setTimeout(r, 1500));
    }
  }

  throw new Error(lastError || 'Gemini non risponde — riprova tra qualche secondo');
}

// Helper per parsing JSON sicuro dalla risposta Gemini
export function parseGeminiJSON<T>(raw: string): T {
  const clean = raw.replace(/```json\n?|```\n?/g, '').trim();
  const s = clean.indexOf('{');
  const e = clean.lastIndexOf('}');
  if (s === -1 || e === -1) throw new Error('Risposta non è JSON valido');
  return JSON.parse(clean.slice(s, e + 1)) as T;
}

// Helper per parsing JSON con fallback null (non lancia eccezione)
export function tryParseJSON<T>(raw: string): T | null {
  try { return parseGeminiJSON<T>(raw); }
  catch { return null; }
}
