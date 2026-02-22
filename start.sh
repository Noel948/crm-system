#!/bin/bash
# NexaCRM - Start Script

export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm use 20 --silent 2>/dev/null || true

echo ""
echo "╔══════════════════════════════════════╗"
echo "║          NexaCRM Startup             ║"
echo "╚══════════════════════════════════════╝"
echo ""

# Start backend
echo "▶ Starting backend on port 3001..."
cd "$(dirname "$0")/backend"
node src/index.js &
BACKEND_PID=$!

sleep 1

# Start frontend
echo "▶ Starting frontend on port 5173..."
cd "$(dirname "$0")/frontend"
npm run dev &
FRONTEND_PID=$!

echo ""
echo "✅ NexaCRM is running!"
echo ""
echo "   Frontend: http://localhost:5173"
echo "   Backend:  http://localhost:3001"
echo ""
echo "   First user to register becomes ADMIN"
echo ""
echo "   Press Ctrl+C to stop all servers"
echo ""

# Cleanup on exit
trap "echo 'Stopping servers...'; kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT TERM
wait
