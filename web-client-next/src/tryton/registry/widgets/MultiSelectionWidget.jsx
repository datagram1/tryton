import React from 'react';
import { Form, Badge } from 'react-bootstrap';
import { FaTimes } from 'react-icons/fa';

/**
 * MultiSelectionWidget - Multiple selection with tag display
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {Array} props.value - Current value (array of selected keys)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata with selection array
 */
const MultiSelectionWidget = ({ name, value, onChange, readonly, field }) => {
  // Get selection options from field metadata
  const selection = field?.selection || [];

  // Ensure value is an array
  const selectedValues = Array.isArray(value) ? value : [];

  // Get display name for a value
  const getDisplayName = (key) => {
    const option = selection.find(([optKey]) => optKey === key);
    return option ? option[1] : key;
  };

  // Handle adding a selection
  const handleSelect = (e) => {
    const selectedKey = e.target.value;
    if (!selectedKey || selectedValues.includes(selectedKey)) {
      return;
    }

    const newValues = [...selectedValues, selectedKey];
    onChange(name, newValues);

    // Reset select
    e.target.value = '';
  };

  // Handle removing a selection
  const handleRemove = (key) => {
    const newValues = selectedValues.filter(v => v !== key);
    onChange(name, newValues);
  };

  if (readonly) {
    return (
      <div className="form-control-plaintext">
        {selectedValues.length === 0 ? (
          <span className="text-muted">None</span>
        ) : (
          <div className="d-flex flex-wrap gap-1">
            {selectedValues.map((key) => (
              <Badge key={key} bg="secondary">
                {getDisplayName(key)}
              </Badge>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Selected tags */}
      {selectedValues.length > 0 && (
        <div className="d-flex flex-wrap gap-1 mb-2">
          {selectedValues.map((key) => (
            <Badge
              key={key}
              bg="primary"
              className="d-flex align-items-center"
              style={{ cursor: 'pointer' }}
            >
              {getDisplayName(key)}
              <FaTimes
                className="ms-1"
                size={12}
                onClick={() => handleRemove(key)}
                title="Remove"
              />
            </Badge>
          ))}
        </div>
      )}

      {/* Selection dropdown */}
      <Form.Select
        size="sm"
        onChange={handleSelect}
        value=""
        disabled={readonly}
      >
        <option value="">Select to add...</option>
        {selection
          .filter(([key]) => !selectedValues.includes(key))
          .map(([key, label]) => (
            <option key={key} value={key}>
              {label}
            </option>
          ))}
      </Form.Select>
    </div>
  );
};

export default MultiSelectionWidget;
