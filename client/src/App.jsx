import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Editor from './components/Editor';
import { io } from 'socket.io-client';
import SystemStatus from './components/SystemStatus';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import Settings from './components/Settings';

const socket = io('http://localhost:3001');

function App() {
  const [roomId, setRoomId] = useState('');
  const [code, setCode] = useState('');
  const [language, setLanguage] = useState('javascript');

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

  return (
    <Router>
      <div className="App">
        <SystemStatus />
        <nav className="main-nav">
          <Link to="/">Editor</Link>
          <Link to="/settings">Settings</Link>
        </nav>
        <Routes>
          <Route path="/" element={
            <div className="editor-container">
              <div className="language-selector">
                <select value={language} onChange={(e) => handleLanguageChange(e.target.value)}>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="java">Java</option>
                </select>
              </div>
              <Editor
                code={code}
                language={language}
                onChange={handleCodeChange}
                socket={socket}
              />
            </div>
          } />
          <Route path="/settings" element={<Settings />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App; 