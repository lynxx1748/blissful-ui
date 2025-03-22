const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

class SystemChecker {
  constructor() {
    this.gpuInfo = null;
  }

  async checkSystem() {
    const info = {
      hasROCm: false,
      hasCUDA: false,
      gpuDetails: null,
      gpuDriver: null,
      gpuMemory: null
    };

    try {
      // Check for NVIDIA GPU
      const nvidiaSmiResult = await execAsync('nvidia-smi --query-gpu=gpu_name,driver_version,memory.total --format=csv,noheader');
      if (nvidiaSmiResult.stdout) {
        const [name, driver, memory] = nvidiaSmiResult.stdout.trim().split(', ');
        info.hasCUDA = true;
        info.gpuDetails = name;
        info.gpuDriver = driver;
        info.gpuMemory = memory;
      }
    } catch {
      // NVIDIA GPU not found, check for AMD
      try {
        const rocmSmiResult = await execAsync('rocm-smi --showproductname --showdriver --showmeminfo');
        if (rocmSmiResult.stdout) {
          const output = rocmSmiResult.stdout;
          info.hasROCm = true;
          
          // Parse ROCm output
          const gpuMatch = output.match(/GPU\[[\d]+\] : (.*)/);
          const driverMatch = output.match(/Driver version: (.*)/);
          const memoryMatch = output.match(/Total Memory \(GB\): ([\d.]+)/);

          info.gpuDetails = gpuMatch ? gpuMatch[1] : null;
          info.gpuDriver = driverMatch ? driverMatch[1] : null;
          info.gpuMemory = memoryMatch ? `${memoryMatch[1]} GB` : null;
        }
      } catch {
        // No GPU found or commands not available
        console.log('No supported GPU detected');
      }
    }

    this.gpuInfo = info;
    return info;
  }

  getGPUInfo() {
    return this.gpuInfo;
  }
}

module.exports = new SystemChecker(); 