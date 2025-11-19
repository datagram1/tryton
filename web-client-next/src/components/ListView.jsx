import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Table, Spinner, Alert, Button, ButtonGroup, Pagination, Form, InputGroup } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSync, FaSearch, FaTimes, FaFileExport, FaFileImport } from 'react-icons/fa';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
} from '@tanstack/react-table';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import useTabsStore from '../store/tabs';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import ExportWindow from './ExportWindow';
import ImportWindow from './ImportWindow';

/**
 * ListView Component
 * Displays a list/tree view of Tryton records
 */
function ListView({ modelName, viewId = null, domain = [], limit = 80, onRecordClick }) {
  const { sessionId, database } = useSessionStore();
  const { openTab } = useTabsStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [fields, setFields] = useState({});
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [offset, setOffset] = useState(0);
  const [total, setTotal] = useState(0);
  const [sorting, setSorting] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('');
  const searchDebounceTimer = useRef(null);
  const searchInputRef = useRef(null);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [rowSelection, setRowSelection] = useState({});

  // Import/Export state
  const [showExport, setShowExport] = useState(false);
  const [showImport, setShowImport] = useState(false);

  /**
   * Debounce search query
   */
  useEffect(() => {
    // Clear existing timer
    if (searchDebounceTimer.current) {
      clearTimeout(searchDebounceTimer.current);
    }

    // Set new timer
    searchDebounceTimer.current = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
      setOffset(0); // Reset to first page when searching
    }, 500); // 500ms debounce

    // Cleanup
    return () => {
      if (searchDebounceTimer.current) {
        clearTimeout(searchDebounceTimer.current);
      }
    };
  }, [searchQuery]);

  /**
   * Build search domain based on search query
   */
  const buildSearchDomain = useCallback((baseDomain, searchText, searchFields) => {
    if (!searchText || !searchFields || searchFields.length === 0) {
      return baseDomain;
    }

    // Create OR clause for searching across all searchable fields
    // Domain format: ['OR', ['field1', 'ilike', '%text%'], ['field2', 'ilike', '%text%'], ...]
    const searchClauses = searchFields.map(fieldName => [
      fieldName,
      'ilike',
      `%${searchText}%`
    ]);

    // Combine base domain with search clauses
    if (searchClauses.length === 1) {
      return [...baseDomain, searchClauses[0]];
    } else if (searchClauses.length > 1) {
      return [...baseDomain, ['OR', ...searchClauses]];
    }

    return baseDomain;
  }, []);

  /**
   * Load view definition and records
   */
  useEffect(() => {
    const loadViewAndData = async () => {
      console.log('[ListView] loadViewAndData called:', { modelName, sessionId, database, viewId });

      if (!modelName || !sessionId || !database) {
        console.log('[ListView] Missing required params, skipping load');
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch the tree view definition
        console.log('[ListView] Calling rpc.fieldsViewGet...');
        const viewResult = await rpc.fieldsViewGet(
          modelName,
          viewId,
          'tree',
          sessionId,
          database
        );
        console.log('[ListView] fieldsViewGet response:', viewResult);

        // 2. Parse the XML architecture
        const parsedView = parseAndNormalizeView(viewResult.arch);

        setViewDefinition(parsedView);
        setFields(viewResult.fields || {});

        // 3. Extract visible fields from the view
        const visibleFields = extractVisibleFields(parsedView, viewResult.fields);

        // 4. Build columns for the table
        const cols = visibleFields.map((fieldName) => {
          const field = viewResult.fields[fieldName];
          return {
            id: fieldName,
            accessorKey: fieldName,
            header: field?.string || fieldName,
            cell: (info) => formatCellValue(info.getValue(), field?.type),
          };
        });

        // Add ID column (hidden but needed for row identification)
        if (!visibleFields.includes('id')) {
          visibleFields.push('id');
        }

        setColumns(cols);

        // 5. Get searchable fields (char, text fields)
        const searchableFields = Object.keys(viewResult.fields).filter(fieldName => {
          const field = viewResult.fields[fieldName];
          return field && ['char', 'text'].includes(field.type);
        });

        // 6. Build search domain
        const searchDomain = buildSearchDomain(domain, debouncedSearchQuery, searchableFields);

        // 7. Search and read records
        await loadRecords(modelName, searchDomain, offset, limit, visibleFields);
      } catch (err) {
        console.error('Error loading view/data:', err);
        setError(err.message || 'Failed to load list view');
      } finally {
        setIsLoading(false);
      }
    };

    loadViewAndData();
  }, [modelName, viewId, sessionId, database, offset, debouncedSearchQuery, domain, buildSearchDomain]);

  /**
   * Load records from server
   */
  const loadRecords = async (model, searchDomain, searchOffset, searchLimit, fieldList) => {
    console.log('[ListView] loadRecords called:', {
      model,
      searchDomain,
      searchOffset,
      searchLimit,
      fieldList
    });

    try {
      // Count total records
      console.log('[ListView] Calling rpc.search to count records...');
      const ids = await rpc.search(
        model,
        searchDomain,
        0,
        null,
        null,
        sessionId,
        database
      );
      console.log('[ListView] search response:', ids);

      setTotal(ids?.length || 0);

      // Read records for current page
      console.log('[ListView] Calling rpc.searchRead to fetch records...');
      const recordData = await rpc.searchRead(
        model,
        searchDomain,
        searchOffset,
        searchLimit,
        null,
        fieldList,
        sessionId,
        database
      );
      console.log('[ListView] searchRead response:', recordData);

      setRecords(recordData || []);
    } catch (err) {
      console.error('[ListView] Error loading records:', err);
      throw err;
    }
  };

  /**
   * Extract visible fields from tree view XML
   */
  const extractVisibleFields = (viewNode, fieldDefs) => {
    const fields = [];

    const traverse = (node) => {
      if (node.tag === 'field') {
        const fieldName = node.attributes?.name || node.name;
        if (fieldName && !fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(viewNode);

    // If no fields found in view, use first 5 fields from definition
    if (fields.length === 0 && fieldDefs) {
      return Object.keys(fieldDefs).slice(0, 5);
    }

    return fields;
  };

  /**
   * Format cell value based on field type
   */
  const formatCellValue = (value, fieldType) => {
    if (value === null || value === undefined) {
      return '';
    }

    // Many2One fields: [id, name]
    if (Array.isArray(value)) {
      return value[1] || value[0];
    }

    // Boolean fields
    if (typeof value === 'boolean') {
      return value ? '✓' : '';
    }

    // Date fields
    if (fieldType === 'date' && value) {
      return new Date(value).toLocaleDateString();
    }

    // DateTime fields
    if (fieldType === 'datetime' && value) {
      return new Date(value).toLocaleString();
    }

    return value.toString();
  };

  /**
   * Handle row click
   */
  const handleRowClick = (record) => {
    if (onRecordClick) {
      onRecordClick(record);
    } else {
      // Get list of all record IDs for navigation
      const recordIds = records.map(r => r.id);
      const currentIndex = recordIds.indexOf(record.id);

      // Open form view in new tab with list context
      openTab({
        id: `form-${modelName}-${record.id}`,
        title: `${modelName} #${record.id}`,
        type: 'form',
        props: {
          modelName,
          recordId: record.id,
          // Pass list context for prev/next navigation
          listContext: {
            recordIds,
            currentIndex,
            domain,
            limit,
          },
        },
      });
    }
  };

  /**
   * Handle new record button click
   */
  const handleNew = () => {
    // Open form view in new tab for creating a new record
    openTab({
      id: `form-${modelName}-new-${Date.now()}`,
      title: `${modelName} - New`,
      type: 'form',
      props: {
        modelName,
        recordId: null, // null indicates a new record
      },
    });
  };

  /**
   * Handle row selection changes
   */
  const handleSelectRow = useCallback((recordId) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(recordId)) {
        newSet.delete(recordId);
      } else {
        newSet.add(recordId);
      }
      return newSet;
    });
  }, []);

  /**
   * Handle select all rows
   */
  const handleSelectAll = useCallback(() => {
    if (selectedRows.size === records.length) {
      // Deselect all
      setSelectedRows(new Set());
    } else {
      // Select all visible records
      setSelectedRows(new Set(records.map(r => r.id)));
    }
  }, [records, selectedRows]);

  /**
   * Handle delete selected rows
   */
  const handleDeleteSelected = useCallback(async () => {
    if (selectedRows.size === 0) return;

    const confirmed = window.confirm(
      `Are you sure you want to delete ${selectedRows.size} record(s)? This action cannot be undone.`
    );

    if (!confirmed) return;

    try {
      setIsLoading(true);
      await rpc.delete(modelName, Array.from(selectedRows), sessionId, database);

      // Clear selection and reload
      setSelectedRows(new Set());
      setOffset(0);
      window.location.reload();
    } catch (err) {
      console.error('Error deleting records:', err);
      setError(err.message || 'Failed to delete records');
      setIsLoading(false);
    }
  }, [selectedRows, modelName, sessionId, database]);

  /**
   * Register keyboard shortcuts for list view actions
   */
  useKeyboardShortcuts({
    'Ctrl+F': () => {
      // Focus the search input
      if (searchInputRef.current) {
        searchInputRef.current.focus();
        searchInputRef.current.select();
      }
    },
    'Ctrl+N': () => {
      handleNew();
    },
  }, [handleNew]);

  /**
   * Initialize table
   */
  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      rowSelection,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
  });

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setOffset(0);
    window.location.reload(); // Simple refresh for now
  };

  /**
   * Handle export button click
   */
  const handleExportClick = () => {
    setShowExport(true);
  };

  /**
   * Handle import button click
   */
  const handleImportClick = () => {
    setShowImport(true);
  };

  /**
   * Handle import complete
   */
  const handleImportComplete = () => {
    // Reload the list view
    handleRefresh();
  };

  /**
   * Handle pagination
   */
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  const handlePageChange = (page) => {
    setOffset((page - 1) * limit);
  };

  // Loading state
  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading list...</span>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container className="py-3">
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <div className="list-view h-100 d-flex flex-column">
      {/* Toolbar */}
      <div className="border-bottom p-2 bg-light">
        <div className="d-flex align-items-center">
          <ButtonGroup size="sm">
            <Button variant="outline-primary" onClick={handleNew}>
              <FaPlus className="me-1" /> New
            </Button>
            <Button variant="outline-secondary" onClick={handleRefresh}>
              <FaSync className="me-1" /> Refresh
            </Button>
            {selectedRows.size > 0 && (
              <Button
                variant="outline-danger"
                onClick={handleDeleteSelected}
                title={`Delete ${selectedRows.size} selected record(s)`}
              >
                <FaTrash className="me-1" /> Delete Selected ({selectedRows.size})
              </Button>
            )}
          </ButtonGroup>

          <ButtonGroup size="sm" className="ms-2">
            <Button variant="outline-success" onClick={handleImportClick}>
              <FaFileImport className="me-1" /> Import
            </Button>
            <Button variant="outline-info" onClick={handleExportClick}>
              <FaFileExport className="me-1" /> Export
            </Button>
          </ButtonGroup>

          {/* Search Box */}
          <div className="ms-3 flex-grow-1" style={{ maxWidth: '400px' }}>
            <InputGroup size="sm">
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
                ref={searchInputRef}
                type="text"
                placeholder="Search records... (Ctrl+F)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <Button
                  variant="outline-secondary"
                  onClick={() => setSearchQuery('')}
                  title="Clear search"
                >
                  <FaTimes />
                </Button>
              )}
            </InputGroup>
          </div>

          <span className="ms-auto text-muted small">
            {total} record(s)
          </span>
        </div>
      </div>

      {/* Table */}
      <div className="flex-grow-1 overflow-auto">
        <Table hover size="sm" className="mb-0">
          <thead className="sticky-top bg-light">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {/* Checkbox column header */}
                <th style={{ width: '40px' }}>
                  <Form.Check
                    type="checkbox"
                    checked={selectedRows.size === records.length && records.length > 0}
                    onChange={handleSelectAll}
                    title="Select all"
                  />
                </th>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    onClick={header.column.getToggleSortingHandler()}
                    style={{ cursor: 'pointer' }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{
                      asc: ' 🔼',
                      desc: ' 🔽',
                    }[header.column.getIsSorted()] ?? null}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr
                key={row.id}
                className={selectedRows.has(row.original.id) ? 'table-active' : ''}
              >
                {/* Checkbox column */}
                <td onClick={(e) => e.stopPropagation()}>
                  <Form.Check
                    type="checkbox"
                    checked={selectedRows.has(row.original.id)}
                    onChange={() => handleSelectRow(row.original.id)}
                    onClick={(e) => e.stopPropagation()}
                  />
                </td>
                {/* Data columns */}
                {row.getVisibleCells().map((cell) => (
                  <td
                    key={cell.id}
                    onClick={() => handleRowClick(row.original)}
                    style={{ cursor: 'pointer' }}
                  >
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </Table>

        {records.length === 0 && (
          <div className="text-center p-5 text-muted">
            No records found
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="border-top p-2 bg-light d-flex justify-content-center">
          <Pagination size="sm" className="mb-0">
            <Pagination.First
              onClick={() => handlePageChange(1)}
              disabled={currentPage === 1}
            />
            <Pagination.Prev
              onClick={() => handlePageChange(currentPage - 1)}
              disabled={currentPage === 1}
            />

            {[...Array(Math.min(5, totalPages))].map((_, i) => {
              const page = i + 1;
              return (
                <Pagination.Item
                  key={page}
                  active={page === currentPage}
                  onClick={() => handlePageChange(page)}
                >
                  {page}
                </Pagination.Item>
              );
            })}

            <Pagination.Next
              onClick={() => handlePageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            />
            <Pagination.Last
              onClick={() => handlePageChange(totalPages)}
              disabled={currentPage === totalPages}
            />
          </Pagination>
        </div>
      )}

      {/* Export Window */}
      <ExportWindow
        show={showExport}
        onHide={() => setShowExport(false)}
        modelName={modelName}
        fields={fields}
        recordIds={records.map(r => r.id)}
        selectedIds={Array.from(selectedRows)}
        domain={domain}
        totalCount={total}
      />

      {/* Import Window */}
      <ImportWindow
        show={showImport}
        onHide={() => setShowImport(false)}
        onImportComplete={handleImportComplete}
        modelName={modelName}
        fields={fields}
      />
    </div>
  );
}

export default ListView;
