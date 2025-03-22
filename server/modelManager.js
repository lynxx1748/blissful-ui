const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const axios = require('axios');
const config = require('./config');

const readdir = promisify(fs.readdir);
const stat = promisify(fs.stat);

class ModelManager {
  constructor() {
    this.currentModelPath = null;
  }

  async findModels() {
    const models = [];
    
    for (const basePath of config.model.paths) {
      try {
        const files = await this.scanDirectory(basePath);
        models.push(...files);
      } catch (error) {
        console.warn(`Could not scan directory ${basePath}:`, error.message);
      }
    }
    
    return models;
  }

  async scanDirectory(dir) {
    const models = [];
    
    try {
      const files = await readdir(dir);
      
      for (const file of files) {
        const fullPath = path.join(dir, file);
        const stats = await stat(fullPath);
        
        if (stats.isDirectory()) {
          const subDirModels = await this.scanDirectory(fullPath);
          models.push(...subDirModels);
        } else if (file.endsWith('.gguf')) {
          models.push({
            name: file,
            path: fullPath,
            size: stats.size,
            modified: stats.mtime
          });
        }
      }
    } catch (error) {
      console.warn(`Error scanning ${dir}:`, error.message);
    }
    
    return models;
  }

  async searchHuggingFace(query) {
    try {
      const response = await axios.get(
        `https://huggingface.co/api/models`,
        {
          params: {
            search: query,
            filter: 'gguf'
          }
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error searching HuggingFace:', error);
      throw error;
    }
  }

  setCurrentModel(modelPath) {
    this.currentModelPath = modelPath;
  }

  getCurrentModel() {
    return this.currentModelPath;
  }
}

module.exports = new ModelManager(); 