import React, { useState, useEffect, useRef } from 'react';
import { Form, ListGroup, Spinner } from 'react-bootstrap';
import rpc from '../../../api/rpc';
import useSessionStore from '../../../store/session';

/**
 * Many2OneWidget - Autocomplete/lookup for Many2One relationships
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {Array|number} props.value - Current value [id, name] or just id
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata (must include 'relation' - the target model)
 */
const Many2OneWidget = ({ name, value, onChange, readonly, field }) => {
  const { sessionId, database } = useSessionStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [results, setResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [displayValue, setDisplayValue] = useState('');
  const searchTimeout = useRef(null);
  const dropdownRef = useRef(null);

  const targetModel = field?.relation;

  /**
   * Initialize display value from the current value
   */
  useEffect(() => {
    if (value) {
      // Value can be [id, name] or just id
      if (Array.isArray(value)) {
        setDisplayValue(value[1] || '');
      } else if (typeof value === 'number') {
        // Need to fetch the name
        fetchRecordName(value);
      }
    } else {
      setDisplayValue('');
    }
  }, [value]);

  /**
   * Fetch the name for a given record ID
   */
  const fetchRecordName = async (recordId) => {
    if (!targetModel || !recordId) return;

    try {
      const records = await rpc.read(
        targetModel,
        [recordId],
        ['rec_name'],
        sessionId,
        database
      );

      if (records && records.length > 0) {
        setDisplayValue(records[0].rec_name || records[0].name || '');
      }
    } catch (error) {
      console.error('Error fetching record name:', error);
    }
  };

  /**
   * Search for records as user types
   */
  const performSearch = async (term) => {
    if (!term || !targetModel) {
      setResults([]);
      return;
    }

    try {
      setIsSearching(true);

      // Build search domain: [['rec_name', 'ilike', term]]
      const domain = [['rec_name', 'ilike', `%${term}%`]];

      // Search and read results
      const searchResults = await rpc.searchRead(
        targetModel,
        domain,
        0,
        10, // Limit to 10 results
        null,
        ['rec_name'],
        sessionId,
        database
      );

      setResults(searchResults || []);
      setShowDropdown(true);
    } catch (error) {
      console.error('Error searching:', error);
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  /**
   * Handle input change with debouncing
   */
  const handleInputChange = (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    setDisplayValue(term);

    // Clear previous timeout
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }

    // If term is empty, clear the value
    if (!term) {
      onChange(name, null);
      setResults([]);
      setShowDropdown(false);
      return;
    }

    // Debounce search
    searchTimeout.current = setTimeout(() => {
      performSearch(term);
    }, 300);
  };

  /**
   * Handle selection from dropdown
   */
  const handleSelect = (record) => {
    const recordName = record.rec_name || record.name || '';
    setDisplayValue(recordName);
    setSearchTerm('');
    setShowDropdown(false);
    setResults([]);

    // Update value with [id, name] format
    onChange(name, [record.id, recordName]);
  };

  /**
   * Handle clearing the field
   */
  const handleClear = () => {
    setDisplayValue('');
    setSearchTerm('');
    setResults([]);
    setShowDropdown(false);
    onChange(name, null);
  };

  /**
   * Close dropdown when clicking outside
   */
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Readonly mode
  if (readonly) {
    return <span className="form-control-plaintext">{displayValue || ''}</span>;
  }

  return (
    <div ref={dropdownRef} className="position-relative">
      <div className="input-group">
        <Form.Control
          type="text"
          name={name}
          value={displayValue}
          onChange={handleInputChange}
          placeholder={`Search ${field?.string || 'records'}...`}
          autoComplete="off"
          required={field?.required}
        />
        {displayValue && (
          <button
            className="btn btn-outline-secondary"
            type="button"
            onClick={handleClear}
            title="Clear"
          >
            ✕
          </button>
        )}
        {isSearching && (
          <span className="input-group-text">
            <Spinner animation="border" size="sm" />
          </span>
        )}
      </div>

      {/* Dropdown results */}
      {showDropdown && results.length > 0 && (
        <ListGroup className="position-absolute w-100 mt-1 shadow-sm" style={{ zIndex: 1000 }}>
          {results.map((record) => (
            <ListGroup.Item
              key={record.id}
              action
              onClick={() => handleSelect(record)}
              className="cursor-pointer"
            >
              {record.rec_name || record.name || `ID: ${record.id}`}
            </ListGroup.Item>
          ))}
        </ListGroup>
      )}

      {/* No results message */}
      {showDropdown && !isSearching && results.length === 0 && searchTerm && (
        <ListGroup className="position-absolute w-100 mt-1 shadow-sm" style={{ zIndex: 1000 }}>
          <ListGroup.Item className="text-muted">No results found</ListGroup.Item>
        </ListGroup>
      )}
    </div>
  );
};

export default Many2OneWidget;
