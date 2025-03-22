#!/bin/bash

# Create project directory
mkdir code-webui-app
cd code-webui-app

# Create server and client directories
mkdir server client

# Setup server
cd server
echo '{
  "name": "code-webui-server",
  "version": "1.0.0",
  "description": "Local code editor server",
  "main": "index.js",
  "scripts": {
    "start": "node index.js",
    "dev": "nodemon index.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "socket.io": "^4.7.2",
    "sqlite3": "^5.1.6",
    "node-llama-cpp": "^2.8.8"
  },
  "devDependencies": {
    "nodemon": "^3.0.2"
  }
}' > package.json

# Create models directory for server
mkdir models

# Install server dependencies
echo "Installing server dependencies..."
npm install

# Setup client
cd ../client

# Initialize Vite React project
echo "Setting up client..."
npm create vite@latest . -- --template react --y

# Install client dependencies
npm install
npm install @monaco-editor/react socket.io-client uuid

# Return to project root
cd ..

# Create a startup script
echo '#!/bin/bash

# Start server
cd server
npm run dev &
SERVER_PID=$!

# Wait a moment for server to initialize
sleep 2

# Start client
cd ../client
npm run dev &
CLIENT_PID=$!

# Handle shutdown
trap "kill $SERVER_PID $CLIENT_PID" EXIT

# Wait for both processes
wait' > start.sh

# Make start script executable
chmod +x start.sh

echo "Setup completed! To start the application, run:"
echo "./start.sh"

# Option to start immediately
read -p "Would you like to start the application now? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]
then
    ./start.sh
fi 