import React, { useState, useEffect } from 'react';
import { Table, Button, Badge } from 'react-bootstrap';
import { FaPlus, FaTrash, FaEdit } from 'react-icons/fa';
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
} from '@tanstack/react-table';
import rpc from '../../../api/rpc';
import useSessionStore from '../../../store/session';

/**
 * One2ManyWidget - Data grid for One2Many relationships
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {Array} props.value - Array of record IDs
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata (must include 'relation' - the target model)
 */
const One2ManyWidget = ({ name, value, onChange, readonly, field }) => {
  const { sessionId, database } = useSessionStore();
  const [records, setRecords] = useState([]);
  const [columns, setColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

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

  // Readonly or empty state
  if (!value || !Array.isArray(value) || value.length === 0) {
    return (
      <div className="border rounded p-3 bg-light">
        <Badge bg="secondary">{value?.length || 0} record(s)</Badge>
        {!readonly && (
          <div className="mt-2">
            <Button size="sm" variant="outline-primary" disabled>
              <FaPlus className="me-1" /> Add (Not yet implemented)
            </Button>
          </div>
        )}
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
          <Button size="sm" variant="outline-primary" disabled>
            <FaPlus className="me-1" /> Add
          </Button>
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
                      disabled
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
    </div>
  );
};

export default One2ManyWidget;
