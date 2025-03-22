const { exec } = require('child_process');
const { promisify } = require('util');
const os = require('os');
const fs = require('fs').promises;
const path = require('path');
const execAsync = promisify(exec);

class ROCmManager {
  constructor() {
    this.supportedGPUs = [
      'AMD Radeon RX 7900 XTX',
      'AMD Radeon RX 7900 XT',
      'AMD Radeon RX 7900 GRE',
      'AMD Radeon PRO W7900',
      'AMD Radeon PRO W7900 Dual Slot',
      'AMD Radeon PRO W7800',
      'AMD Radeon PRO W7800 48GB'
    ];

    this.supportMatrix = {
      ubuntu: {
        '24.04': { kernel: '6.11', supported: true },
        '22.04': { kernel: '6.8', supported: true }
      },
      rocmVersion: '6.3.4',
      frameworks: {
        pytorch: { version: '2.4.0', rocmVersion: '6.3.4', status: 'production' },
        tensorflow: { version: '2.17.0', rocmVersion: '6.3.4', status: 'production' },
        onnx: { version: '1.19', rocmVersion: '6.3.4', status: 'production' },
        triton: { version: '3.0.0', rocmVersion: '6.3.4', status: 'production' }
      }
    };

    this.logFile = path.join(process.cwd(), 'logs', 'rocm-install.log');
    this.pipDependencies = [
      'numpy==1.26.4',
      'diffusers',
      'transformers',
      'accelerate',
      'onnx',
      'pandas',
      'opencv-python',
      'onnxconverter_common',
      'sentencepiece',
      'datasets',
      'evaluate',
      'matplotlib'
    ];
  }

  async log(level, message) {
    const timestamp = new Date().toISOString();
    const logEntry = `${timestamp} [${level}] ${message}\n`;
    
    await fs.mkdir(path.dirname(this.logFile), { recursive: true });
    await fs.appendFile(this.logFile, logEntry);
    
    // Also log to console for debugging
    console.log(`${level}: ${message}`);
  }

  async checkAndInstallPackage(packageName) {
    try {
      await this.log('INFO', `Checking package: ${packageName}`);
      await execAsync(`dpkg -l ${packageName}`);
      await this.log('INFO', `${packageName} is already installed`);
      return true;
    } catch {
      try {
        await this.log('INFO', `Installing package: ${packageName}`);
        await execAsync(`sudo apt-get update && sudo apt-get install -y ${packageName}`);
        await this.log('INFO', `${packageName} installed successfully`);
        return true;
      } catch (error) {
        await this.log('ERROR', `Failed to install ${packageName}: ${error.message}`);
        return false;
      }
    }
  }

  async installPipDependencies() {
    try {
      await this.log('INFO', 'Installing pip dependencies...');
      
      // Install pip itself
      await this.checkAndInstallPackage('python3-pip');
      
      // Upgrade pip and install wheel
      await execAsync('pip3 install --upgrade pip wheel');
      
      // Install each dependency
      for (const dep of this.pipDependencies) {
        await this.log('INFO', `Installing pip package: ${dep}`);
        await execAsync(`pip3 install ${dep}`);
      }
      
      await this.log('INFO', 'All pip dependencies installed successfully');
      return true;
    } catch (error) {
      await this.log('ERROR', `Failed to install pip dependencies: ${error.message}`);
      return false;
    }
  }

  async checkSystemCompatibility() {
    try {
      // Check Ubuntu version
      const osRelease = await execAsync('cat /etc/os-release');
      const ubuntuVersion = osRelease.stdout.match(/VERSION_ID="([\d.]+)"/)[1];
      
      // Check kernel version
      const kernelVersion = await execAsync('uname -r');
      const kernel = kernelVersion.stdout.trim();

      // Check for AMD GPU
      const lspci = await execAsync('lspci | grep -i amd');
      const gpuInfo = lspci.stdout;
      
      // Parse GPU model from lspci output
      const gpuModel = this.parseGPUModel(gpuInfo);
      
      return {
        os: {
          name: 'Ubuntu',
          version: ubuntuVersion,
          supported: this.supportMatrix.ubuntu[ubuntuVersion]?.supported || false,
          requiredKernel: this.supportMatrix.ubuntu[ubuntuVersion]?.kernel
        },
        kernel: {
          version: kernel,
          supported: this.isKernelSupported(kernel)
        },
        gpu: {
          model: gpuModel,
          supported: this.supportedGPUs.some(gpu => gpuModel?.includes(gpu))
        },
        rocm: {
          version: this.supportMatrix.rocmVersion,
          installed: await this.checkROCmInstalled()
        },
        frameworks: this.supportMatrix.frameworks
      };
    } catch (error) {
      console.error('Error checking system compatibility:', error);
      throw error;
    }
  }

  async checkROCmInstalled() {
    try {
      const { stdout } = await execAsync('rocm-smi --version');
      return stdout.trim();
    } catch {
      return false;
    }
  }

  parseGPUModel(lspciOutput) {
    // Add sophisticated GPU model parsing logic here
    // This is a simplified version
    const match = lspciOutput.match(/AMD.*\[(.*?)\]/);
    return match ? match[1].trim() : null;
  }

  isKernelSupported(kernelVersion) {
    // Compare kernel version with required versions
    const version = kernelVersion.split('-')[0];
    return Object.values(this.supportMatrix.ubuntu).some(
      ({ kernel }) => this.compareVersions(version, kernel) >= 0
    );
  }

  compareVersions(v1, v2) {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
      const part1 = parts1[i] || 0;
      const part2 = parts2[i] || 0;
      if (part1 !== part2) return part1 - part2;
    }
    return 0;
  }

  async installPyTorch(progressCallback) {
    try {
      await this.log('INFO', 'Starting PyTorch installation');
      
      // Report progress
      progressCallback?.({ status: 'Installing prerequisites...', progress: 0 });
      
      // Install prerequisites
      await this.installPipDependencies();
      progressCallback?.({ status: 'Prerequisites installed', progress: 20 });

      const ubuntuVersion = await this.getUbuntuVersion();
      const pythonVersion = await this.getPythonVersion();
      
      // Get package information
      const packages = this.getPyTorchPackages(ubuntuVersion, pythonVersion);
      
      // Create temporary directory
      const downloadDir = '/tmp/pytorch-rocm';
      await execAsync(`mkdir -p ${downloadDir}`);
      
      // Download packages
      progressCallback?.({ status: 'Downloading PyTorch packages...', progress: 40 });
      for (const pkg of packages) {
        await this.log('INFO', `Downloading ${pkg.name}...`);
        await execAsync(`wget ${pkg.url} -P ${downloadDir}`);
      }
      
      // Uninstall existing packages
      progressCallback?.({ status: 'Removing existing installations...', progress: 60 });
      await execAsync('pip3 uninstall -y torch torchvision pytorch-triton-rocm torchaudio');
      
      // Install downloaded packages
      progressCallback?.({ status: 'Installing PyTorch...', progress: 80 });
      const installCmd = pythonVersion >= '3.12' 
        ? 'pip3 install --break-system-packages'
        : 'pip3 install';

      const wheelFiles = packages.map(pkg => `${downloadDir}/${pkg.filename}`).join(' ');
      await execAsync(`${installCmd} ${wheelFiles}`);
      
      // Verify installation
      progressCallback?.({ status: 'Verifying installation...', progress: 90 });
      const verificationResult = await this.verifyPyTorchInstallation();
      
      // Cleanup
      await execAsync(`rm -rf ${downloadDir}`);
      
      progressCallback?.({ status: 'Installation complete!', progress: 100 });
      await this.log('INFO', 'PyTorch installation completed successfully');
      
      return { success: true, ...verificationResult };
    } catch (error) {
      await this.log('ERROR', `PyTorch installation failed: ${error.message}`);
      progressCallback?.({ status: `Installation failed: ${error.message}`, progress: -1 });
      return { success: false, error: error.message };
    }
  }

  async uninstallPyTorch() {
    try {
      await execAsync('pip3 uninstall -y torch torchvision pytorch-triton-rocm torchaudio');
      return { success: true };
    } catch (error) {
      console.error('PyTorch uninstallation failed:', error);
      return { success: false, error: error.message };
    }
  }

  getPyTorchPackages(ubuntuVersion, pythonVersion) {
    const pythonTag = ubuntuVersion === '24.04' ? 'cp312-cp312' : 'cp310-cp310';
    const baseUrl = 'https://repo.radeon.com/rocm/manylinux/rocm-rel-6.3.4';
    
    return [
      {
        name: 'torch',
        version: '2.4.0',
        url: `${baseUrl}/torch-2.4.0%2Brocm6.3.4.git7cecbf6d-${pythonTag}-linux_x86_64.whl`,
        filename: 'torch-2.4.0+rocm6.3.4.git7cecbf6d-linux_x86_64.whl'
      },
      {
        name: 'torchvision',
        version: '0.19.0',
        url: `${baseUrl}/torchvision-0.19.0%2Brocm6.3.4.gitfab84886-${pythonTag}-linux_x86_64.whl`,
        filename: 'torchvision-0.19.0+rocm6.3.4.gitfab84886-linux_x86_64.whl'
      },
      {
        name: 'pytorch-triton',
        version: '3.0.0',
        url: `${baseUrl}/pytorch_triton_rocm-3.0.0%2Brocm6.3.4.git75cc27c2-${pythonTag}-linux_x86_64.whl`,
        filename: 'pytorch_triton_rocm-3.0.0+rocm6.3.4.git75cc27c2-linux_x86_64.whl'
      },
      {
        name: 'torchaudio',
        version: '2.4.0',
        url: `${baseUrl}/torchaudio-2.4.0%2Brocm6.3.4.git69d40773-${pythonTag}-linux_x86_64.whl`,
        filename: 'torchaudio-2.4.0+rocm6.3.4.git69d40773-linux_x86_64.whl'
      }
    ];
  }

  async verifyPyTorchInstallation() {
    // Check if PyTorch is installed
    await execAsync('python3 -c "import torch"');

    // Check GPU availability
    const gpuAvailable = await execAsync('python3 -c "import torch; print(torch.cuda.is_available())"');
    if (!gpuAvailable.stdout.trim() === 'True') {
      throw new Error('GPU not detected by PyTorch');
    }

    // Get GPU device name
    const deviceName = await execAsync('python3 -c "import torch; print(torch.cuda.get_device_name(0))"');
    
    // Check Triton installation
    let tritonInstalled = false;
    try {
      await execAsync('python3 -c "import torch.triton"');
      tritonInstalled = true;
    } catch {
      // Triton not installed
    }
    
    // Get full environment info
    const envInfo = await execAsync('python3 -m torch.utils.collect_env');

    return {
      gpuAvailable: true,
      deviceName: deviceName.stdout.trim(),
      tritonInstalled,
      environmentInfo: envInfo.stdout
    };
  }

  async getPyTorchStatus() {
    try {
      const verificationResult = await this.verifyPyTorchInstallation();
      return {
        installed: true,
        ...verificationResult
      };
    } catch {
      return {
        installed: false,
        gpuAvailable: false,
        deviceName: null,
        environmentInfo: null
      };
    }
  }

  async getUbuntuVersion() {
    const { stdout } = await execAsync('lsb_release -r');
    return stdout.split('\t')[1].trim();
  }

  async getPythonVersion() {
    const { stdout } = await execAsync('python3 --version');
    return stdout.split(' ')[1].trim();
  }

  async installONNX(progressCallback) {
    try {
      await this.log('INFO', 'Starting ONNX Runtime installation');
      progressCallback?.({ status: 'Starting ONNX installation...', progress: 0 });

      // Check and install MIGraphX dependencies
      progressCallback?.({ status: 'Checking MIGraphX dependencies...', progress: 10 });
      await this.checkAndInstallPackage('migraphx');
      await this.checkAndInstallPackage('migraphx-dev');
      await this.checkAndInstallPackage('half');

      // Install numpy with specific version (required for compatibility)
      progressCallback?.({ status: 'Installing numpy dependency...', progress: 30 });
      await execAsync('pip3 install numpy==1.26.4');

      // Uninstall existing ONNX Runtime if present
      progressCallback?.({ status: 'Removing existing ONNX installation...', progress: 50 });
      await execAsync('pip3 uninstall -y onnxruntime-rocm');

      // Install ONNX Runtime
      progressCallback?.({ status: 'Installing ONNX Runtime...', progress: 70 });
      await execAsync('pip3 install onnxruntime-rocm -f https://repo.radeon.com/rocm/manylinux/rocm-rel-6.3.4/');

      // Verify installation
      progressCallback?.({ status: 'Verifying installation...', progress: 90 });
      const verificationResult = await this.verifyONNXInstallation();

      progressCallback?.({ status: 'Installation complete!', progress: 100 });
      await this.log('INFO', 'ONNX installation completed successfully');

      return { success: true, ...verificationResult };
    } catch (error) {
      await this.log('ERROR', `ONNX installation failed: ${error.message}`);
      progressCallback?.({ status: `Installation failed: ${error.message}`, progress: -1 });
      return { success: false, error: error.message };
    }
  }

  async uninstallONNX() {
    try {
      await execAsync('pip3 uninstall -y onnxruntime-rocm');
      return { success: true };
    } catch (error) {
      console.error('ONNX uninstallation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyONNXInstallation() {
    // Verify ONNX Runtime installation
    const providers = await execAsync('python3 -c "import onnxruntime as ort; print(ort.get_available_providers())"');
    const providersOutput = providers.stdout.trim();

    // Verify MIGraphX
    await execAsync('/opt/rocm-6.3.4/bin/migraphx-driver perf --test');

    return {
      installed: true,
      providers: JSON.parse(providersOutput.replace(/'/g, '"')),
      version: (await execAsync('python3 -c "import onnxruntime as ort; print(ort.__version__)"')).stdout.trim()
    };
  }

  async getONNXStatus() {
    try {
      const verificationResult = await this.verifyONNXInstallation();
      return {
        installed: true,
        ...verificationResult
      };
    } catch {
      return {
        installed: false,
        providers: [],
        version: null
      };
    }
  }

  async installTensorFlow(progressCallback) {
    try {
      await this.log('INFO', 'Starting TensorFlow installation');
      progressCallback?.({ status: 'Starting TensorFlow installation...', progress: 0 });

      // Install prerequisites
      progressCallback?.({ status: 'Installing prerequisites...', progress: 20 });
      await this.installPipDependencies();

      // Get Ubuntu and Python versions
      const ubuntuVersion = await this.getUbuntuVersion();
      const pythonVersion = await this.getPythonVersion();

      // Uninstall existing TensorFlow
      progressCallback?.({ status: 'Removing existing TensorFlow...', progress: 40 });
      await execAsync('pip3 uninstall -y tensorflow-rocm');

      // Install TensorFlow based on Ubuntu version
      progressCallback?.({ status: 'Installing TensorFlow...', progress: 60 });
      const baseUrl = 'https://repo.radeon.com/rocm/manylinux/rocm-rel-6.3.4';
      const pythonTag = ubuntuVersion === '24.04' ? 'cp312-cp312' : 'cp310-cp310';
      const installCmd = pythonVersion >= '3.12' ? 'pip3 install --break-system-packages' : 'pip3 install';
      
      const wheelUrl = `${baseUrl}/tensorflow_rocm-2.17.0-${pythonTag}-manylinux_2_28_x86_64.whl`;
      await execAsync(`${installCmd} ${wheelUrl}`);

      // Verify installation
      progressCallback?.({ status: 'Verifying installation...', progress: 80 });
      const verificationResult = await this.verifyTensorFlowInstallation();

      progressCallback?.({ status: 'Installation complete!', progress: 100 });
      await this.log('INFO', 'TensorFlow installation completed successfully');

      return { success: true, ...verificationResult };
    } catch (error) {
      await this.log('ERROR', `TensorFlow installation failed: ${error.message}`);
      progressCallback?.({ status: `Installation failed: ${error.message}`, progress: -1 });
      return { success: false, error: error.message };
    }
  }

  async uninstallTensorFlow() {
    try {
      await execAsync('pip3 uninstall -y tensorflow-rocm');
      return { success: true };
    } catch (error) {
      console.error('TensorFlow uninstallation failed:', error);
      return { success: false, error: error.message };
    }
  }

  async verifyTensorFlowInstallation() {
    // Basic import check
    await execAsync('python3 -c "import tensorflow" 2> /dev/null');

    // Get version info
    const version = await execAsync('python3 -c "import tensorflow as tf; print(tf.__version__)"');
    
    // Check GPU availability
    const gpuInfo = await execAsync('python3 -c "import tensorflow as tf; print(tf.config.list_physical_devices(\'GPU\'))"');
    
    return {
      installed: true,
      version: version.stdout.trim(),
      gpuInfo: gpuInfo.stdout.trim(),
      hasGPU: gpuInfo.stdout.includes('GPU')
    };
  }

  async getTensorFlowStatus() {
    try {
      const verificationResult = await this.verifyTensorFlowInstallation();
      return {
        installed: true,
        ...verificationResult
      };
    } catch {
      return {
        installed: false,
        version: null,
        gpuInfo: null,
        hasGPU: false
      };
    }
  }
}

module.exports = new ROCmManager(); 