import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * NumericWidget - Arbitrary precision decimal input
 * Supports very precise decimal numbers and scientific notation
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string|number} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const NumericWidget = ({ name, value, onChange, readonly, field }) => {
  // Format numeric value for display
  const formatNumeric = (val) => {
    if (val === null || val === undefined || val === '') return '';

    // Handle scientific notation
    const numStr = String(val);
    if (numStr.includes('e') || numStr.includes('E')) {
      return numStr;
    }

    return numStr;
  };

  // Validate numeric input (allows scientific notation)
  const isValidNumeric = (val) => {
    if (!val) return true;

    // Allow numbers, decimal points, minus sign, and scientific notation (e/E)
    const numericRegex = /^-?\d*\.?\d*([eE][+-]?\d+)?$/;
    return numericRegex.test(val);
  };

  if (readonly) {
    return (
      <span className="form-control-plaintext">
        {formatNumeric(value)}
      </span>
    );
  }

  return (
    <div>
      <Form.Control
        type="text"
        name={name}
        value={value || ''}
        onChange={(e) => {
          const val = e.target.value;
          // Only update if valid numeric format
          if (isValidNumeric(val)) {
            onChange(name, val);
          }
        }}
        placeholder={field?.help || '0.00'}
        required={field?.required}
        className="text-end"
        style={{ fontFamily: 'monospace' }}
      />
      <small className="text-muted">
        Supports scientific notation (e.g., 1.23e-5)
      </small>
    </div>
  );
};

export default NumericWidget;
