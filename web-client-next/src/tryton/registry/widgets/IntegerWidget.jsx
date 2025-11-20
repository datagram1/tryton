import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * IntegerWidget - Numeric input field for integer types
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {number} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const IntegerWidget = ({ name, value, onChange, readonly, field }) => {
  if (readonly) {
    return <span className="form-control-plaintext">{value ?? ''}</span>;
  }

  return (
    <Form.Control
      type="number"
      step="1"
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange(name, parseInt(e.target.value, 10) || null)}
      placeholder={field?.help || ''}
      required={field?.required}
    />
  );
};

export default IntegerWidget;
