const os = require('os');
const path = require('path');

const config = {
  // Server settings
  port: process.env.PORT || 3001,
  
  // Database settings
  database: {
    local: './code_sessions.db',
    // Add cloud database connection if needed
    // cloud: process.env.DATABASE_URL
  },
  
  // Model settings
  model: {
    // Default paths to check for models
    paths: [
      process.env.MODEL_PATH,                              // User-specified path
      path.join(os.homedir(), '.cache', 'huggingface'),   // HuggingFace cache for Linux/macOS
      process.platform === 'win32' ? 
        path.join(os.homedir(), '.cache', 'huggingface') : null, // Windows HuggingFace cache
      path.join(__dirname, 'models'),                     // Local models directory in server folder
      path.join(process.cwd(), 'models'),                 // Local models directory in project root
    ].filter(Boolean), // Remove undefined paths
    
    // Model parameters
    contextSize: 4096,
    temperature: 0.7,
    maxTokens: 1000,
    mode: process.env.MODEL_MODE || 'local'
  }
};

// Create directories if they don't exist
const fs = require('fs');
try {
  if (!fs.existsSync(path.join(__dirname, 'models'))) {
    fs.mkdirSync(path.join(__dirname, 'models'), { recursive: true });
    console.log('Created server models directory');
  }
} catch (err) {
  console.error('Error creating models directory:', err);
}

module.exports = config; 