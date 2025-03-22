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
      path.join(os.homedir(), '.cache/huggingface'),      // HuggingFace cache
      path.join(process.cwd(), 'models'),                 // Local models directory
    ].filter(Boolean), // Remove undefined paths
    
    // Model parameters
    contextSize: 4096,
    temperature: 0.7,
    maxTokens: 1000,
    mode: process.env.MODEL_MODE || 'local'
  }
};

module.exports = config; 