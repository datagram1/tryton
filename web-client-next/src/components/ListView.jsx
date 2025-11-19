import { useState, useEffect, useCallback, useRef } from 'react';
import { Container, Table, Spinner, Alert, Button, ButtonGroup, Pagination, Form, InputGroup, Dropdown, DropdownButton, Modal } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSync, FaSearch, FaTimes, FaFileExport, FaEllipsisV, FaChevronRight, FaChevronDown, FaGripVertical, FaColumns } from 'react-icons/fa';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  getSortedRowModel,
  getExpandedRowModel,
} from '@tanstack/react-table';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import useTabsStore from '../store/tabs';

/**
 * SortableRow Component - 8.7 Drag and Drop
 * Individual draggable row for the list view
 */
function SortableRow({ row, children, isDragEnabled }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: row.id, disabled: !isDragEnabled });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <tr ref={setNodeRef} style={style}>
      {isDragEnabled && (
        <td {...attributes} {...listeners} style={{ cursor: 'grab', width: '40px', textAlign: 'center' }}>
          <FaGripVertical style={{ color: '#999' }} />
        </td>
      )}
      {children}
    </tr>
  );
}

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
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [rowSelection, setRowSelection] = useState({});

  // Column visibility state
  const [columnVisibility, setColumnVisibility] = useState({});

  // Column resizing state
  const [columnWidths, setColumnWidths] = useState({});
  const resizingColumn = useRef(null);

  // Expanded rows for tree structure
  const [expanded, setExpanded] = useState({});

  // Inline editing state
  const [editingCell, setEditingCell] = useState(null); // { rowId, columnId, value }

  // Context menu state
  const [contextMenu, setContextMenu] = useState(null); // { x, y, record }

  // Aggregation data
  const [aggregations, setAggregations] = useState({});

  // Infinite scroll state
  const [hasMore, setHasMore] = useState(true);
  const infiniteScrollObserver = useRef(null);

  // 8.7 Drag and Drop state
  const [isDragEnabled, setIsDragEnabled] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

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
            field: field, // Store field definition for button rendering
          };
        });

        // 8.10 Add button columns if buttons exist in view
        if (parsedView._buttons && parsedView._buttons.length > 0) {
          parsedView._buttons.forEach((buttonDef, index) => {
            cols.push({
              id: `button_${buttonDef.name}_${index}`,
              accessorKey: `_button_${index}`,
              header: buttonDef.string || buttonDef.name,
              button: buttonDef, // Mark as button column
              cell: (info) => (
                <Button
                  size="sm"
                  variant="outline-primary"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleButtonClick(buttonDef, info.row.original);
                  }}
                  title={buttonDef.string || buttonDef.name}
                >
                  {buttonDef.string || buttonDef.name}
                </Button>
              ),
            });
          });
        }

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
   * Extract visible fields and buttons from tree view XML
   */
  const extractVisibleFields = (viewNode, fieldDefs) => {
    const fields = [];
    const buttons = [];

    const traverse = (node) => {
      if (node.tag === 'field') {
        const fieldName = node.attributes?.name || node.name;
        if (fieldName && !fields.includes(fieldName)) {
          fields.push(fieldName);
        }
      }
      // 8.10 Extract button elements
      if (node.tag === 'button') {
        const buttonName = node.attributes?.name || node.name;
        if (buttonName) {
          buttons.push({
            name: buttonName,
            string: node.attributes?.string || buttonName,
            confirm: node.attributes?.confirm,
            icon: node.attributes?.icon,
            attributes: node.attributes,
          });
        }
      }

      if (node.children) {
        node.children.forEach(traverse);
      }
    };

    traverse(viewNode);

    // Store buttons for later use
    viewNode._buttons = buttons;

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
   * 8.9 Export to CSV
   */
  const handleExportToCSV = useCallback(() => {
    if (records.length === 0) return;

    // Create CSV header
    const headers = columns.map(col => col.header).join(',');

    // Create CSV rows
    const rows = records.map(record => {
      return columns.map(col => {
        const value = record[col.accessorKey];
        const formattedValue = formatCellValue(value, fields[col.accessorKey]?.type);
        // Escape quotes and wrap in quotes if contains comma
        const escaped = String(formattedValue).replace(/"/g, '""');
        return escaped.includes(',') ? `"${escaped}"` : escaped;
      }).join(',');
    });

    const csv = [headers, ...rows].join('\n');

    // Create download link
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `${modelName}_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [records, columns, fields, modelName]);

  /**
   * 8.2 Column Resizing Handlers
   */
  const handleColumnResizeStart = useCallback((e, columnId) => {
    e.preventDefault();
    resizingColumn.current = {
      columnId,
      startX: e.pageX,
      startWidth: e.target.parentElement.offsetWidth,
    };

    const handleMouseMove = (e) => {
      if (!resizingColumn.current) return;
      const { columnId, startX, startWidth } = resizingColumn.current;
      const diff = e.pageX - startX;
      const newWidth = Math.max(50, startWidth + diff);
      setColumnWidths(prev => ({ ...prev, [columnId]: newWidth }));
    };

    const handleMouseUp = () => {
      resizingColumn.current = null;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, []);

  /**
   * 8.1 Tree Expansion Handlers
   */
  const handleToggleExpand = useCallback((recordId) => {
    setExpanded(prev => ({
      ...prev,
      [recordId]: !prev[recordId],
    }));
  }, []);

  /**
   * 8.6 Inline Cell Editing Handlers
   */
  const handleCellDoubleClick = useCallback((record, column) => {
    // Only allow editing for certain field types
    const field = fields[column.accessorKey];
    if (!field || field.readonly) return;

    const editableTypes = ['char', 'text', 'integer', 'float', 'numeric'];
    if (!editableTypes.includes(field.type)) return;

    setEditingCell({
      rowId: record.id,
      columnId: column.accessorKey,
      value: record[column.accessorKey] || '',
    });
  }, [fields]);

  const handleCellEditChange = useCallback((e) => {
    setEditingCell(prev => ({
      ...prev,
      value: e.target.value,
    }));
  }, []);

  const handleCellEditSave = useCallback(async () => {
    if (!editingCell) return;

    try {
      const { rowId, columnId, value } = editingCell;
      await rpc.write(modelName, [rowId], { [columnId]: value }, sessionId, database);

      // Update local record
      setRecords(prev => prev.map(r =>
        r.id === rowId ? { ...r, [columnId]: value } : r
      ));

      setEditingCell(null);
    } catch (err) {
      console.error('Error saving cell edit:', err);
      setError(err.message || 'Failed to save edit');
    }
  }, [editingCell, modelName, sessionId, database]);

  const handleCellEditCancel = useCallback(() => {
    setEditingCell(null);
  }, []);

  /**
   * 8.8 Context Menu Handlers
   */
  const handleContextMenu = useCallback((e, record) => {
    e.preventDefault();
    setContextMenu({
      x: e.pageX,
      y: e.pageY,
      record,
    });
  }, []);

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  /**
   * 8.4 Calculate Aggregations
   */
  useEffect(() => {
    if (records.length === 0) return;

    const newAggregations = {};

    columns.forEach(col => {
      const field = fields[col.accessorKey];
      if (!field) return;

      // Only aggregate numeric fields
      if (['integer', 'float', 'numeric'].includes(field.type)) {
        const values = records
          .map(r => r[col.accessorKey])
          .filter(v => v !== null && v !== undefined && !isNaN(v));

        if (values.length > 0) {
          const sum = values.reduce((acc, val) => acc + Number(val), 0);
          const avg = sum / values.length;
          newAggregations[col.accessorKey] = {
            sum: sum.toFixed(2),
            avg: avg.toFixed(2),
            count: values.length,
          };
        }
      }
    });

    setAggregations(newAggregations);
  }, [records, columns, fields]);

  /**
   * 8.11 Infinite Scroll - Load more records when scrolling to bottom
   */
  const handleLoadMore = useCallback(async () => {
    if (isLoading || !hasMore || records.length >= total) return;

    try {
      setIsLoading(true);
      const newOffset = records.length;

      // Get searchable fields
      const searchableFields = Object.keys(fields).filter(fieldName => {
        const field = fields[fieldName];
        return field && ['char', 'text'].includes(field.type);
      });

      // Build search domain
      const searchDomain = buildSearchDomain(domain, debouncedSearchQuery, searchableFields);

      // Get visible fields
      const visibleFields = columns.map(col => col.accessorKey);
      if (!visibleFields.includes('id')) {
        visibleFields.push('id');
      }

      // Load more records
      const newRecords = await rpc.searchRead(
        modelName,
        searchDomain,
        newOffset,
        limit,
        null,
        visibleFields,
        sessionId,
        database
      );

      if (newRecords && newRecords.length > 0) {
        setRecords(prev => [...prev, ...newRecords]);
      }

      if (!newRecords || newRecords.length < limit) {
        setHasMore(false);
      }
    } catch (err) {
      console.error('Error loading more records:', err);
    } finally {
      setIsLoading(false);
    }
  }, [isLoading, hasMore, records, total, fields, domain, debouncedSearchQuery, columns, modelName, sessionId, database, limit, buildSearchDomain]);

  /**
   * 8.11 Setup intersection observer for infinite scroll
   */
  useEffect(() => {
    const sentinel = document.getElementById('infinite-scroll-sentinel');
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          handleLoadMore();
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [handleLoadMore]);

  /**
   * 8.10 Handle Button Click
   */
  const handleButtonClick = useCallback(async (buttonDef, record) => {
    // Show confirmation dialog if needed
    if (buttonDef.confirm) {
      const confirmed = window.confirm(buttonDef.confirm);
      if (!confirmed) return;
    }

    try {
      setIsLoading(true);

      // Call the button method on the server
      await rpc.call(
        modelName,
        buttonDef.name,
        [[record.id]],
        {},
        sessionId,
        database
      );

      // Refresh the view after button execution
      window.location.reload();
    } catch (err) {
      console.error('Error executing button action:', err);
      setError(err.message || 'Failed to execute button action');
    } finally {
      setIsLoading(false);
    }
  }, [modelName, sessionId, database]);

  /**
   * 8.7 Handle Drag End
   */
  const handleDragEnd = useCallback(async (event) => {
    const { active, over } = event;

    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = records.findIndex(r => r.id === active.id);
    const newIndex = records.findIndex(r => r.id === over.id);

    if (oldIndex === -1 || newIndex === -1) {
      return;
    }

    // Optimistically update the local state
    const newRecords = arrayMove(records, oldIndex, newIndex);
    setRecords(newRecords);

    // If the model has a sequence field, update it on the server
    try {
      // Check if the model has a sequence field
      if (fields.sequence) {
        // Update sequence values for affected records
        const updates = [];
        newRecords.forEach((record, index) => {
          const newSequence = offset + index + 1;
          if (record.sequence !== newSequence) {
            updates.push([record.id, { sequence: newSequence }]);
          }
        });

        // Batch update all affected records
        for (const [recordId, values] of updates) {
          await rpc.write(modelName, [recordId], values, sessionId, database);
        }
      }
    } catch (err) {
      console.error('Error updating record order:', err);
      setError(err.message || 'Failed to update record order');
      // Revert on error
      window.location.reload();
    }
  }, [records, fields, offset, modelName, sessionId, database]);

  /**
   * Initialize table
   */
  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
      rowSelection,
      columnVisibility,
      expanded,
    },
    onSortingChange: setSorting,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    onExpandedChange: setExpanded,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getExpandedRowModel: getExpandedRowModel(),
  });

  /**
   * Handle refresh
   */
  const handleRefresh = () => {
    setOffset(0);
    window.location.reload(); // Simple refresh for now
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
            {/* 8.9 Export to CSV */}
            <Button
              variant="outline-success"
              onClick={handleExportToCSV}
              disabled={records.length === 0}
              title="Export to CSV"
            >
              <FaFileExport className="me-1" /> Export
            </Button>
            {/* 8.7 Drag Mode Toggle */}
            {fields.sequence && (
              <Button
                variant={isDragEnabled ? 'primary' : 'outline-secondary'}
                onClick={() => setIsDragEnabled(!isDragEnabled)}
                title="Toggle drag and drop reordering"
              >
                <FaGripVertical className="me-1" />
                {isDragEnabled ? 'Drag Mode ON' : 'Drag Mode'}
              </Button>
            )}
            {/* 8.3 Column Visibility Toggle */}
            <DropdownButton
              as={ButtonGroup}
              size="sm"
              variant="outline-secondary"
              title={<><FaColumns className="me-1" /> Columns</>}
              id="column-visibility-dropdown"
            >
              {table.getAllLeafColumns().map(column => (
                <Dropdown.Item
                  key={column.id}
                  as="div"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Form.Check
                    type="checkbox"
                    id={`col-${column.id}`}
                    label={column.columnDef.header}
                    checked={column.getIsVisible()}
                    onChange={column.getToggleVisibilityHandler()}
                  />
                </Dropdown.Item>
              ))}
            </DropdownButton>
          </ButtonGroup>

          {/* Search Box */}
          <div className="ms-3 flex-grow-1" style={{ maxWidth: '400px' }}>
            <InputGroup size="sm">
              <InputGroup.Text>
                <FaSearch />
              </InputGroup.Text>
              <Form.Control
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
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <Table hover size="sm" className="mb-0">
            <thead className="sticky-top bg-light">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {/* 8.7 Drag handle column header */}
                  {isDragEnabled && (
                    <th style={{ width: '40px' }}>
                      <FaGripVertical style={{ color: '#ccc' }} />
                    </th>
                  )}
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
                    style={{
                      cursor: 'pointer',
                      position: 'relative',
                      width: columnWidths[header.id] || 'auto',
                    }}
                  >
                    {flexRender(
                      header.column.columnDef.header,
                      header.getContext()
                    )}
                    {{
                      asc: ' 🔼',
                      desc: ' 🔽',
                    }[header.column.getIsSorted()] ?? null}
                    {/* 8.2 Column Resizer */}
                    <div
                      onMouseDown={(e) => handleColumnResizeStart(e, header.id)}
                      style={{
                        position: 'absolute',
                        right: 0,
                        top: 0,
                        bottom: 0,
                        width: '5px',
                        cursor: 'col-resize',
                        userSelect: 'none',
                        background: 'transparent',
                      }}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            <SortableContext
              items={records.map(r => r.id)}
              strategy={verticalListSortingStrategy}
            >
              {table.getRowModel().rows.map((row) => (
                <SortableRow
                  key={row.id}
                  row={row.original}
                  isDragEnabled={isDragEnabled}
                >
                  {/* Checkbox column */}
                  <td
                    onClick={(e) => e.stopPropagation()}
                    className={selectedRows.has(row.original.id) ? 'table-active' : ''}
                  >
                    <Form.Check
                      type="checkbox"
                      checked={selectedRows.has(row.original.id)}
                      onChange={() => handleSelectRow(row.original.id)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                  {/* Data columns */}
                  {row.getVisibleCells().map((cell) => {
                    const isEditing =
                      editingCell &&
                      editingCell.rowId === row.original.id &&
                      editingCell.columnId === cell.column.id;

                    return (
                      <td
                        key={cell.id}
                        onClick={() => !isEditing && handleRowClick(row.original)}
                        onDoubleClick={() => handleCellDoubleClick(row.original, cell.column)}
                        onContextMenu={(e) => handleContextMenu(e, row.original)}
                        style={{ cursor: isEditing ? 'text' : 'pointer' }}
                        className={selectedRows.has(row.original.id) ? 'table-active' : ''}
                      >
                        {/* 8.6 Inline Cell Editing */}
                        {isEditing ? (
                          <Form.Control
                            size="sm"
                            type="text"
                            value={editingCell.value}
                            onChange={handleCellEditChange}
                            onBlur={handleCellEditSave}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleCellEditSave();
                              if (e.key === 'Escape') handleCellEditCancel();
                            }}
                            autoFocus
                          />
                        ) : (
                          flexRender(cell.column.columnDef.cell, cell.getContext())
                        )}
                      </td>
                    );
                  })}
                </SortableRow>
              ))}
            </SortableContext>
          </tbody>
          {/* 8.4 Aggregation Footer */}
          {Object.keys(aggregations).length > 0 && (
            <tfoot className="bg-light">
              <tr>
                {isDragEnabled && <th></th>}
                <th></th>
                {table.getHeaderGroups()[0].headers.map((header) => {
                  const agg = aggregations[header.id];
                  return (
                    <th key={header.id} className="small">
                      {agg && (
                        <div>
                          <div>Sum: {agg.sum}</div>
                          <div>Avg: {agg.avg}</div>
                        </div>
                      )}
                    </th>
                  );
                })}
              </tr>
            </tfoot>
          )}
        </Table>
        </DndContext>

        {records.length === 0 && (
          <div className="text-center p-5 text-muted">
            No records found
          </div>
        )}

        {/* 8.11 Infinite Scroll Sentinel */}
        {hasMore && records.length > 0 && records.length < total && (
          <div
            id="infinite-scroll-sentinel"
            style={{ height: '20px', margin: '10px 0' }}
          >
            {isLoading && (
              <div className="text-center">
                <Spinner animation="border" size="sm" variant="primary" />
                <span className="ms-2 small">Loading more...</span>
              </div>
            )}
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

      {/* 8.8 Context Menu */}
      {contextMenu && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1000,
            }}
            onClick={handleCloseContextMenu}
          />
          <div
            style={{
              position: 'fixed',
              top: contextMenu.y,
              left: contextMenu.x,
              zIndex: 1001,
              backgroundColor: 'white',
              border: '1px solid #ccc',
              borderRadius: '4px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
              minWidth: '180px',
            }}
          >
            <div className="list-group list-group-flush">
              <button
                className="list-group-item list-group-item-action"
                onClick={() => {
                  handleRowClick(contextMenu.record);
                  handleCloseContextMenu();
                }}
              >
                <FaEdit className="me-2" /> Open
              </button>
              <button
                className="list-group-item list-group-item-action"
                onClick={() => {
                  handleSelectRow(contextMenu.record.id);
                  handleCloseContextMenu();
                }}
              >
                {selectedRows.has(contextMenu.record.id) ? 'Deselect' : 'Select'}
              </button>
              <button
                className="list-group-item list-group-item-action text-danger"
                onClick={async () => {
                  const confirmed = window.confirm('Are you sure you want to delete this record?');
                  if (confirmed) {
                    try {
                      await rpc.delete(modelName, [contextMenu.record.id], sessionId, database);
                      window.location.reload();
                    } catch (err) {
                      setError(err.message || 'Failed to delete record');
                    }
                  }
                  handleCloseContextMenu();
                }}
              >
                <FaTrash className="me-2" /> Delete
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

export default ListView;
