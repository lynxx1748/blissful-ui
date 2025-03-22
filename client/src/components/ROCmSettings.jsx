import { useState, useEffect } from 'react';

function ROCmSettings() {
  const [compatibility, setCompatibility] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pytorchStatus, setPytorchStatus] = useState(null);
  const [installing, setInstalling] = useState(false);
  const [installProgress, setInstallProgress] = useState(null);
  const [onnxStatus, setOnnxStatus] = useState(null);
  const [tensorflowStatus, setTensorflowStatus] = useState(null);

  useEffect(() => {
    checkCompatibility();
    checkPyTorchStatus();
    checkONNXStatus();
    checkTensorFlowStatus();
  }, []);

  const checkCompatibility = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/system/rocm-compatibility');
      const data = await response.json();
      setCompatibility(data);
    } catch (error) {
      setError('Failed to check system compatibility');
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const checkPyTorchStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rocm/pytorch/status');
      const status = await response.json();
      setPytorchStatus(status);
    } catch (error) {
      console.error('Failed to check PyTorch status:', error);
    }
  };

  const checkONNXStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rocm/onnx/status');
      const status = await response.json();
      setOnnxStatus(status);
    } catch (error) {
      console.error('Failed to check ONNX status:', error);
    }
  };

  const checkTensorFlowStatus = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/rocm/tensorflow/status');
      const status = await response.json();
      setTensorflowStatus(status);
    } catch (error) {
      console.error('Failed to check TensorFlow status:', error);
    }
  };

  const handleInstallPyTorch = async () => {
    setInstalling(true);
    setInstallProgress({ status: 'Starting installation...', progress: 0 });
    
    try {
      const response = await fetch('http://localhost:3001/api/rocm/pytorch/install', {
        method: 'POST'
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const events = decoder.decode(value).split('\n\n');
        for (const event of events) {
          if (!event.trim()) continue;
          
          const data = JSON.parse(event.replace('data: ', ''));
          if (data.done) {
            if (data.success) {
              await checkPyTorchStatus();
            } else {
              throw new Error(data.error);
            }
            break;
          } else {
            setInstallProgress(data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to install PyTorch:', error);
      setInstallProgress({ status: `Installation failed: ${error.message}`, progress: -1 });
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstallPyTorch = async () => {
    if (!window.confirm('Are you sure you want to uninstall PyTorch?')) return;
    
    setInstalling(true);
    try {
      const response = await fetch('http://localhost:3001/api/rocm/pytorch/uninstall', {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        await checkPyTorchStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to uninstall PyTorch:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallONNX = async () => {
    setInstalling(true);
    setInstallProgress({ status: 'Starting ONNX installation...', progress: 0 });
    
    try {
      const response = await fetch('http://localhost:3001/api/rocm/onnx/install', {
        method: 'POST'
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const events = decoder.decode(value).split('\n\n');
        for (const event of events) {
          if (!event.trim()) continue;
          
          const data = JSON.parse(event.replace('data: ', ''));
          if (data.done) {
            if (data.success) {
              await checkONNXStatus();
            } else {
              throw new Error(data.error);
            }
            break;
          } else {
            setInstallProgress(data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to install ONNX:', error);
      setInstallProgress({ status: `Installation failed: ${error.message}`, progress: -1 });
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstallONNX = async () => {
    if (!window.confirm('Are you sure you want to uninstall ONNX Runtime?')) return;
    
    setInstalling(true);
    try {
      const response = await fetch('http://localhost:3001/api/rocm/onnx/uninstall', {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        await checkONNXStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to uninstall ONNX:', error);
    } finally {
      setInstalling(false);
    }
  };

  const handleInstallTensorFlow = async () => {
    setInstalling(true);
    setInstallProgress({ status: 'Starting TensorFlow installation...', progress: 0 });
    
    try {
      const response = await fetch('http://localhost:3001/api/rocm/tensorflow/install', {
        method: 'POST'
      });
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        
        const events = decoder.decode(value).split('\n\n');
        for (const event of events) {
          if (!event.trim()) continue;
          
          const data = JSON.parse(event.replace('data: ', ''));
          if (data.done) {
            if (data.success) {
              await checkTensorFlowStatus();
            } else {
              throw new Error(data.error);
            }
            break;
          } else {
            setInstallProgress(data);
          }
        }
      }
    } catch (error) {
      console.error('Failed to install TensorFlow:', error);
      setInstallProgress({ status: `Installation failed: ${error.message}`, progress: -1 });
    } finally {
      setInstalling(false);
    }
  };

  const handleUninstallTensorFlow = async () => {
    if (!window.confirm('Are you sure you want to uninstall TensorFlow?')) return;
    
    setInstalling(true);
    try {
      const response = await fetch('http://localhost:3001/api/rocm/tensorflow/uninstall', {
        method: 'POST'
      });
      const result = await response.json();
      if (result.success) {
        await checkTensorFlowStatus();
      } else {
        throw new Error(result.error);
      }
    } catch (error) {
      console.error('Failed to uninstall TensorFlow:', error);
    } finally {
      setInstalling(false);
    }
  };

  if (loading) return <div className="rocm-settings loading">Checking system compatibility...</div>;
  if (error) return <div className="rocm-settings error">{error}</div>;
  if (!compatibility) return null;

  const { os, kernel, gpu, rocm, frameworks } = compatibility;

  return (
    <div className="rocm-settings">
      <h2>ROCm Compatibility Check</h2>
      
      <div className="compatibility-section">
        <h3>System Requirements</h3>
        <div className={`requirement ${os.supported ? 'supported' : 'unsupported'}`}>
          <span className="label">Operating System:</span>
          <span className="value">Ubuntu {os.version}</span>
          {!os.supported && (
            <span className="warning">
              Requires Ubuntu {Object.keys(os.supported).join(' or ')}
            </span>
          )}
        </div>

        <div className={`requirement ${kernel.supported ? 'supported' : 'unsupported'}`}>
          <span className="label">Kernel Version:</span>
          <span className="value">{kernel.version}</span>
          {!kernel.supported && (
            <span className="warning">
              Requires kernel {os.requiredKernel} or higher
            </span>
          )}
        </div>

        <div className={`requirement ${gpu.supported ? 'supported' : 'unsupported'}`}>
          <span className="label">GPU Model:</span>
          <span className="value">{gpu.model || 'Not detected'}</span>
          {!gpu.supported && <span className="warning">Unsupported GPU model</span>}
        </div>
      </div>

      <div className="rocm-status">
        <h3>ROCm Status</h3>
        <div className={`status ${rocm.installed ? 'installed' : 'not-installed'}`}>
          {rocm.installed ? (
            <>
              <span className="label">Installed Version:</span>
              <span className="value">{rocm.version}</span>
            </>
          ) : (
            <span className="warning">ROCm is not installed</span>
          )}
        </div>
      </div>

      <div className="framework-support">
        <h3>Framework Support</h3>
        {Object.entries(frameworks).map(([name, info]) => (
          <div key={name} className="framework">
            <span className="name">{name}</span>
            <span className="version">v{info.version}</span>
            <span className="status">{info.status}</span>
          </div>
        ))}
      </div>

      <div className="pytorch-section">
        <h3>PyTorch Installation</h3>
        {pytorchStatus && (
          <div className="pytorch-status">
            <div className={`status ${pytorchStatus.installed ? 'installed' : 'not-installed'}`}>
              {pytorchStatus.installed ? (
                <>
                  <span className="label">PyTorch Status:</span>
                  <span className="value">Installed</span>
                  <span className="device-name">{pytorchStatus.deviceName}</span>
                  <div className="triton-status">
                    PyTorch Triton: {pytorchStatus.tritonInstalled ? 'Installed' : 'Not Installed'}
                  </div>
                  <button 
                    onClick={handleUninstallPyTorch} 
                    disabled={installing}
                  >
                    Uninstall
                  </button>
                </>
              ) : (
                <>
                  <span className="warning">PyTorch is not installed</span>
                  <button 
                    onClick={handleInstallPyTorch} 
                    disabled={installing}
                  >
                    Install PyTorch
                  </button>
                </>
              )}
            </div>
            {pytorchStatus.installed && (
              <pre className="env-info">
                {pytorchStatus.environmentInfo}
              </pre>
            )}
          </div>
        )}
        {installProgress && (
          <div className={`install-progress ${installProgress.progress < 0 ? 'error' : ''}`}>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.max(0, installProgress.progress)}%` }}
              />
            </div>
            <div className="progress-status">{installProgress.status}</div>
          </div>
        )}
      </div>

      <div className="onnx-section">
        <h3>ONNX Runtime Installation</h3>
        {onnxStatus && (
          <div className="onnx-status">
            <div className={`status ${onnxStatus.installed ? 'installed' : 'not-installed'}`}>
              {onnxStatus.installed ? (
                <>
                  <span className="label">ONNX Runtime Status:</span>
                  <span className="value">Installed (v{onnxStatus.version})</span>
                  <div className="providers">
                    Available Providers: {onnxStatus.providers.join(', ')}
                  </div>
                  <button 
                    onClick={handleUninstallONNX} 
                    disabled={installing}
                  >
                    Uninstall
                  </button>
                </>
              ) : (
                <>
                  <span className="warning">ONNX Runtime is not installed</span>
                  <button 
                    onClick={handleInstallONNX} 
                    disabled={installing}
                  >
                    Install ONNX Runtime
                  </button>
                </>
              )}
            </div>
          </div>
        )}
        {installProgress && (
          <div className={`install-progress ${installProgress.progress < 0 ? 'error' : ''}`}>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.max(0, installProgress.progress)}%` }}
              />
            </div>
            <div className="progress-status">{installProgress.status}</div>
          </div>
        )}
      </div>

      <div className="tensorflow-section">
        <h3>TensorFlow Installation</h3>
        {tensorflowStatus && (
          <div className="tensorflow-status">
            <div className={`status ${tensorflowStatus.installed ? 'installed' : 'not-installed'}`}>
              {tensorflowStatus.installed ? (
                <>
                  <span className="label">TensorFlow Status:</span>
                  <span className="value">Installed (v{tensorflowStatus.version})</span>
                  <div className="gpu-info">
                    GPU Support: {tensorflowStatus.hasGPU ? 'Available' : 'Not Available'}
                  </div>
                  <button 
                    onClick={handleUninstallTensorFlow} 
                    disabled={installing}
                  >
                    Uninstall
                  </button>
                </>
              ) : (
                <>
                  <span className="warning">TensorFlow is not installed</span>
                  <button 
                    onClick={handleInstallTensorFlow} 
                    disabled={installing}
                  >
                    Install TensorFlow
                  </button>
                </>
              )}
            </div>
            {tensorflowStatus.installed && tensorflowStatus.gpuInfo && (
              <pre className="env-info">
                {tensorflowStatus.gpuInfo}
              </pre>
            )}
          </div>
        )}
        {installProgress && (
          <div className={`install-progress ${installProgress.progress < 0 ? 'error' : ''}`}>
            <div className="progress-bar">
              <div 
                className="progress-fill"
                style={{ width: `${Math.max(0, installProgress.progress)}%` }}
              />
            </div>
            <div className="progress-status">{installProgress.status}</div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ROCmSettings; 