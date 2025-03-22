#!/bin/bash

echo "Starting BlissfulUI - A Replit-inspired Code Editor"
echo "------------------------------------------------"

# Global variables to track PIDs
SERVER_PID=""
CLIENT_PID=""

# Function to properly shut down all processes
cleanup() {
    echo "💫 Shutting down..."
    
    # Kill processes if they exist
    if [ -n "$SERVER_PID" ]; then
        kill -TERM $SERVER_PID 2>/dev/null || kill -KILL $SERVER_PID 2>/dev/null
    fi
    
    if [ -n "$CLIENT_PID" ]; then
        kill -TERM $CLIENT_PID 2>/dev/null || kill -KILL $CLIENT_PID 2>/dev/null
    fi
    
    # Kill any lingering npm processes
    pkill -f "npm start" 2>/dev/null
    
    exit 0
}

# Set up multiple signal traps
trap cleanup SIGINT SIGTERM EXIT

# Function to handle first time setup
first_time_setup() {
    echo "🔧 First time setup starting..."
    
    # Check if npm is installed
    if ! command -v npm &> /dev/null; then
        echo "❌ npm is not installed. Please install Node.js and npm first."
        exit 1
    fi
    
    # Create client/public directory if it doesn't exist
    mkdir -p client/public
    mkdir -p client/src
    mkdir -p server/models
    
    # Create the index.html file if it doesn't exist
    if [ ! -f "client/public/index.html" ]; then
        echo "📝 Creating index.html..."
        cat > client/public/index.html << 'EOL'
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="theme-color" content="#000000" />
    <meta name="description" content="BlissfulUI - A Replit-inspired Code Editor" />
    <title>BlissfulUI</title>
  </head>
  <body>
    <noscript>You need to enable JavaScript to run this app.</noscript>
    <div id="root"></div>
  </body>
</html>
EOL
    fi
    
    # Create the index.js file if it doesn't exist
    if [ ! -f "client/src/index.js" ]; then
        echo "📝 Creating client index.js..."
        cat > client/src/index.js << 'EOL'
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
EOL
    fi
    
    # Create the index.css file if it doesn't exist
    if [ ! -f "client/src/index.css" ]; then
        echo "📝 Creating client index.css..."
        touch client/src/index.css
    fi
    
    # Install server dependencies if node_modules doesn't exist
    if [ ! -d "server/node_modules" ]; then
        echo "📦 Installing server dependencies..."
        cd server
        npm install
        if [ $? -ne 0 ]; then
            echo "❌ Server dependencies installation failed."
            exit 1
        fi
        cd ..
    else
        echo "✅ Server dependencies already installed."
    fi
    
    # Install client dependencies if node_modules doesn't exist
    if [ ! -d "client/node_modules" ]; then
        echo "📦 Installing client dependencies..."
        cd client
        npm install
        if [ $? -ne 0 ]; then
            echo "❌ Client dependencies installation failed."
            exit 1
        fi
        
        # Check if monaco editor is installed
        if ! grep -q "@monaco-editor/react" "package.json"; then
            echo "📦 Installing Monaco Editor..."
            npm install --save @monaco-editor/react
            if [ $? -ne 0 ]; then
                echo "⚠️ Monaco editor installation failed. Trying alternative method..."
                npm install --legacy-peer-deps --save @monaco-editor/react
                if [ $? -ne 0 ]; then
                    echo "❌ Failed to install Monaco editor. UI will have limited functionality."
                else
                    echo "✅ Monaco editor installed with legacy peer deps."
                fi
            fi
        fi
        cd ..
    else
        echo "✅ Client dependencies already installed."
    fi
    
    echo "✅ Setup completed successfully!"
    echo "🚀 Starting application..."
}

# Check if this is first run
if [ ! -d "server/node_modules" ] || [ ! -d "client/node_modules" ]; then
    first_time_setup
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

# Keep script running but check if processes are still alive
while kill -0 $SERVER_PID 2>/dev/null && kill -0 $CLIENT_PID 2>/dev/null; do
    sleep 1
done

# If we reach here, one of the processes died
echo "⚠️ One of the applications has stopped unexpectedly."
cleanup 