/**
 * Gate di approvazione interna — nessun contenuto va al cliente senza conferma esplicita.
 * Tutti i punti di uscita verso l'esterno devono passare per questo gate.
 */

export interface ApprovalGateOptions {
  action: string;           // es. "Invia newsletter", "Condividi dashboard"
  recipient?: string;       // es. "12 partecipanti", "Il Sereno Hotels"
  warnings?: string[];      // avvisi specifici da mostrare
  requireCheckbox?: boolean;// richiede checkbox esplicita (default: true)
}

/**
 * Mostra un dialog di conferma con checklist prima di qualsiasi invio verso l'esterno.
 * Ritorna true se l'utente conferma, false se annulla.
 */
export function approvalGate(opts: ApprovalGateOptions): boolean {
  const warnings = opts.warnings ?? [];
  const checkItems = [
    '✅ Il contenuto è stato revisionato internamente',
    '✅ Nessun dato interno o riservato è incluso',
    '✅ Il destinatario è corretto',
    ...warnings.map(w => `⚠️ ${w}`),
  ];

  const message = [
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    `🔒 CONFERMA INVIO ESTERNO`,
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
    ``,
    `Azione: ${opts.action}`,
    opts.recipient ? `Destinatario: ${opts.recipient}` : '',
    ``,
    `Verifica prima di procedere:`,
    ...checkItems,
    ``,
    `Vuoi procedere?`,
  ].filter(Boolean).join('\n');

  return window.confirm(message);
}
