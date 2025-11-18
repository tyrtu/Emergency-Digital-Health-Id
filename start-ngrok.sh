#!/bin/bash
# Bash script to start backend, frontend, and ngrok tunnels
# Usage: ./start-ngrok.sh

echo "🚀 Starting Emergency Health ID with ngrok..."

# Check if ngrok is installed
if ! command -v ngrok &> /dev/null; then
    echo "❌ ngrok is not installed!"
    echo "Install it from: https://ngrok.com/download"
    echo "Or run: npm install -g ngrok"
    exit 1
fi

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Start backend in background
echo ""
echo "📦 Starting backend server..."
cd "$SCRIPT_DIR/backend"
npm run dev > /dev/null 2>&1 &
BACKEND_PID=$!
cd "$SCRIPT_DIR"

# Wait a bit for backend to start
sleep 3

# Start frontend in background
echo "📦 Starting frontend server..."
cd "$SCRIPT_DIR/frontend"
npm run dev > /dev/null 2>&1 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"

# Wait a bit for frontend to start
sleep 3

# Start ngrok for backend
echo ""
echo "🌐 Starting ngrok for backend (port 5000)..."
echo "Copy the HTTPS URL and update frontend/.env with:"
echo "VITE_API_BASE_URL=<ngrok-backend-url>"
gnome-terminal -- bash -c "ngrok http 5000; exec bash" 2>/dev/null || \
xterm -e "ngrok http 5000" 2>/dev/null || \
ngrok http 5000 &

# Wait a bit
sleep 2

# Start ngrok for frontend
echo ""
echo "🌐 Starting ngrok for frontend (port 5173)..."
echo "Open this URL on your phone!"
gnome-terminal -- bash -c "ngrok http 5173; exec bash" 2>/dev/null || \
xterm -e "ngrok http 5173" 2>/dev/null || \
ngrok http 5173 &

echo ""
echo "✅ All services starting!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the backend ngrok HTTPS URL"
echo "2. Update frontend/.env: VITE_API_BASE_URL=<backend-ngrok-url>"
echo "3. Copy the frontend ngrok HTTPS URL"
echo "4. Open frontend URL on your phone!"
echo ""
echo "Press Ctrl+C to stop all services"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"

# Wait for interrupt
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; exit" INT
wait

