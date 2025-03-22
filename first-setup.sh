#!/bin/bash

echo "BlissfulUI - First Time Setup"
echo "----------------------------"

# Make run script executable
chmod +x run.sh

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js and npm first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

# Verify installations
if [ -d "server/node_modules" ] && [ -d "client/node_modules" ]; then
    echo "✅ Dependencies installed successfully!"
    echo "🚀 You can now run the application with: ./run.sh"
else
    echo "❌ Installation failed. Please check the error messages above."
    exit 1
fi 