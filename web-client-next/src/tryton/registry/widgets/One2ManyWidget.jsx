import React, { useState, useEffect, useRef } from 'react';
import { Table, Button, Badge, Form } from 'react-bootstrap';
import { FaPlus, FaTrash, FaEdit, FaPlusSquare } from 'react-icons/fa';
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
 * One2ManyWidget - Data grid for One2Many relationships
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {Array} props.value - Array of record IDs
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata (must include 'relation' - the target model)
 * @param {Object} props.record - Parent record for domain/context evaluation
 */
const One2ManyWidget = ({ name, value, onChange, readonly, field, record }) => {
  const { sessionId, database } = useSessionStore();
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [searchText, setSearchText] = useState('');
  const [autocompleteResults, setAutocompleteResults] = useState([]);
  const [showAutocomplete, setShowAutocomplete] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showFormDialog, setShowFormDialog] = useState(false);
  const [editingRecordId, setEditingRecordId] = useState(null);
  const searchInputRef = useRef(null);
  const autocompleteTimeoutRef = useRef(null);

  const targetModel = field?.relation;

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

        // Extract visible fields from tree view or use all fields
        const fieldNames = Object.keys(viewDef.fields).slice(0, 5); // Limit to first 5 fields

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
        console.error('Error loading One2Many records:', error);
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
   * Handle New button - open FormDialog for creating new record
   */
  const handleNew = () => {
    setEditingRecordId(null);
    setShowFormDialog(true);
  };

  /**
   * Handle Edit button - open FormDialog for editing existing record
   */
  const handleEdit = (recordId) => {
    setEditingRecordId(recordId);
    setShowFormDialog(true);
  };

  /**
   * Handle form dialog save
   */
  const handleFormSave = (recordId) => {
    if (editingRecordId) {
      // Editing existing record - already in the list, just close dialog
      // The record will be reloaded on next render
    } else {
      // Creating new record - add to the relationship
      const newValue = value && Array.isArray(value) ? [...value, recordId] : [recordId];
      onChange(name, newValue);
    }
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
   * Handle delete record
   */
  const handleDelete = (recordId) => {
    if (!value || !Array.isArray(value)) return;

    const newValue = value.filter((id) => id !== recordId);
    onChange(name, newValue);
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
          recordId={editingRecordId}
          title={editingRecordId ? `Edit ${field?.string || 'Record'}` : `New ${field?.string || 'Record'}`}
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
                {!readonly && <th className="bg-light" style={{ width: '80px' }}>Actions</th>}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.id}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                {!readonly && (
                  <td>
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      className="me-1"
                      onClick={() => handleEdit(row.original.id)}
                      title="Edit"
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => handleDelete(row.original.id)}
                      title="Delete"
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
        recordId={editingRecordId}
        title={editingRecordId ? `Edit ${field?.string || 'Record'}` : `New ${field?.string || 'Record'}`}
        defaults={searchText ? { rec_name: searchText } : {}}
      />
    </div>
  );
};

export default One2ManyWidget;
