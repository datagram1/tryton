import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * FloatWidget - Numeric input field for float/decimal types
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {number} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const FloatWidget = ({ name, value, onChange, readonly, field }) => {
  if (readonly) {
    return <span className="form-control-plaintext">{value ?? ''}</span>;
  }

  // Get digits from field metadata if available
  const step = field?.digits ? Math.pow(10, -field.digits[1]) : 0.01;

  return (
    <Form.Control
      type="number"
      step={step}
      name={name}
      value={value ?? ''}
      onChange={(e) => onChange(name, parseFloat(e.target.value) || null)}
      placeholder={field?.help || ''}
      required={field?.required}
    />
  );
};

export default FloatWidget;
