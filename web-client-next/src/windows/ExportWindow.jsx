import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Form, Alert, ListGroup, Row, Col } from 'react-bootstrap';
import { FaDownload, FaPlus, FaTimes, FaSave, FaTrash } from 'react-icons/fa';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * ExportWindow - Modal dialog for exporting records to CSV
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether dialog is visible
 * @param {Function} props.onHide - Callback when dialog closes
 * @param {string} props.modelName - Model name
 * @param {Array} props.fields - Field definitions from view
 * @param {Array} props.recordIds - Record IDs to export
 * @param {Array} props.selectedIds - Currently selected record IDs
 * @param {string} props.domain - Search domain
 * @param {number} props.totalCount - Total number of records
 */
const ExportWindow = ({
  show,
  onHide,
  modelName,
  fields = {},
  recordIds = [],
  selectedIds = [],
  domain = [],
  totalCount = 0,
}) => {
  const { sessionId, database } = useSessionStore();
  const [selectedFields, setSelectedFields] = useState([]);
  const [availableFields, setAvailableFields] = useState([]);
  const [exportType, setExportType] = useState('selected'); // 'selected' or 'all'
  const [includeFieldNames, setIncludeFieldNames] = useState(true);
  const [useLocaleFormat, setUseLocaleFormat] = useState(true);
  const [error, setError] = useState(null);
  const [isExporting, setIsExporting] = useState(false);
  const [savedExports, setSavedExports] = useState([]);
  const [exportName, setExportName] = useState('');

  /**
   * Initialize available fields
   */
  useEffect(() => {
    if (show && fields) {
      const fieldList = Object.entries(fields).map(([name, field]) => ({
        name,
        string: field.string || name,
        type: field.type,
      })).sort((a, b) => a.string.localeCompare(b.string));

      setAvailableFields(fieldList);
    }
  }, [show, fields]);

  /**
   * Load saved export configurations
   */
  useEffect(() => {
    const loadSavedExports = async () => {
      if (!show || !modelName) return;

      try {
        // Search for saved exports for this model
        const exportIds = await rpc.search(
          'ir.export',
          [['resource', '=', modelName]],
          0,
          100,
          [['name', 'ASC']],
          sessionId,
          database
        );

        if (exportIds && exportIds.length > 0) {
          const exports = await rpc.read(
            'ir.export',
            exportIds,
            ['name', 'export_fields'],
            sessionId,
            database
          );
          setSavedExports(exports || []);
        }
      } catch (err) {
        console.error('Error loading saved exports:', err);
      }
    };

    loadSavedExports();
  }, [show, modelName, sessionId, database]);

  /**
   * Add field to export
   */
  const handleAddField = (field) => {
    if (!selectedFields.find(f => f.name === field.name)) {
      setSelectedFields([...selectedFields, field]);
    }
  };

  /**
   * Remove field from export
   */
  const handleRemoveField = (fieldName) => {
    setSelectedFields(selectedFields.filter(f => f.name !== fieldName));
  };

  /**
   * Load a saved export configuration
   */
  const handleLoadExport = async (exportId) => {
    try {
      const exports = await rpc.read(
        'ir.export',
        [exportId],
        ['name', 'export_fields'],
        sessionId,
        database
      );

      if (exports && exports.length > 0) {
        const exportConfig = exports[0];

        // Load export fields
        if (exportConfig.export_fields && exportConfig.export_fields.length > 0) {
          const fieldIds = exportConfig.export_fields;
          const exportFields = await rpc.read(
            'ir.export.line',
            fieldIds,
            ['name'],
            sessionId,
            database
          );

          // Map field names to field objects
          const fieldNames = exportFields.map(ef => ef.name);
          const selectedFieldList = fieldNames.map(name => {
            const field = availableFields.find(f => f.name === name);
            return field || { name, string: name, type: 'char' };
          });

          setSelectedFields(selectedFieldList);
          setExportName(exportConfig.name);
        }
      }
    } catch (err) {
      console.error('Error loading export:', err);
      setError(err.message || 'Failed to load export configuration');
    }
  };

  /**
   * Save export configuration
   */
  const handleSaveExport = async () => {
    if (!exportName) {
      setError('Please enter a name for this export configuration');
      return;
    }

    if (selectedFields.length === 0) {
      setError('Please select at least one field to export');
      return;
    }

    try {
      // Create export record
      const exportIds = await rpc.create(
        'ir.export',
        [{
          name: exportName,
          resource: modelName,
        }],
        sessionId,
        database
      );

      if (exportIds && exportIds.length > 0) {
        const exportId = exportIds[0];

        // Create export field lines
        const exportLineValues = selectedFields.map(field => ({
          export: exportId,
          name: field.name,
        }));

        await rpc.create(
          'ir.export.line',
          exportLineValues,
          sessionId,
          database
        );

        // Reload saved exports
        const exports = await rpc.read(
          'ir.export',
          exportIds,
          ['name', 'export_fields'],
          sessionId,
          database
        );
        setSavedExports([...savedExports, ...exports]);

        setError(null);
        alert('Export configuration saved successfully!');
      }
    } catch (err) {
      console.error('Error saving export:', err);
      setError(err.message || 'Failed to save export configuration');
    }
  };

  /**
   * Delete saved export
   */
  const handleDeleteExport = async (exportId) => {
    if (!confirm('Are you sure you want to delete this export configuration?')) {
      return;
    }

    try {
      await rpc.delete('ir.export', [exportId], sessionId, database);
      setSavedExports(savedExports.filter(e => e.id !== exportId));
    } catch (err) {
      console.error('Error deleting export:', err);
      setError(err.message || 'Failed to delete export configuration');
    }
  };

  /**
   * Export data to CSV
   */
  const handleExport = async () => {
    if (selectedFields.length === 0) {
      setError('Please select at least one field to export');
      return;
    }

    try {
      setIsExporting(true);
      setError(null);

      // Determine which records to export
      let idsToExport = [];
      if (exportType === 'selected' && selectedIds.length > 0) {
        idsToExport = selectedIds;
      } else if (exportType === 'all') {
        // Search for all records matching the domain
        idsToExport = await rpc.search(
          modelName,
          domain,
          0,
          0, // 0 means no limit
          [],
          sessionId,
          database
        );
      } else if (recordIds.length > 0) {
        idsToExport = recordIds;
      }

      if (idsToExport.length === 0) {
        setError('No records to export');
        setIsExporting(false);
        return;
      }

      // Read the data
      const fieldNames = selectedFields.map(f => f.name);
      const records = await rpc.read(
        modelName,
        idsToExport,
        fieldNames,
        sessionId,
        database
      );

      // Convert to CSV
      const csv = convertToCSV(records, selectedFields, includeFieldNames);

      // Download CSV
      downloadCSV(csv, `${modelName}_export.csv`);

      setIsExporting(false);
      onHide();
    } catch (err) {
      console.error('Error exporting data:', err);
      setError(err.message || 'Failed to export data');
      setIsExporting(false);
    }
  };

  /**
   * Convert records to CSV format
   */
  const convertToCSV = (records, fields, includeHeaders) => {
    const rows = [];

    // Add header row
    if (includeHeaders) {
      rows.push(fields.map(f => f.string).join(','));
    }

    // Add data rows
    records.forEach(record => {
      const row = fields.map(field => {
        let value = record[field.name];

        // Handle special types
        if (value === null || value === undefined) {
          return '';
        }

        // Handle relational fields (many2one, etc.)
        if (Array.isArray(value) && value.length === 2) {
          value = value[1]; // Use the display name
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }

        // Escape and quote if needed
        const strValue = String(value);
        if (strValue.includes(',') || strValue.includes('"') || strValue.includes('\n')) {
          return '"' + strValue.replace(/"/g, '""') + '"';
        }

        return strValue;
      });

      rows.push(row.join(','));
    });

    return rows.join('\n');
  };

  /**
   * Download CSV file
   */
  const downloadCSV = (csvContent, filename) => {
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Modal show={show} onHide={onHide} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>Export {modelName}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        <Row>
          {/* Left: Available Fields */}
          <Col md={4}>
            <h6>Available Fields</h6>
            <ListGroup style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {availableFields.map(field => (
                <ListGroup.Item
                  key={field.name}
                  action
                  onClick={() => handleAddField(field)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>{field.string}</span>
                  <FaPlus className="text-success" />
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>

          {/* Middle: Selected Fields */}
          <Col md={4}>
            <h6>Selected Fields ({selectedFields.length})</h6>
            <ListGroup style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {selectedFields.length === 0 && (
                <ListGroup.Item className="text-muted text-center">
                  No fields selected
                </ListGroup.Item>
              )}
              {selectedFields.map((field, index) => (
                <ListGroup.Item
                  key={field.name}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>
                    {index + 1}. {field.string}
                  </span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={() => handleRemoveField(field.name)}
                    className="text-danger p-0"
                  >
                    <FaTimes />
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>

          {/* Right: Saved Exports */}
          <Col md={4}>
            <h6>Saved Exports</h6>
            <Form.Group className="mb-2">
              <Form.Control
                type="text"
                placeholder="Export name..."
                value={exportName}
                onChange={(e) => setExportName(e.target.value)}
                size="sm"
              />
              <Button
                variant="outline-primary"
                size="sm"
                className="mt-1 w-100"
                onClick={handleSaveExport}
              >
                <FaSave className="me-1" /> Save Configuration
              </Button>
            </Form.Group>
            <ListGroup style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {savedExports.length === 0 && (
                <ListGroup.Item className="text-muted text-center">
                  No saved exports
                </ListGroup.Item>
              )}
              {savedExports.map(exp => (
                <ListGroup.Item
                  key={exp.id}
                  action
                  onClick={() => handleLoadExport(exp.id)}
                  className="d-flex justify-content-between align-items-center"
                >
                  <span>{exp.name}</span>
                  <Button
                    variant="link"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteExport(exp.id);
                    }}
                    className="text-danger p-0"
                  >
                    <FaTrash />
                  </Button>
                </ListGroup.Item>
              ))}
            </ListGroup>
          </Col>
        </Row>

        {/* Export Options */}
        <hr />
        <Row>
          <Col md={6}>
            <Form.Group>
              <Form.Label>Export Records</Form.Label>
              <Form.Select
                value={exportType}
                onChange={(e) => setExportType(e.target.value)}
              >
                {selectedIds.length > 0 && (
                  <option value="selected">
                    Selected Records ({selectedIds.length})
                  </option>
                )}
                <option value="all">
                  All Records ({totalCount > 0 ? totalCount : recordIds.length})
                </option>
              </Form.Select>
            </Form.Group>
          </Col>
          <Col md={6}>
            <Form.Group>
              <Form.Check
                type="checkbox"
                label="Include field names as header"
                checked={includeFieldNames}
                onChange={(e) => setIncludeFieldNames(e.target.checked)}
              />
              <Form.Check
                type="checkbox"
                label="Use locale format"
                checked={useLocaleFormat}
                onChange={(e) => setUseLocaleFormat(e.target.checked)}
              />
            </Form.Group>
          </Col>
        </Row>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
        <Button
          variant="primary"
          onClick={handleExport}
          disabled={isExporting || selectedFields.length === 0}
        >
          {isExporting ? (
            <>
              <span className="spinner-border spinner-border-sm me-2" />
              Exporting...
            </>
          ) : (
            <>
              <FaDownload className="me-1" /> Export to CSV
            </>
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default ExportWindow;
