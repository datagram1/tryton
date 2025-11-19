import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * SelectionWidget - Dropdown for selection fields
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (key from selection)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata (must include 'selection' array)
 */
const SelectionWidget = ({ name, value, onChange, readonly, field }) => {
  const selection = field?.selection || [];

  if (readonly) {
    // Find the display value for the current selection
    const selectedOption = selection.find(([key]) => key === value);
    const displayValue = selectedOption ? selectedOption[1] : value || '';
    return <span className="form-control-plaintext">{displayValue}</span>;
  }

  return (
    <Form.Select
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value || null)}
      required={field?.required}
    >
      <option value="">-- Select --</option>
      {selection.map(([key, label]) => (
        <option key={key} value={key}>
          {label}
        </option>
      ))}
    </Form.Select>
  );
};

export default SelectionWidget;
