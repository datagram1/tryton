import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Table, Alert } from 'react-bootstrap';
import { FaSearch, FaPlus } from 'react-icons/fa';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * SearchDialog - Modal dialog for searching and selecting records
 * Reusable across One2Many, Many2Many, and Many2One relationships
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether dialog is visible
 * @param {Function} props.onHide - Callback when dialog closes
 * @param {Function} props.onSelect - Callback when records are selected: (selectedRecords) => void
 * @param {string} props.modelName - Target model name
 * @param {Array} props.domain - Domain filter for search
 * @param {Object} props.context - Search context
 * @param {string} props.order - Search order
 * @param {boolean} props.multiSelect - Allow multiple selection
 * @param {string} props.title - Dialog title
 * @param {string} props.searchFilter - Pre-fill search text
 * @param {boolean} props.allowNew - Show "New" button to create records
 * @param {Function} props.onNew - Callback when New button clicked
 */
const SearchDialog = ({
  show,
  onHide,
  onSelect,
  modelName,
  domain = [],
  context = {},
  order = null,
  multiSelect = false,
  title = 'Search',
  searchFilter = '',
  allowNew = false,
  onNew = null,
}) => {
  const { sessionId, database } = useSessionStore();
  const [searchText, setSearchText] = useState(searchFilter);
  const [records, setRecords] = useState([]);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [fields, setFields] = useState([]);

  /**
   * Perform search with current filters
   */
  const performSearch = useCallback(async (fieldNames = null) => {
    if (!fieldNames) {
      fieldNames = fields.map(f => f.name);
    }

    try {
      setIsLoading(true);
      setError(null);

      // Build search domain
      let searchDomain = domain || [];

      // Add text search filter if provided
      if (searchText && searchText.trim()) {
        // Use name_search for text filtering
        const nameResults = await rpc.nameSearch(
          modelName,
          searchText.trim(),
          searchDomain,
          sessionId,
          database,
          context
        );

        // Extract IDs from name_search results
        const matchingIds = nameResults.map(r => r[0]);

        if (matchingIds.length > 0) {
          searchDomain = [['id', 'in', matchingIds]];
          if (domain && domain.length > 0) {
            searchDomain = [searchDomain, domain];
          }
        } else {
          // No matches found
          setRecords([]);
          setIsLoading(false);
          return;
        }
      }

      // Search for records
      const ids = await rpc.search(
        modelName,
        searchDomain,
        0,
        100, // Limit to 100 records
        order,
        sessionId,
        database
      );

      if (ids && ids.length > 0) {
        // Read record data
        const recordData = await rpc.read(
          modelName,
          ids,
          fieldNames,
          sessionId,
          database
        );
        setRecords(recordData || []);
      } else {
        setRecords([]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error searching:', err);
      setError(err.message || 'Search failed');
      setIsLoading(false);
    }
  }, [fields, domain, searchText, modelName, sessionId, database, context, order]);

  /**
   * Load field definitions from view and perform initial search
   */
  const loadFieldsAndSearch = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get tree view definition to determine which fields to display
      const viewDef = await rpc.fieldsViewGet(
        modelName,
        null,
        'tree',
        sessionId,
        database
      );

      // Extract field names from view (limit to first 5 for display)
      const fieldNames = Object.keys(viewDef.fields).slice(0, 5);
      setFields(
        fieldNames.map(name => ({
          name,
          label: viewDef.fields[name]?.string || name,
          type: viewDef.fields[name]?.type,
        }))
      );

      // Perform initial search
      await performSearch(fieldNames);
    } catch (err) {
      console.error('Error loading fields:', err);
      setError(err.message || 'Failed to load search dialog');
      setIsLoading(false);
    }
  }, [modelName, sessionId, database, performSearch]);

  /**
   * Load fields and perform initial search when dialog opens
   */
  useEffect(() => {
    if (show && modelName) {
      loadFieldsAndSearch();
    }
  }, [show, modelName, domain, loadFieldsAndSearch]);

  /**
   * Handle search button click
   */
  const handleSearch = () => {
    performSearch();
  };

  /**
   * Handle record selection toggle
   */
  const handleToggleSelect = (recordId) => {
    if (multiSelect) {
      setSelectedIds(prev =>
        prev.includes(recordId)
          ? prev.filter(id => id !== recordId)
          : [...prev, recordId]
      );
    } else {
      setSelectedIds([recordId]);
    }
  };

  /**
   * Handle OK button - return selected records
   */
  const handleOk = () => {
    const selectedRecords = records.filter(r => selectedIds.includes(r.id));
    onSelect(selectedRecords);
    handleClose();
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    setSearchText('');
    setSelectedIds([]);
    setRecords([]);
    setError(null);
    onHide();
  };

  /**
   * Handle New button click
   */
  const handleNew = () => {
    if (onNew) {
      onNew();
    }
  };

  /**
   * Format cell value for display
   */
  const formatCellValue = (value, type) => {
    if (value === null || value === undefined) return '';
    if (Array.isArray(value)) {
      return value[1] || value[0]; // Many2One format: [id, name]
    }
    if (typeof value === 'boolean') {
      return value ? '✓' : '';
    }
    return value;
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Search Input */}
        <Form className="mb-3">
          <Form.Group className="mb-3">
            <div className="input-group">
              <Form.Control
                type="text"
                placeholder="Search..."
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSearch();
                  }
                }}
              />
              <Button variant="primary" onClick={handleSearch}>
                <FaSearch /> Search
              </Button>
            </div>
          </Form.Group>
        </Form>

        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center p-3">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {/* Results Table */}
        {!isLoading && records.length > 0 && (
          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Table hover size="sm">
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr>
                  <th style={{ width: '40px' }}>
                    {multiSelect ? 'Select' : ''}
                  </th>
                  {fields.map(field => (
                    <th key={field.name}>{field.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {records.map(record => (
                  <tr
                    key={record.id}
                    onClick={() => handleToggleSelect(record.id)}
                    style={{ cursor: 'pointer' }}
                    className={selectedIds.includes(record.id) ? 'table-active' : ''}
                  >
                    <td>
                      <Form.Check
                        type={multiSelect ? 'checkbox' : 'radio'}
                        checked={selectedIds.includes(record.id)}
                        onChange={() => handleToggleSelect(record.id)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                    {fields.map(field => (
                      <td key={field.name}>
                        {formatCellValue(record[field.name], field.type)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* No Results */}
        {!isLoading && records.length === 0 && (
          <Alert variant="info">
            No records found. {allowNew && 'Try creating a new one with the "New" button below.'}
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        {/* New Button */}
        {allowNew && onNew && (
          <Button variant="success" onClick={handleNew} className="me-auto">
            <FaPlus /> New
          </Button>
        )}

        {/* Cancel/OK Buttons */}
        <Button variant="secondary" onClick={handleClose}>
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleOk}
          disabled={selectedIds.length === 0}
        >
          OK ({selectedIds.length})
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SearchDialog;
