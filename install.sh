#!/bin/bash

# MOD Group PMO App — Install Script (Mac/Linux)

set -e

BOLD='\033[1m'
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo "  ║        MOD Group PMO App — Installer         ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

# 1. Controlla Node.js
echo -e "  ${BOLD}[1/3]${NC} Controllo Node.js..."
if ! command -v node &> /dev/null; then
    echo -e "  ${RED}[ERRORE]${NC} Node.js non trovato."
    echo "  Scaricalo da https://nodejs.org  (versione 18 o superiore)"
    echo ""
    exit 1
fi
NODE_VER=$(node --version)
echo -e "  ${GREEN}[OK]${NC} Node.js $NODE_VER trovato"

# 2. Installa dipendenze
echo ""
echo -e "  ${BOLD}[2/3]${NC} Installazione dipendenze npm..."
echo "  (Potrebbe richiedere 1-2 minuti alla prima esecuzione)"
echo ""
npm install
echo -e "  ${GREEN}[OK]${NC} Dipendenze installate"

# 3. Crea script di avvio
echo ""
echo -e "  ${BOLD}[3/3]${NC} Creo script di avvio (start.sh)..."
cat > start.sh << 'STARTEOF'
#!/bin/bash
echo ""
echo "  Avvio MOD Group PMO App..."
echo "  Apri il browser su http://localhost:3000"
echo ""
# Apri browser in background (Mac e Linux)
if command -v open &> /dev/null; then
    sleep 2 && open http://localhost:3000 &
elif command -v xdg-open &> /dev/null; then
    sleep 2 && xdg-open http://localhost:3000 &
fi
npm run dev
STARTEOF
chmod +x start.sh
echo -e "  ${GREEN}[OK]${NC} start.sh creato"

echo ""
echo "  ╔══════════════════════════════════════════════╗"
echo -e "  ║   ${GREEN}Installazione completata con successo!${NC}     ║"
echo "  ║                                              ║"
echo "  ║   Per avviare l'app usa:  ./start.sh         ║"
echo "  ║   oppure:  npm run dev                       ║"
echo "  ║   poi apri:  http://localhost:3000           ║"
echo "  ╚══════════════════════════════════════════════╝"
echo ""

read -p "  Vuoi avviare l'app adesso? [S/n]: " LAUNCH
if [[ "$LAUNCH" =~ ^[Nn]$ ]]; then
    exit 0
fi
exec ./start.sh
