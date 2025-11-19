import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Form, Alert, Table, ListGroup, Row, Col, ProgressBar } from 'react-bootstrap';
import { FaUpload, FaPlus, FaTimes, FaFileImport } from 'react-icons/fa';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * ImportWindow - Modal dialog for importing CSV data
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether dialog is visible
 * @param {Function} props.onHide - Callback when dialog closes
 * @param {Function} props.onImportComplete - Callback when import completes
 * @param {string} props.modelName - Model name
 * @param {Object} props.fields - Field definitions from model
 */
const ImportWindow = ({
  show,
  onHide,
  onImportComplete,
  modelName,
  fields = {},
}) => {
  const { sessionId, database } = useSessionStore();
  const fileInputRef = useRef(null);

  const [csvFile, setCsvFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [delimiter, setDelimiter] = useState(',');
  const [encoding, setEncoding] = useState('utf-8');
  const [skipLines, setSkipLines] = useState(0);
  const [hasHeaders, setHasHeaders] = useState(true);
  const [fieldMapping, setFieldMapping] = useState({});
  const [availableFields, setAvailableFields] = useState([]);
  const [error, setError] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  /**
   * Initialize available fields
   */
  useEffect(() => {
    if (show && fields) {
      const fieldList = Object.entries(fields)
        .filter(([name, field]) => {
          // Filter out read-only and functional fields for import
          return !field.readonly && field.type !== 'one2many' && field.type !== 'many2many';
        })
        .map(([name, field]) => ({
          name,
          string: field.string || name,
          type: field.type,
          required: field.required,
        }))
        .sort((a, b) => a.string.localeCompare(b.string));

      setAvailableFields(fieldList);
    }
  }, [show, fields]);

  /**
   * Handle file selection
   */
  const handleFileSelect = (file) => {
    if (!file) return;

    setCsvFile(file);
    setError(null);

    // Read and parse the file
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target.result;
        parseCSV(text);
      } catch (err) {
        setError('Failed to read file: ' + err.message);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
    };
    reader.readAsText(file);
  };

  /**
   * Parse CSV content
   */
  const parseCSV = (text) => {
    try {
      const lines = text.split('\n').filter(line => line.trim());

      if (lines.length === 0) {
        setError('File is empty');
        return;
      }

      // Parse lines
      const rows = lines.map(line => parseCSVLine(line, delimiter));

      // Skip lines if specified
      const dataRows = rows.slice(skipLines);

      if (dataRows.length === 0) {
        setError('No data rows found after skipping lines');
        return;
      }

      // Extract headers or create default ones
      let headers = [];
      let data = [];

      if (hasHeaders) {
        headers = dataRows[0];
        data = dataRows.slice(1);
      } else {
        // Create default column names
        headers = dataRows[0].map((_, index) => `Column ${index + 1}`);
        data = dataRows;
      }

      setCsvData({ headers, data });

      // Auto-detect field mapping
      autoDetectFieldMapping(headers);
    } catch (err) {
      setError('Failed to parse CSV: ' + err.message);
    }
  };

  /**
   * Parse a CSV line respecting quotes and delimiters
   */
  const parseCSVLine = (line, delim) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Escaped quote
          current += '"';
          i++;
        } else {
          // Toggle quote state
          inQuotes = !inQuotes;
        }
      } else if (char === delim && !inQuotes) {
        // End of field
        result.push(current.trim());
        current = '';
      } else {
        current += char;
      }
    }

    // Add last field
    result.push(current.trim());

    return result;
  };

  /**
   * Auto-detect field mapping based on column headers
   */
  const autoDetectFieldMapping = (headers) => {
    const mapping = {};

    headers.forEach((header, index) => {
      // Try to match header to field name or string
      const field = availableFields.find(f =>
        f.name.toLowerCase() === header.toLowerCase() ||
        f.string.toLowerCase() === header.toLowerCase()
      );

      if (field) {
        mapping[index] = field.name;
      }
    });

    setFieldMapping(mapping);
  };

  /**
   * Handle drag and drop
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  /**
   * Update delimiter and re-parse
   */
  const handleDelimiterChange = (newDelimiter) => {
    setDelimiter(newDelimiter);
    if (csvFile) {
      const reader = new FileReader();
      reader.onload = (e) => {
        parseCSV(e.target.result);
      };
      reader.readAsText(csvFile);
    }
  };

  /**
   * Import data
   */
  const handleImport = async () => {
    if (!csvData || csvData.data.length === 0) {
      setError('No data to import');
      return;
    }

    // Validate field mapping
    const mappedFields = Object.values(fieldMapping);
    if (mappedFields.length === 0) {
      setError('Please map at least one field');
      return;
    }

    // Check required fields
    const requiredFields = availableFields.filter(f => f.required);
    const missingRequired = requiredFields.filter(f => !mappedFields.includes(f.name));
    if (missingRequired.length > 0) {
      setError(`Missing required fields: ${missingRequired.map(f => f.string).join(', ')}`);
      return;
    }

    try {
      setIsImporting(true);
      setError(null);
      setImportProgress(0);

      // Prepare data for import
      const fieldNames = csvData.headers.map((_, index) => fieldMapping[index] || null);
      const importData = csvData.data.map(row => {
        const record = {};
        row.forEach((value, index) => {
          const fieldName = fieldMapping[index];
          if (fieldName) {
            record[fieldName] = value;
          }
        });
        return record;
      });

      // Import in batches
      const batchSize = 100;
      let imported = 0;

      for (let i = 0; i < importData.length; i += batchSize) {
        const batch = importData.slice(i, i + batchSize);

        // Create records
        await rpc.create(
          modelName,
          batch,
          sessionId,
          database
        );

        imported += batch.length;
        setImportProgress((imported / importData.length) * 100);
      }

      setIsImporting(false);
      alert(`Successfully imported ${imported} records!`);

      if (onImportComplete) {
        onImportComplete();
      }

      handleClose();
    } catch (err) {
      console.error('Error importing data:', err);
      setError(err.message || 'Failed to import data');
      setIsImporting(false);
    }
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    setCsvFile(null);
    setCsvData(null);
    setFieldMapping({});
    setError(null);
    setImportProgress(0);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="xl">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaFileImport className="me-2" />
          Import {modelName}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* File Upload Section */}
        {!csvData && (
          <div
            className={`border rounded p-4 mb-3 text-center ${isDragging ? 'bg-light border-primary' : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.txt"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            <FaUpload size={48} className="text-muted mb-3" />
            <p className="mb-2">Drag and drop a CSV file here, or click to select</p>
            <Button
              variant="primary"
              onClick={() => fileInputRef.current?.click()}
            >
              <FaUpload className="me-1" />
              Select CSV File
            </Button>
          </div>
        )}

        {/* CSV Options */}
        {!csvData && (
          <Row>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Delimiter</Form.Label>
                <Form.Select
                  value={delimiter}
                  onChange={(e) => handleDelimiterChange(e.target.value)}
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Encoding</Form.Label>
                <Form.Select
                  value={encoding}
                  onChange={(e) => setEncoding(e.target.value)}
                >
                  <option value="utf-8">UTF-8</option>
                  <option value="iso-8859-1">ISO-8859-1 (Latin-1)</option>
                  <option value="windows-1252">Windows-1252</option>
                </Form.Select>
              </Form.Group>
            </Col>
            <Col md={4}>
              <Form.Group>
                <Form.Label>Skip Lines</Form.Label>
                <Form.Control
                  type="number"
                  min="0"
                  value={skipLines}
                  onChange={(e) => setSkipLines(parseInt(e.target.value) || 0)}
                />
              </Form.Group>
            </Col>
          </Row>
        )}

        {!csvData && (
          <Form.Check
            type="checkbox"
            label="File has header row"
            checked={hasHeaders}
            onChange={(e) => setHasHeaders(e.target.checked)}
            className="mt-2"
          />
        )}

        {/* Field Mapping */}
        {csvData && (
          <>
            <h6>Field Mapping</h6>
            <p className="text-muted">
              Map CSV columns to {modelName} fields. Found {csvData.data.length} rows.
            </p>

            <Table striped bordered size="sm">
              <thead>
                <tr>
                  <th style={{ width: '30%' }}>CSV Column</th>
                  <th style={{ width: '30%' }}>Import to Field</th>
                  <th style={{ width: '40%' }}>Preview</th>
                </tr>
              </thead>
              <tbody>
                {csvData.headers.map((header, index) => (
                  <tr key={index}>
                    <td>
                      <strong>{header}</strong>
                    </td>
                    <td>
                      <Form.Select
                        size="sm"
                        value={fieldMapping[index] || ''}
                        onChange={(e) => {
                          const newMapping = { ...fieldMapping };
                          if (e.target.value) {
                            newMapping[index] = e.target.value;
                          } else {
                            delete newMapping[index];
                          }
                          setFieldMapping(newMapping);
                        }}
                      >
                        <option value="">-- Skip --</option>
                        {availableFields.map(field => (
                          <option key={field.name} value={field.name}>
                            {field.string} {field.required ? '*' : ''}
                          </option>
                        ))}
                      </Form.Select>
                    </td>
                    <td>
                      <small className="text-muted">
                        {csvData.data[0]?.[index] || '(empty)'}
                      </small>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>

            <div className="d-flex justify-content-between align-items-center mt-3">
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => {
                  setCsvData(null);
                  setCsvFile(null);
                  setFieldMapping({});
                }}
              >
                Choose Different File
              </Button>
              <small className="text-muted">* = Required field</small>
            </div>
          </>
        )}

        {/* Import Progress */}
        {isImporting && (
          <div className="mt-3">
            <ProgressBar
              now={importProgress}
              label={`${Math.round(importProgress)}%`}
              animated
            />
            <p className="text-center mt-2 text-muted">Importing records...</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isImporting}>
          Close
        </Button>
        {csvData && (
          <Button
            variant="primary"
            onClick={handleImport}
            disabled={isImporting || Object.keys(fieldMapping).length === 0}
          >
            {isImporting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Importing...
              </>
            ) : (
              <>
                <FaFileImport className="me-1" /> Import Data
              </>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default ImportWindow;
