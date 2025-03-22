#!/bin/bash

echo "Starting BlissfulUI - A Replit-inspired Code Editor"
echo "------------------------------------------------"

# Check if this is first run
if [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    echo "🔧 First time setup needed!"
    echo "Please run: ./first-setup.sh"
    exit 1
fi

# Start the server in the background
echo "🚀 Starting server..."
cd server
npm start &
SERVER_PID=$!

# Wait a moment for the server to initialize
sleep 2

# Start the client
echo "🚀 Starting client..."
cd ../client
npm start &
CLIENT_PID=$!

# Handle script termination
trap 'echo "💫 Shutting down..."; kill $SERVER_PID $CLIENT_PID; exit' SIGINT SIGTERM

# Keep script running
wait 