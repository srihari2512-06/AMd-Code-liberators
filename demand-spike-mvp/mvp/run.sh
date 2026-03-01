#!/bin/bash
# SME Demand Spike Command Center — Quick Start Script

echo ""
echo "⚡ DEMAND SPIKE COMMAND CENTER"
echo "================================"
echo ""

# Check dependencies
if ! command -v python3 &> /dev/null && ! command -v python &> /dev/null; then
    echo "❌ Python not found. Install Python 3.10+ from https://python.org"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo "❌ Node.js not found. Install Node 18+ from https://nodejs.org"
    exit 1
fi

# Install backend deps
echo "📦 Installing backend dependencies..."
cd backend
pip install -r requirements.txt -q

# Setup .env
if [ ! -f .env ]; then
    cp .env.example .env
    echo ""
    echo "📝 Created backend/.env"
    echo "   → Add your ANTHROPIC_API_KEY to backend/.env for AI-powered features"
    echo "   → (App still works without it using fallback mode)"
    echo ""
fi

# Start backend in background
echo "🚀 Starting backend on http://localhost:8000..."
python main.py &
BACKEND_PID=$!
cd ..

# Install frontend deps
echo "📦 Installing frontend dependencies..."
cd frontend
npm install --silent

# Start frontend
echo "🌐 Starting frontend on http://localhost:3000..."
npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅ RUNNING!"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:8000"
echo "   API Docs: http://localhost:8000/docs"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait and cleanup
trap "kill $BACKEND_PID $FRONTEND_PID 2>/dev/null; echo 'Servers stopped.'" SIGINT SIGTERM
wait $BACKEND_PID $FRONTEND_PID
