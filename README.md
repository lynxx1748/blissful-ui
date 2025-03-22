# BlissfulUI - An Open Source Replit-Inspired Code Editor

A work-in-progress attempt at creating a Replit-like web UI for local development, with special focus on AMD GPU support and AI integration. This project aims to provide a seamless development environment that combines code editing, AI assistance, and machine learning framework management.

## Current Features

- **Replit-Style Code Editor**
  - Real-time collaborative editing
  - Multi-language support
  - AI-powered code completion
  - Live preview (coming soon)
  - Live Sandbox Testing (coming soon)

- **AMD ROCm Integration**
  - One-click installation for ROCm 6.3.4
  - ML Framework management:
    - PyTorch
    - TensorFlow
    - ONNX Runtime
  - Real-time GPU status monitoring
  - Framework version control

- **AI Integration**
  - Works with local LLM models
  - Cloud model support (coming soon)
  - Code completion
  - Context-aware suggestions

## Use Cases

- **Local Development Environment**
  - Perfect for developers who want Replit-like features but with local control
  - Ideal for working with large AI models locally
  - Great for teams that need collaborative features with privacy

- **ML Development on AMD GPUs**
  - Streamlined setup for ML frameworks on AMD hardware
  - Easy framework version management
  - GPU performance monitoring

- **Educational Environment**
  - Great for teaching coding with real-time collaboration
  - Built-in AI assistance for learning
  - Local hosting for better privacy and control

## System Requirements

### Linux (Full Support)
- Ubuntu 22.04 or 24.04
- Supported AMD GPUs (7000 series):
  - AMD Radeon RX 7900 XTX
  - AMD Radeon RX 7900 XT
  - AMD Radeon RX 7900 GRE
  - AMD Radeon PRO W7900
  - AMD Radeon PRO W7900 Dual Slot
  - AMD Radeon PRO W7800
  - AMD Radeon PRO W7800 48GB

### Windows (Limited Support)
- Windows 10/11
- NVIDIA GPU with CUDA support
  - ROCm is not supported on Windows
  - Alternative options for Windows users:
    1. Use NVIDIA GPU with CUDA
    2. Use cloud-based API services
    3. Install Ubuntu 22.04/24.04 for full AMD support

## Running the Application

### First Time Setup

#### On Linux (Ubuntu)
Copy and run these commands:

```bash
# Clone the repository
git clone https://github.com/lynxx1748/blissful-ui.git

# Navigate to project directory
cd blissful-ui

# Make the run script executable
chmod +x run.sh

# Run the application (first run will install dependencies)
./run.sh
```

#### On Windows
Copy and run these commands in PowerShell:

```powershell
# Clone the repository
git clone https://github.com/lynxx1748/blissful-ui.git

# Navigate to project directory
cd blissful-ui

# Install dependencies
npm install
```

### Starting the Application

#### On Linux (Ubuntu)
Just run:
```bash
./run.sh
```

#### On Windows
Run in PowerShell:
```powershell
# In first PowerShell window
cd server; npm start

# In second PowerShell window
cd client; npm start
```

Or use our PowerShell script (recommended):
```powershell
.\run.ps1
```

Your browser will automatically open to `http://localhost:3000`

### Stopping the Application

#### On Linux
Press `Ctrl+C` in the terminal where run.sh is running.

#### On Windows
Press `Ctrl+C` in both PowerShell windows, or in the window running run.ps1.

## GPU Support Matrix

| Operating System | AMD (ROCm) | NVIDIA (CUDA) | Cloud API |
|-----------------|------------|---------------|-----------|
| Ubuntu 22.04    | ✅         | ✅            | ✅        |
| Ubuntu 24.04    | ✅         | ✅            | ✅        |
| Windows 10/11   | ❌         | ✅            | ✅        |

### For Windows Users Wanting ROCm Support
If you want to use AMD GPUs with ROCm, you have two options:

1. **Dual Boot Setup**
   - Install Ubuntu 22.04 or 24.04 alongside Windows
   - Follow the Linux installation instructions
   - Use the ROCm installer in the AMD Control Panel

2. **Virtual Machine** (Not Recommended for ML workloads)
   - Install Ubuntu in a VM
   - Note: GPU passthrough is complex and may not provide optimal performance

Note: To stop both server and client, press Ctrl+C in the terminal where run.sh is running. 