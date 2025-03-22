import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Editor from './components/Editor';
import { io } from 'socket.io-client';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Settings from './components/Settings';

const socket = io('http://localhost:3001');

function App() {
  const [roomId, setRoomId] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');
  const [activeTab, setActiveTab] = useState('index.js');
  const [files, setFiles] = useState([
    { name: 'index.js', type: 'file', content: '' },
    { name: 'README.md', type: 'file', content: '# BlissfulUI\n\nA Replit-inspired code editor' },
    { name: 'styles', type: 'folder', expanded: true, children: [
      { name: 'main.css', type: 'file', content: 'body { font-family: sans-serif; }' }
    ]},
    { name: 'components', type: 'folder', expanded: false, children: [
      { name: 'Header.jsx', type: 'file', content: 'export default function Header() { return <header>Header</header> }' },
      { name: 'Footer.jsx', type: 'file', content: 'export default function Footer() { return <footer>Footer</footer> }' }
    ]}
  ]);
  const [consoleOutput, setConsoleOutput] = useState('Welcome to BlissfulUI terminal\n> ');

  useEffect(() => {
    const newRoomId = uuidv4();
    setRoomId(newRoomId);
    socket.emit('join-room', newRoomId);

    socket.on('load-code', ({ code, language }) => {
      setCode(code);
      setLanguage(language);
    });

    socket.on('code-change', ({ code, language }) => {
      setCode(code);
      setLanguage(language);
    });

    return () => {
      socket.off('load-code');
      socket.off('code-change');
    };
  }, []);

  const handleCodeChange = (newCode) => {
    setCode(newCode);
    socket.emit('code-change', { roomId, code: newCode, language });
  };

  const handleLanguageChange = (newLanguage) => {
    setLanguage(newLanguage);
    socket.emit('code-change', { roomId, code, language: newLanguage });
  };

  const toggleFolder = (path) => {
    // Implementation for expanding/collapsing folders
    const newFiles = [...files];
    const traverse = (items, pathSegments, depth = 0) => {
      for (let i = 0; i < items.length; i++) {
        if (items[i].name === pathSegments[depth]) {
          if (depth === pathSegments.length - 1) {
            items[i].expanded = !items[i].expanded;
            return true;
          } else if (items[i].children) {
            return traverse(items[i].children, pathSegments, depth + 1);
          }
        }
      }
      return false;
    };
    
    traverse(newFiles, [path]);
    setFiles(newFiles);
  };

  const handleRun = () => {
    setConsoleOutput(prev => 
      prev + '\n> Running ' + activeTab + '...\n' + 
      'Console output will appear here.\n' +
      '> '
    );
  };

  const renderFileTree = (items, path = '') => {
    return (
      <ul className="file-tree">
        {items.map((item) => {
          const currentPath = path ? `${path}/${item.name}` : item.name;
          
          if (item.type === 'folder') {
            return (
              <li key={currentPath} className="file-item">
                <div 
                  className={`file-row ${activeTab === currentPath ? 'selected' : ''}`}
                  onClick={() => toggleFolder(currentPath)}
                >
                  <span className="file-icon">
                    {item.expanded ? '📂' : '📁'}
                  </span>
                  <span className="file-name">{item.name}</span>
                </div>
                {item.expanded && item.children && (
                  <div className="folder-contents">
                    {renderFileTree(item.children, currentPath)}
                  </div>
                )}
              </li>
            );
          } else {
            return (
              <li key={currentPath} className="file-item">
                <div 
                  className={`file-row ${activeTab === currentPath ? 'selected' : ''}`}
                  onClick={() => setActiveTab(currentPath)}
                >
                  <span className="file-icon">
                    {item.name.endsWith('.js') || item.name.endsWith('.jsx') ? '📄' : 
                     item.name.endsWith('.css') ? '🎨' : 
                     item.name.endsWith('.md') ? '📝' : '📄'}
                  </span>
                  <span className="file-name">{item.name}</span>
                </div>
              </li>
            );
          }
        })}
      </ul>
    );
  };

  return (
    <Router>
      <Routes>
        <Route path="/" element={
          <div className="App">
            <header className="main-header">
              <div className="file-tabs">
                <button className={`file-tab ${activeTab === 'index.js' ? 'active' : ''}`}>
                  index.js
                  <span className="close-icon">×</span>
                </button>
                <button className="file-tab">
                  App.jsx
                  <span className="close-icon">×</span>
                </button>
                <button className="new-tab-btn">+</button>
              </div>
              <div className="search-bar">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16">
                  <path fill="currentColor" d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                </svg>
                <input type="text" placeholder="Search" />
              </div>
              <div className="user-actions">
                <button title="Settings">⚙️</button>
                <button title="Profile">👤</button>
              </div>
            </header>
            
            <div className="sidebar">
              <div className="sidebar-header">
                <span className="sidebar-title">Files</span>
                <div className="sidebar-actions">
                  <button title="New File">+</button>
                  <button title="Upload">↑</button>
                </div>
              </div>
              <div className="files-section">
                {renderFileTree(files)}
              </div>
            </div>
            
            <div className="main-content">
              <div className="editor-container">
                <div className="editor-toolbar">
                  <div className="language-selector">
                    <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
                      <option value="javascript">JavaScript</option>
                      <option value="python">Python</option>
                      <option value="java">Java</option>
                      <option value="cpp">C++</option>
                      <option value="csharp">C#</option>
                      <option value="php">PHP</option>
                      <option value="rust">Rust</option>
                      <option value="go">Go</option>
                    </select>
                  </div>
                  <button className="run-button" onClick={handleRun}>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                      <path fill="currentColor" d="M8 5v14l11-7z"/>
                    </svg>
                    Run
                  </button>
                </div>
                <div className="editor-wrapper">
                  <Editor
                    code={code}
                    language={language}
                    onChange={handleCodeChange}
                    socket={socket}
                  />
                </div>
              </div>
              <div className="console-area">
                <div className="console-header">
                  <span className="console-title">Console</span>
                  <div className="console-actions">
                    <button title="Clear console">🗑️</button>
                    <button title="Options">⋮</button>
                  </div>
                </div>
                <div className="console-output">
                  {consoleOutput}
                </div>
              </div>
            </div>
          </div>
        } />
        
        <Route path="/settings" element={<Settings />} />
      </Routes>
    </Router>
  );
}

export default App; 