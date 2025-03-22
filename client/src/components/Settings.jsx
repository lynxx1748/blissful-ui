import { useState } from 'react';
import ROCmSettings from './ROCmSettings';

function Settings() {
  const [activeTab, setActiveTab] = useState('amd');

  const tabs = {
    amd: {
      label: 'AMD Control Panel',
      component: ROCmSettings
    },
    models: {
      label: 'Model Management',
      component: () => <div>Model Management (Coming Soon)</div>
    },
    editor: {
      label: 'Editor Settings',
      component: () => <div>Editor Settings (Coming Soon)</div>
    }
  };

  return (
    <div className="settings-page">
      <div className="settings-sidebar">
        {Object.entries(tabs).map(([key, { label }]) => (
          <button
            key={key}
            className={`tab-button ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="settings-content">
        {React.createElement(tabs[activeTab].component)}
        <div className="settings-footer">
          <p>
            Special thanks to <a href="https://github.com/Samiii777/AMD_MachineLearning" target="_blank" rel="noopener noreferrer">Samiii777</a> for the original AMD ML installation scripts.
          </p>
        </div>
      </div>
    </div>
  );
}

export default Settings; 