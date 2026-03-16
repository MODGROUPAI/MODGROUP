// ── Provider AI unificato — Gemini 2.5 Flash-Lite ────────────────────────────

export type AIProvider = 'gemini' | 'claude';

export interface AIMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface AIResponse {
  text: string;
  error?: string;
}

function getGeminiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pmo_gemini_key') ?? '';
}

function getClaudeKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pmo_anthropic_key') ?? '';
}

export function getActiveProvider(): AIProvider {
  if (getGeminiKey()) return 'gemini';
  if (getClaudeKey()) return 'claude';
  return 'gemini';
}

export function hasAnyKey(): boolean {
  return !!(getGeminiKey() || getClaudeKey());
}

export function getProviderLabel(): string {
  return getActiveProvider() === 'gemini' ? 'Gemini 2.5 Flash' : 'Claude Sonnet';
}

// ── Chiamata unificata ────────────────────────────────────────────────────────
export async function callAI(params: {
  system: string;
  messages: AIMessage[];
  maxTokens?: number;
  webSearch?: boolean;
}): Promise<AIResponse> {
  return getActiveProvider() === 'gemini' ? callGemini(params) : callClaude(params);
}

// ── Gemini 2.5 Flash-Lite ─────────────────────────────────────────────────────
async function callGemini({ system, messages, maxTokens = 1000, webSearch = false }: {
  system: string; messages: AIMessage[]; maxTokens?: number; webSearch?: boolean;
}): Promise<AIResponse> {
  const key = getGeminiKey();
  if (!key) return { text:'', error:'Gemini API key non configurata. Vai in GOD Mode → API Key Gemini.' };

  const model = 'gemini-2.5-flash'; // see gemini.ts for the single source of truth
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const body: Record<string, unknown> = {
    system_instruction: { parts: [{ text: system }] },
    contents,
    generationConfig: { maxOutputTokens: maxTokens, temperature: 0.7 },
  };

  if (webSearch) body.tools = [{ googleSearch: {} }];

  try {
    const res  = await fetch(url, { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(body) });
    const data = await res.json();
    if (data.error) return { text:'', error:`Gemini: ${data.error.message}` };
    return { text: data.candidates?.[0]?.content?.parts?.[0]?.text ?? '' };
  } catch {
    return { text:'', error:'Errore connessione Gemini. Verifica la API key e la connessione.' };
  }
}

// ── Claude fallback ───────────────────────────────────────────────────────────
async function callClaude({ system, messages, maxTokens = 1000, webSearch = false }: {
  system: string; messages: AIMessage[]; maxTokens?: number; webSearch?: boolean;
}): Promise<AIResponse> {
  const key = getClaudeKey();
  if (!key) return { text:'', error:'Nessuna API key configurata. Vai in GOD Mode.' };

  const tools = webSearch ? [{ type:'web_search_20250305', name:'web_search' }] : undefined;

  try {
    const res  = await fetch('https://api.anthropic.com/v1/messages', {
      method:'POST',
      headers:{ 'Content-Type':'application/json', 'x-api-key':key, 'anthropic-version':'2023-06-01' },
      body: JSON.stringify({
        model:'claude-sonnet-4-20250514', max_tokens: maxTokens, system,
        messages: messages.map(m => ({ role:m.role, content:m.content })),
        ...(tools ? { tools } : {}),
      }),
    });
    const data = await res.json();
    const text = (data.content ?? []).filter((b:{type:string}) => b.type==='text').map((b:{text:string}) => b.text).join('\n');
    return { text };
  } catch {
    return { text:'', error:'Errore connessione Claude.' };
  }
}

// ── Export helper usati da Ambrogio e Briefing ───────────────────────────────
export function getApiKey(): string {
  if (typeof window === 'undefined') return '';
  return localStorage.getItem('pmo_gemini_key') ?? localStorage.getItem('pmo_anthropic_key') ?? '';
}

export function callAIStream(params: {
  system: string; messages: AIMessage[]; maxTokens?: number;
}): Promise<AIResponse> {
  return callAI(params);
}
