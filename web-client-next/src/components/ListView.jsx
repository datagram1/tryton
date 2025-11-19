import { useState, useEffect } from 'react';
import { Container, Table, Spinner, Alert, Button, ButtonGroup, Pagination } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaSync } from 'react-icons/fa';
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

        // 5. Search and read records
        await loadRecords(modelName, domain, offset, limit, visibleFields);
      } catch (err) {
        console.error('Error loading view/data:', err);
        setError(err.message || 'Failed to load list view');
      } finally {
        setIsLoading(false);
      }
    };

    loadViewAndData();
  }, [modelName, viewId, sessionId, database, offset]);

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
      // Open form view in new tab
      openTab({
        id: `form-${modelName}-${record.id}`,
        title: `${modelName} #${record.id}`,
        type: 'form',
        props: {
          modelName,
          recordId: record.id,
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
   * Initialize table
   */
  const table = useReactTable({
    data: records,
    columns,
    state: {
      sorting,
    },
    onSortingChange: setSorting,
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
        <ButtonGroup size="sm">
          <Button variant="outline-primary" onClick={handleNew}>
            <FaPlus className="me-1" /> New
          </Button>
          <Button variant="outline-secondary" onClick={handleRefresh}>
            <FaSync className="me-1" /> Refresh
          </Button>
        </ButtonGroup>
        <span className="ms-3 text-muted small">
          {total} record(s)
        </span>
      </div>

      {/* Table */}
      <div className="flex-grow-1 overflow-auto">
        <Table hover size="sm" className="mb-0">
          <thead className="sticky-top bg-light">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
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
                onClick={() => handleRowClick(row.original)}
                style={{ cursor: 'pointer' }}
              >
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id}>
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
    </div>
  );
}

export default ListView;
