import React, { useState, useEffect, useRef } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { FaTimes, FaExternalLinkAlt } from 'react-icons/fa';
import rpc from '../../../api/rpc';
import useSessionStore from '../../../store/session';

/**
 * ReferenceWidget - Dynamic model reference field
 * Allows selecting a model and then a specific record from that model
 * Value format: "model.name,123" (e.g., "party.party,5")
 *
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value in format "model,id"
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata with selection array
 */
const ReferenceWidget = ({ name, value, onChange, readonly, field }) => {
  const { sessionId, database } = useSessionStore();
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [recordName, setRecordName] = useState('');
  const [searchText, setSearchText] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const searchInputRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);

  // Get selection options (available models) from field metadata
  const modelSelection = field?.selection || [];

  // Parse value on mount/change
  useEffect(() => {
    if (!value) {
      setSelectedModel('');
      setSelectedRecordId(null);
      setRecordName('');
      return;
    }

    // Parse format: "model.name,123"
    const parts = value.split(',');
    if (parts.length >= 2) {
      const model = parts[0];
      const id = parseInt(parts[1]);

      setSelectedModel(model);
      setSelectedRecordId(id);

      // Fetch record name
      loadRecordName(model, id);
    }
  }, [value]);

  // Load record name for display
  const loadRecordName = async (model, id) => {
    if (!model || !id) return;

    try {
      const records = await rpc.read(
        model,
        [id],
        ['rec_name'],
        sessionId,
        database
      );

      if (records && records.length > 0) {
        setRecordName(records[0].rec_name || `#${id}`);
      }
    } catch (error) {
      console.error('Error loading record name:', error);
      setRecordName(`#${id}`);
    }
  };

  // Handle model selection change
  const handleModelChange = (model) => {
    setSelectedModel(model);
    setSelectedRecordId(null);
    setRecordName('');
    setSearchText('');
    onChange(name, model ? `${model},` : null);
  };

  // Handle autocomplete search
  const handleAutocompleteSearch = async (text) => {
    if (!text || !text.trim() || !selectedModel) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      // Search for matching records
      const results = await rpc.nameSearch(
        selectedModel,
        text.trim(),
        [],
        sessionId,
        database
      );

      setAutocompleteResults(results || []);
      setShowAutocomplete(true);
    } catch (error) {
      console.error('Error in autocomplete:', error);
      setAutocompleteResults([]);
    }
  };

  // Handle search text change (debounced)
  const handleSearchTextChange = (text) => {
    setSearchText(text);

    // Clear previous timeout
    if (autocompleteTimeoutRef.current) {
      clearTimeout(autocompleteTimeoutRef.current);
    }

    // Debounce autocomplete search
    autocompleteTimeoutRef.current = setTimeout(() => {
      handleAutocompleteSearch(text);
    }, 300);
  };

  // Handle autocomplete selection
  const handleAutocompleteSelect = (id, label) => {
    setSelectedRecordId(id);
    setRecordName(label);
    setSearchText('');
    setShowAutocomplete(false);

    // Update value
    onChange(name, `${selectedModel},${id}`);
  };

  // Handle clear
  const handleClear = () => {
    setSelectedModel('');
    setSelectedRecordId(null);
    setRecordName('');
    setSearchText('');
    onChange(name, null);
  };

  // Get display name for model
  const getModelDisplayName = (modelName) => {
    const option = modelSelection.find(([key]) => key === modelName);
    return option ? option[1] : modelName;
  };

  if (readonly) {
    if (!value) {
      return <span className="form-control-plaintext text-muted">-</span>;
    }

    return (
      <div className="form-control-plaintext">
        <small className="text-muted d-block">{getModelDisplayName(selectedModel)}</small>
        <strong>{recordName}</strong>
      </div>
    );
  }

  return (
    <div>
      {/* Model Selection */}
      <InputGroup size="sm" className="mb-2">
        <InputGroup.Text>Model</InputGroup.Text>
        <Form.Select
          value={selectedModel}
          onChange={(e) => handleModelChange(e.target.value)}
        >
          <option value="">Select model...</option>
          {modelSelection.map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
        </Form.Select>
        {value && (
          <Button
            variant="outline-secondary"
            onClick={handleClear}
            title="Clear"
          >
            <FaTimes />
          </Button>
        )}
      </InputGroup>

      {/* Record Selection (shown when model is selected) */}
      {selectedModel && (
        <div style={{ position: 'relative' }}>
          {selectedRecordId ? (
            // Display selected record
            <InputGroup size="sm">
              <Form.Control
                type="text"
                value={recordName}
                readOnly
                className="bg-light"
              />
              <Button
                variant="outline-secondary"
                onClick={() => {
                  setSelectedRecordId(null);
                  setRecordName('');
                  onChange(name, `${selectedModel},`);
                }}
                title="Change record"
              >
                <FaTimes />
              </Button>
            </InputGroup>
          ) : (
            // Search for record
            <>
              <Form.Control
                ref={searchInputRef}
                size="sm"
                type="text"
                placeholder={`Search ${getModelDisplayName(selectedModel)}...`}
                value={searchText}
                onChange={(e) => handleSearchTextChange(e.target.value)}
                onFocus={() => searchText && setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              />

              {/* Autocomplete dropdown */}
              {showAutocomplete && autocompleteResults.length > 0 && (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    backgroundColor: 'white',
                    border: '1px solid #ccc',
                    borderRadius: '0.25rem',
                    maxHeight: '200px',
                    overflowY: 'auto',
                    zIndex: 1000,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
                    marginTop: '2px',
                  }}
                >
                  {autocompleteResults.map(([id, label]) => (
                    <div
                      key={id}
                      style={{
                        padding: '0.5rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                      }}
                      onMouseDown={() => handleAutocompleteSelect(id, label)}
                      onMouseEnter={(e) => (e.target.style.backgroundColor = '#f8f9fa')}
                      onMouseLeave={(e) => (e.target.style.backgroundColor = 'white')}
                    >
                      {label}
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Help text */}
      {selectedModel && !selectedRecordId && (
        <Form.Text className="text-muted">
          Type to search for a record in {getModelDisplayName(selectedModel)}
        </Form.Text>
      )}
    </div>
  );
};

export default ReferenceWidget;
