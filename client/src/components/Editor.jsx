import { useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

function Editor({ code, language, onChange, socket }) {
  const editorRef = useRef(null);
  const [isEditorReady, setIsEditorReady] = useState(false);
  const [modelPath, setModelPath] = useState('');
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.95
  });

  const handleEditorDidMount = (editor, monaco) => {
    editorRef.current = editor;
    setIsEditorReady(true);

    // Define a custom theme to match Replit style
    monaco.editor.defineTheme('replitTheme', {
      base: 'vs-dark',
      inherit: true,
      rules: [
        { token: 'comment', foreground: '6A737D' },
        { token: 'keyword', foreground: 'FF79C6', fontStyle: 'bold' },
        { token: 'string', foreground: 'FFAB70' },
        { token: 'number', foreground: 'F78C6C' },
        { token: 'type', foreground: '79B8FF' },
        { token: 'function', foreground: 'B392F0' },
        { token: 'variable', foreground: 'E1E4E8' },
        { token: 'operator', foreground: '79B8FF' }
      ],
      colors: {
        'editor.background': '#13151F',
        'editor.foreground': '#E1E4E8',
        'editorLineNumber.foreground': '#444D56',
        'editorCursor.foreground': '#FFFFFF',
        'editor.selectionBackground': '#284566',
        'editor.lineHighlightBackground': '#1C212E',
        'editorLineNumber.activeForeground': '#C9D1D9',
        'scrollbarSlider.background': '#30363D80',
        'scrollbarSlider.hoverBackground': '#484F5880',
        'scrollbarSlider.activeBackground': '#6E768180',
      }
    });
    
    // Set the new theme
    monaco.editor.setTheme('replitTheme');
    
    // Adjust editor options
    editor.updateOptions({
      fontSize: 14,
      fontFamily: "'JetBrains Mono', 'Menlo', 'Monaco', 'Courier New', monospace",
      minimap: { enabled: true, scale: 0.75 },
      scrollBeyondLastLine: false,
      renderLineHighlight: 'all',
      lineNumbers: 'on',
      cursorBlinking: 'smooth',
      cursorSmoothCaretAnimation: true,
      smoothScrolling: true,
      padding: { top: 12, bottom: 12 }
    });
  };

  const handleCompletion = async () => {
    const editor = editorRef.current;
    if (!editor) return;

    const selection = editor.getSelection();
    const prompt = editor.getModel().getValueInRange(selection);

    socket.emit('get-completion', { 
      prompt,
      parameters,
      modelPath
    });
    
    socket.once('completion-result', ({ completion }) => {
      editor.executeEdits('completion', [{
        range: selection,
        text: completion,
      }]);
    });
  };

  const handleModelPathChange = (e) => {
    setModelPath(e.target.value);
    // Notify server of model change
    fetch('http://localhost:3001/api/model/load', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ modelPath: e.target.value })
    });
  };

  const handleParameterChange = (param, value) => {
    setParameters(prev => ({
      ...prev,
      [param]: parseFloat(value)
    }));
  };

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <MonacoEditor
        height="100%"
        width="100%"
        language={language}
        value={code}
        onChange={onChange}
        onMount={handleEditorDidMount}
        options={{
          automaticLayout: true,
          scrollBeyondLastLine: false,
          wordWrap: 'on'
        }}
      />
      <button 
        className="completion-button"
        onClick={handleCompletion}
        style={{
          position: 'absolute',
          bottom: '16px',
          right: '16px',
          background: '#3578E5',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          padding: '8px 12px',
          cursor: 'pointer',
          fontSize: '13px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
        }}
      >
        Get AI Completion
      </button>
    </div>
  );
}

export default Editor; 