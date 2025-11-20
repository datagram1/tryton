import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * BooleanWidget - Checkbox for boolean fields
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {boolean} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const BooleanWidget = ({ name, value, onChange, readonly, field }) => {
  if (readonly) {
    return (
      <span className="form-control-plaintext">
        {value ? '✓' : ''}
      </span>
    );
  }

  return (
    <Form.Check
      type="checkbox"
      name={name}
      checked={!!value}
      onChange={(e) => onChange(name, e.target.checked)}
      disabled={readonly}
    />
  );
};

export default BooleanWidget;
