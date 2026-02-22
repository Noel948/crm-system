#!/bin/bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 --silent 2>/dev/null

echo "============================================"
echo "  NexaCRM inditasa..."
echo "============================================"

# Backend leallitasa ha fut
pkill -f "node.*crm/backend" 2>/dev/null

# Backend inditasa
cd "$(dirname "$0")/backend"
node src/index.js &
BACKEND_PID=$!
echo "✅ Backend elindult (port 3001)"

sleep 1

# Frontend inditasa
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

sleep 3
echo ""
echo "============================================"
echo "  Az alkalmazas elerheto:"
echo "  http://localhost:5173"
echo "============================================"
echo ""
echo "  Az elso regisztralo felhasznalo ADMIN lesz!"
echo ""

# Megnyitas browserben
open http://localhost:5173

trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null" EXIT
wait
