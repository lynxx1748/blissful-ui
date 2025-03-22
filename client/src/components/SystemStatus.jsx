import { useState, useEffect } from 'react';

function SystemStatus() {
  const [systemInfo, setSystemInfo] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemInfo();
  }, []);

  const fetchSystemInfo = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/system/info');
      const info = await response.json();
      setSystemInfo(info);
    } catch (error) {
      console.error('Error fetching system info:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="system-status loading">Checking system...</div>;
  }

  if (!systemInfo) {
    return <div className="system-status error">Unable to detect system configuration</div>;
  }

  return (
    <div className="system-status">
      {systemInfo.hasCUDA && (
        <div className="gpu-info nvidia">
          <span className="gpu-icon">🟢</span>
          <span className="gpu-label">NVIDIA</span>
          <span className="gpu-details">
            {systemInfo.gpuDetails} | 
            Driver: {systemInfo.gpuDriver} | 
            Memory: {systemInfo.gpuMemory}
          </span>
        </div>
      )}
      
      {systemInfo.hasROCm && (
        <div className="gpu-info amd">
          <span className="gpu-icon">🟢</span>
          <span className="gpu-label">AMD ROCm</span>
          <span className="gpu-details">
            {systemInfo.gpuDetails} | 
            Driver: {systemInfo.gpuDriver} | 
            Memory: {systemInfo.gpuMemory}
          </span>
        </div>
      )}
      
      {!systemInfo.hasCUDA && !systemInfo.hasROCm && (
        <div className="gpu-info none">
          <span className="gpu-icon">⚠️</span>
          <span className="gpu-label">No GPU Acceleration</span>
        </div>
      )}
    </div>
  );
}

export default SystemStatus; 