import { useState, useEffect } from 'react';

function ModelSelector({ onModelSelect }) {
  const [localModels, setLocalModels] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchLocalModels();
  }, []);

  const fetchLocalModels = async () => {
    try {
      const response = await fetch('http://localhost:3001/api/models/local');
      const models = await response.json();
      setLocalModels(models);
    } catch (error) {
      console.error('Error fetching local models:', error);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setLoading(true);
    try {
      const response = await fetch(`http://localhost:3001/api/models/search?query=${searchQuery}`);
      const results = await response.json();
      setSearchResults(results);
    } catch (error) {
      console.error('Error searching models:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="model-selector">
      <h3>Model Selection</h3>
      
      <div className="local-models">
        <h4>Local Models</h4>
        <select onChange={(e) => onModelSelect(e.target.value)}>
          <option value="">Select a model</option>
          {localModels.map(model => (
            <option key={model.path} value={model.path}>
              {model.name} ({(model.size / 1024 / 1024 / 1024).toFixed(2)} GB)
            </option>
          ))}
        </select>
      </div>

      <div className="model-search">
        <h4>Search HuggingFace Models</h4>
        <div className="search-input">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search for models..."
          />
          <button onClick={handleSearch} disabled={loading}>
            {loading ? 'Searching...' : 'Search'}
          </button>
        </div>

        {searchResults.length > 0 && (
          <div className="search-results">
            {searchResults.map(model => (
              <div key={model.id} className="model-result">
                <h5>{model.modelId}</h5>
                <p>{model.description}</p>
                <button onClick={() => onModelSelect(model.id)}>
                  Select Model
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ModelSelector; 