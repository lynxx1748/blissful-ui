import { useRef, useState } from 'react';
import MonacoEditor from '@monaco-editor/react';

function Editor({ code, language, onChange, socket }) {
  const editorRef = useRef(null);
  const [modelPath, setModelPath] = useState('');
  const [parameters, setParameters] = useState({
    temperature: 0.7,
    maxTokens: 1000,
    topP: 0.95
  });

  const handleEditorDidMount = (editor) => {
    editorRef.current = editor;
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
    <div className="editor-wrapper">
      <div className="model-controls">
        <input
          type="text"
          placeholder="Model Path (optional)"
          value={modelPath}
          onChange={handleModelPathChange}
          className="model-path-input"
        />
        <div className="parameter-controls">
          <label>
            Temperature:
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={parameters.temperature}
              onChange={(e) => handleParameterChange('temperature', e.target.value)}
            />
            {parameters.temperature}
          </label>
          <label>
            Max Tokens:
            <input
              type="number"
              min="100"
              max="2000"
              value={parameters.maxTokens}
              onChange={(e) => handleParameterChange('maxTokens', e.target.value)}
            />
          </label>
        </div>
      </div>
      <MonacoEditor
        height="90vh"
        language={language}
        value={code}
        onChange={onChange}
        onMount={handleEditorDidMount}
        theme="vs-dark"
        options={{
          minimap: { enabled: false },
          fontSize: 14,
          wordWrap: 'on',
          automaticLayout: true,
        }}
      />
      <button 
        className="completion-button"
        onClick={handleCompletion}
      >
        Get AI Completion
      </button>
    </div>
  );
}

export default Editor; 