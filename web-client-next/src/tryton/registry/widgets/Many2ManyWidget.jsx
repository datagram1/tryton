import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Badge, Form, Dropdown } from 'react-bootstrap';
import { FaPlus, FaTrash, FaPlusSquare } from 'react-icons/fa';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import rpc from '../../../api/rpc';
import useSessionStore from '../../../store/session';
import SearchDialog from '../../../components/SearchDialog';
import FormDialog from '../../../components/FormDialog';

/**
 * Many2ManyWidget - Data grid for Many2Many relationships
 * Similar to One2Many but represents a many-to-many relationship
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {Array} props.value - Array of record IDs
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata (must include 'relation' - the target model)
 * @param {Object} props.record - Parent record for domain/context evaluation
 */
const Many2ManyWidget = ({ name, value, onChange, readonly, field, record }) => {
  const { sessionId, database } = useSessionStore();
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingCell, setEditingCell] = useState(null); // {recordId, fieldName}
  const [cellValues, setCellValues] = useState({}); // Temporary cell values during edit
  const [viewDefinition, setViewDefinition] = useState(null);
  const searchInputRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);

  const targetModel = field?.relation;
  const isEditable = viewDefinition?.arch?.attributes?.editable === '1';

  /**
   * Load related records
   */
  useEffect(() => {
    const loadRecords = async () => {
      if (!value || !Array.isArray(value) || value.length === 0 || !targetModel) {
        setRecords([]);
        return;
      }

      try {
        setIsLoading(true);

        // Fetch view definition to get fields
        const viewDef = await rpc.fieldsViewGet(
          targetModel,
          null,
          'tree',
          sessionId,
          database
        );

        setViewDefinition(viewDef);

        // Extract visible fields from tree view definition
        // Parse the tree XML to get field order from the actual view
        let fieldNames = [];
        if (viewDef.arch && viewDef.arch.children) {
          // Get fields from tree children in order
          fieldNames = viewDef.arch.children
            .filter(child => child.tag === 'field')
            .map(child => child.attributes.name);
        }

        // Fallback to all fields if no tree structure found
        if (fieldNames.length === 0) {
          fieldNames = Object.keys(viewDef.fields).slice(0, 5);
        }

        // Read the records
        const recordData = await rpc.read(
          targetModel,
          value,
          fieldNames,
          sessionId,
          database
        );

        setRecords(recordData || []);

        // Build columns dynamically
        const cols = fieldNames.map((fieldName) => ({
          id: fieldName,
          accessorKey: fieldName,
          header: viewDef.fields[fieldName]?.string || fieldName,
          readonly: viewDef.fields[fieldName]?.readonly || false,
          type: viewDef.fields[fieldName]?.type || 'char',
          cell: (info) => {
            const cellValue = info.getValue();
            // Format Many2One fields
            if (Array.isArray(cellValue)) {
              return cellValue[1] || cellValue[0];
            }
            // Format boolean
            if (typeof cellValue === 'boolean') {
              return cellValue ? '✓' : '';
            }
            return cellValue || '';
          },
        }));

        setColumns(cols);
      } catch (error) {
        console.error('Error loading Many2Many records:', error);
        setRecords([]);
      } finally {
        setIsLoading(false);
      }
    };

    loadRecords();
  }, [value, targetModel, sessionId, database]);

  /**
   * Handle autocomplete search
   */
  const handleAutocompleteSearch = async (text) => {
    if (!text || !text.trim() || !targetModel) {
      setAutocompleteResults([]);
      setShowAutocomplete(false);
      return;
    }

    try {
      // Get domain for filtering
      const domain = getDomain();

      // Search for matching records
      const results = await rpc.nameSearch(
        targetModel,
        text.trim(),
        domain,
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

  /**
   * Handle search text change (debounced)
   */
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

  /**
   * Handle autocomplete selection
   */
  const handleAutocompleteSelect = (recordId) => {
    if (!value || !Array.isArray(value)) {
      onChange(name, [recordId]);
    } else if (!value.includes(recordId)) {
      onChange(name, [...value, recordId]);
    }

    setSearchText('');
    setShowAutocomplete(false);
  };

  /**
   * Get domain for filtering (exclude existing records)
   */
  const getDomain = () => {
    let domain = [];

    // Exclude existing relationship IDs
    if (value && Array.isArray(value) && value.length > 0) {
      domain.push(['id', 'not in', value]);
    }

    return domain;
  };

  /**
   * Handle Add button - open SearchDialog
   */
  const handleAdd = () => {
    setShowSearchDialog(true);
  };

  /**
   * Handle search dialog selection
   */
  const handleSearchSelect = (selectedRecords) => {
    const selectedIds = selectedRecords.map(r => r.id);
    const newValue = value && Array.isArray(value) ? [...value, ...selectedIds] : selectedIds;
    onChange(name, newValue);
  };

  /**
   * Handle New button - open FormDialog
   */
  const handleNew = () => {
    setShowFormDialog(true);
  };

  /**
   * Handle form dialog save
   */
  const handleFormSave = (recordId) => {
    // Add the new record to the relationship
    const newValue = value && Array.isArray(value) ? [...value, recordId] : [recordId];
    onChange(name, newValue);
  };

  /**
   * Handle cell click for inline editing
   */
  const handleCellClick = (recordId, fieldName, column) => {
    if (!isEditable || readonly || column.readonly) return;

    const record = records.find(r => r.id === recordId);
    if (!record) return;

    setEditingCell({ recordId, fieldName });
    setCellValues(prev => ({
      ...prev,
      [`${recordId}-${fieldName}`]: record[fieldName]
    }));
  };

  /**
   * Handle cell value change
   */
  const handleCellChange = (recordId, fieldName, newValue) => {
    setCellValues(prev => ({
      ...prev,
      [`${recordId}-${fieldName}`]: newValue
    }));
  };

  /**
   * Handle cell blur - save the value
   */
  const handleCellBlur = async (recordId, fieldName) => {
    if (!editingCell || editingCell.recordId !== recordId || editingCell.fieldName !== fieldName) {
      return;
    }

    const cellKey = `${recordId}-${fieldName}`;
    const newValue = cellValues[cellKey];
    const record = records.find(r => r.id === recordId);

    if (!record || record[fieldName] === newValue) {
      setEditingCell(null);
      return;
    }

    try {
      // Update the record on the server
      await rpc.write(
        targetModel,
        [recordId],
        { [fieldName]: newValue },
        sessionId,
        database
      );

      // Update local state
      setRecords(prev => prev.map(r =>
        r.id === recordId ? { ...r, [fieldName]: newValue } : r
      ));
    } catch (error) {
      console.error('Error updating cell:', error);
      // Revert to original value on error
      const originalValue = record[fieldName];
      setCellValues(prev => ({
        ...prev,
        [cellKey]: originalValue
      }));
    } finally {
      setEditingCell(null);
    }
  };

  /**
   * Handle keyboard navigation in editable cells
   */
  const handleCellKeyDown = (e, recordId, fieldName, rowIndex, colIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleCellBlur(recordId, fieldName);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setEditingCell(null);
      // Revert value
      const record = records.find(r => r.id === recordId);
      if (record) {
        setCellValues(prev => ({
          ...prev,
          [`${recordId}-${fieldName}`]: record[fieldName]
        }));
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      handleCellBlur(recordId, fieldName);
      // Move to next editable cell
      const nextColIndex = e.shiftKey ? colIndex - 1 : colIndex + 1;
      if (nextColIndex >= 0 && nextColIndex < columns.length) {
        const nextColumn = columns[nextColIndex];
        if (!nextColumn.readonly) {
          setTimeout(() => handleCellClick(recordId, nextColumn.accessorKey, nextColumn), 0);
        }
      }
    }
  };

  /**
   * Render cell content (either editable or read-only)
   */
  const renderCellContent = (cell, column, recordId) => {
    const fieldName = column.accessorKey;
    const isEditingThis = editingCell?.recordId === recordId && editingCell?.fieldName === fieldName;
    const cellKey = `${recordId}-${fieldName}`;
    const cellValue = isEditingThis ? cellValues[cellKey] : cell.getValue();

    if (isEditable && !readonly && !column.readonly && isEditingThis) {
      // Render editable input
      if (column.type === 'boolean') {
        return (
          <Form.Check
            type="checkbox"
            checked={!!cellValue}
            onChange={(e) => handleCellChange(recordId, fieldName, e.target.checked)}
            onBlur={() => handleCellBlur(recordId, fieldName)}
            onKeyDown={(e) => handleCellKeyDown(e, recordId, fieldName, cell.row.index, cell.column.index)}
            autoFocus
          />
        );
      } else if (column.type === 'selection') {
        // For selection fields, would need to get selection options
        // For now, treat as text
        return (
          <Form.Control
            size="sm"
            type="text"
            value={cellValue || ''}
            onChange={(e) => handleCellChange(recordId, fieldName, e.target.value)}
            onBlur={() => handleCellBlur(recordId, fieldName)}
            onKeyDown={(e) => handleCellKeyDown(e, recordId, fieldName, cell.row.index, cell.column.index)}
            autoFocus
          />
        );
      } else {
        // Default text input
        return (
          <Form.Control
            size="sm"
            type={column.type === 'integer' || column.type === 'float' ? 'number' : 'text'}
            value={cellValue || ''}
            onChange={(e) => handleCellChange(recordId, fieldName, e.target.value)}
            onBlur={() => handleCellBlur(recordId, fieldName)}
            onKeyDown={(e) => handleCellKeyDown(e, recordId, fieldName, cell.row.index, cell.column.index)}
            autoFocus
          />
        );
      }
    }

    // Render read-only content
    return flexRender(cell.column.columnDef.cell, cell.getContext());
  };

  /**
   * Initialize table
   */
  const table = useReactTable({
    data: records,
    columns,
    getCoreRowModel: getCoreRowModel(),
  });

  /**
   * Handle remove record from relationship
   */
  const handleRemove = (recordId) => {
    if (!value || !Array.isArray(value)) return;

    const newValue = value.filter((id) => id !== recordId);
    onChange(name, newValue);
  };

  /**
   * Handle row click - could open edit dialog in future
   */
  const handleRowClick = (recordId) => {
    // Future: implement edit functionality
    console.log('Row clicked:', recordId);
  };

  // Empty state
  if (!value || !Array.isArray(value) || value.length === 0) {
    return (
      <div className="border rounded">
        {/* Toolbar */}
        {!readonly && (
          <div className="p-2 bg-light border-bottom">
            <div className="d-flex gap-2 align-items-center">
              {/* Search Input with Autocomplete */}
              <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
                <Form.Control
                  ref={searchInputRef}
                  size="sm"
                  type="text"
                  placeholder="Search to add..."
                  value={searchText}
                  onChange={(e) => handleSearchTextChange(e.target.value)}
                  onFocus={() => searchText && setShowAutocomplete(true)}
                  onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
                />
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
                    }}
                  >
                    {autocompleteResults.map(([id, name]) => (
                      <div
                        key={id}
                        style={{
                          padding: '0.5rem',
                          cursor: 'pointer',
                          borderBottom: '1px solid #eee',
                        }}
                        onMouseDown={() => handleAutocompleteSelect(id)}
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                      >
                        {name}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Add Button (F2) */}
              <Button size="sm" variant="outline-primary" onClick={handleAdd} title="Add existing records (F2)">
                <FaPlus className="me-1" /> Add
              </Button>

              {/* New Button (F3) */}
              <Button size="sm" variant="outline-success" onClick={handleNew} title="Create new record (F3)">
                <FaPlusSquare className="me-1" /> New
              </Button>
            </div>
          </div>
        )}

        <div className="p-3 bg-light text-center">
          <Badge bg="secondary">{value?.length || 0} record(s)</Badge>
        </div>

        {/* Search Dialog */}
        <SearchDialog
          show={showSearchDialog}
          onHide={() => setShowSearchDialog(false)}
          onSelect={handleSearchSelect}
          modelName={targetModel}
          domain={getDomain()}
          multiSelect={true}
          title={`Add ${field?.string || 'Records'}`}
          searchFilter={searchText}
          allowNew={true}
          onNew={handleNew}
        />

        {/* Form Dialog */}
        <FormDialog
          show={showFormDialog}
          onHide={() => setShowFormDialog(false)}
          onSave={handleFormSave}
          modelName={targetModel}
          title={`New ${field?.string || 'Record'}`}
          defaults={searchText ? { rec_name: searchText } : {}}
        />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="border rounded p-3 bg-light text-center">
        Loading...
      </div>
    );
  }

  return (
    <div className="border rounded">
      {/* Toolbar */}
      {!readonly && (
        <div className="p-2 bg-light border-bottom">
          <div className="d-flex gap-2 align-items-center">
            {/* Search Input with Autocomplete */}
            <div style={{ position: 'relative', flex: 1, maxWidth: '300px' }}>
              <Form.Control
                ref={searchInputRef}
                size="sm"
                type="text"
                placeholder="Search to add..."
                value={searchText}
                onChange={(e) => handleSearchTextChange(e.target.value)}
                onFocus={() => searchText && setShowAutocomplete(true)}
                onBlur={() => setTimeout(() => setShowAutocomplete(false), 200)}
              />
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
                  }}
                >
                  {autocompleteResults.map(([id, name]) => (
                    <div
                      key={id}
                      style={{
                        padding: '0.5rem',
                        cursor: 'pointer',
                        borderBottom: '1px solid #eee',
                      }}
                      onMouseDown={() => handleAutocompleteSelect(id)}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Add Button (F2) */}
            <Button size="sm" variant="outline-primary" onClick={handleAdd} title="Add existing records (F2)">
              <FaPlus className="me-1" /> Add
            </Button>

            {/* New Button (F3) */}
            <Button size="sm" variant="outline-success" onClick={handleNew} title="Create new record (F3)">
              <FaPlusSquare className="me-1" /> New
            </Button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="table-responsive">
        <Table hover size="sm" className="mb-0">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="bg-light">
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                  </th>
                ))}
                {!readonly && <th className="bg-light" style={{ width: '60px' }}>Actions</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => {
                  const column = columns[cell.column.index];
                  const isEditingThis = editingCell?.recordId === row.original.id &&
                                       editingCell?.fieldName === column.accessorKey;
                  return (
                    <td
                      key={cell.id}
                      onClick={() => handleCellClick(row.original.id, column.accessorKey, column)}
                      style={{
                        cursor: isEditable && !readonly && !column.readonly ? 'pointer' : 'default',
                        backgroundColor: isEditingThis ? '#fff3cd' : 'transparent'
                      }}
                    >
                      {renderCellContent(cell, column, row.original.id)}
                    </td>
                  );
                })}
                {!readonly && (
                  <td onClick={(e) => e.stopPropagation()}>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => handleRemove(row.original.id)}
                      title="Remove"
                    >
                      <FaTrash />
                    </Button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </Table>
      </div>

      {/* Footer */}
      <div className="p-2 bg-light border-top">
        <small className="text-muted">{records.length} record(s)</small>
      </div>

      {/* Search Dialog */}
      <SearchDialog
        show={showSearchDialog}
        onHide={() => setShowSearchDialog(false)}
        onSelect={handleSearchSelect}
        modelName={targetModel}
        domain={getDomain()}
        multiSelect={true}
        title={`Add ${field?.string || 'Records'}`}
        searchFilter={searchText}
        allowNew={true}
        onNew={handleNew}
      />

      {/* Form Dialog */}
      <FormDialog
        show={showFormDialog}
        onHide={() => setShowFormDialog(false)}
        onSave={handleFormSave}
        modelName={targetModel}
        title={`New ${field?.string || 'Record'}`}
        defaults={searchText ? { rec_name: searchText } : {}}
      />
    </div>
  );
};

export default Many2ManyWidget;
