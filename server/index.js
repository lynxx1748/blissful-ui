const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3').verbose();
const config = require('./config');
const path = require('path');
const modelManager = require('./modelManager');
const systemChecker = require('./systemChecker');
const rocmManager = require('./rocmManager');

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:3000",
    methods: ["GET", "POST"]
  }
});

// Model management
let model, context, session;

async function initializeModel(modelPath) {
  try {
    if (!modelPath) {
      const models = await modelManager.findModels();
      if (models.length > 0) {
        modelPath = models[0].path;
      }
    }
    
    if (!modelPath) {
      throw new Error('No model found');
    }

    // Use dynamic import for node-llama-cpp
    const { LlamaModel, LlamaContext, LlamaChatSession } = await import('node-llama-cpp');

    model = new LlamaModel({
      modelPath,
      contextSize: config.model.contextSize,
      temperature: config.model.temperature,
    });
    context = new LlamaContext({ model });
    session = new LlamaChatSession({ context });
    modelManager.setCurrentModel(modelPath);
    console.log('Model initialized successfully');
    return true;
  } catch (error) {
    console.error('Error initializing model:', error);
    return false;
  }
}

// API endpoints for model management
app.post('/api/model/load', express.json(), async (req, res) => {
  const { modelPath } = req.body;
  if (!modelPath) {
    return res.status(400).json({ error: 'Model path is required' });
  }

  const success = await initializeModel(modelPath);
  if (success) {
    res.json({ message: 'Model loaded successfully' });
  } else {
    res.status(500).json({ error: 'Failed to load model' });
  }
});

app.get('/api/model/status', (req, res) => {
  res.json({
    initialized: !!model,
    currentPath: model ? model.modelPath : null,
    mode: config.model.mode
  });
});

// Initialize database
const db = new sqlite3.Database(config.database.local);

// Create sessions table
db.run(`
  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    code TEXT,
    language TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    model_path TEXT,
    parameters TEXT
  )
`);

// Socket.IO handlers
io.on('connection', (socket) => {
  console.log('Client connected');

  socket.on('join-room', (roomId) => {
    socket.join(roomId);
    
    db.get('SELECT * FROM sessions WHERE id = ?', [roomId], (err, row) => {
      if (row) {
        socket.emit('load-code', {
          code: row.code,
          language: row.language,
          modelPath: row.model_path,
          parameters: JSON.parse(row.parameters || '{}')
        });
      }
    });
  });

  socket.on('code-change', async ({ roomId, code, language, modelPath, parameters }) => {
    socket.to(roomId).emit('code-change', { code, language });
    
    db.run(
      'INSERT OR REPLACE INTO sessions (id, code, language, model_path, parameters) VALUES (?, ?, ?, ?, ?)',
      [roomId, code, language, modelPath, JSON.stringify(parameters || {})]
    );
  });

  socket.on('get-completion', async ({ prompt, parameters }) => {
    try {
      if (!model) {
        await initializeModel();
      }

      // Apply custom parameters if provided
      if (parameters) {
        context.setParameters(parameters);
      }

      const response = await session.prompt(
        `You are an expert programmer. Complete the following code:\n${prompt}\n`
      );

      // Reset to default parameters
      if (parameters) {
        context.setParameters(config.model.defaultParameters);
      }

      socket.emit('completion-result', { completion: response });
    } catch (error) {
      console.error('Completion error:', error);
      socket.emit('completion-error', { error: error.message });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected');
  });
});

// Model management endpoints
app.get('/api/models/local', async (req, res) => {
  try {
    const models = await modelManager.findModels();
    res.json(models);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/models/search', async (req, res) => {
  try {
    const { query } = req.query;
    const results = await modelManager.searchHuggingFace(query);
    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// System information endpoint
app.get('/api/system/info', async (req, res) => {
  try {
    const systemInfo = await systemChecker.checkSystem();
    res.json(systemInfo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ROCm compatibility endpoint
app.get('/api/system/rocm-compatibility', async (req, res) => {
  try {
    const compatibility = await rocmManager.checkSystemCompatibility();
    res.json(compatibility);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// PyTorch management endpoints
app.post('/api/rocm/pytorch/install', async (req, res) => {
  // Set up SSE for progress updates
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await rocmManager.installPyTorch((progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
    
    res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.post('/api/rocm/pytorch/uninstall', async (req, res) => {
  try {
    const result = await rocmManager.uninstallPyTorch();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rocm/pytorch/status', async (req, res) => {
  try {
    const status = await rocmManager.getPyTorchStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ONNX management endpoints
app.post('/api/rocm/onnx/install', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await rocmManager.installONNX((progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
    
    res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.post('/api/rocm/onnx/uninstall', async (req, res) => {
  try {
    const result = await rocmManager.uninstallONNX();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rocm/onnx/status', async (req, res) => {
  try {
    const status = await rocmManager.getONNXStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// TensorFlow management endpoints
app.post('/api/rocm/tensorflow/install', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  try {
    const result = await rocmManager.installTensorFlow((progress) => {
      res.write(`data: ${JSON.stringify(progress)}\n\n`);
    });
    
    res.write(`data: ${JSON.stringify({ done: true, ...result })}\n\n`);
    res.end();
  } catch (error) {
    res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
    res.end();
  }
});

app.post('/api/rocm/tensorflow/uninstall', async (req, res) => {
  try {
    const result = await rocmManager.uninstallTensorFlow();
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/rocm/tensorflow/status', async (req, res) => {
  try {
    const status = await rocmManager.getTensorFlowStatus();
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Initialize default model on startup
initializeModel().then(() => {
  const PORT = config.port;
  httpServer.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}); 