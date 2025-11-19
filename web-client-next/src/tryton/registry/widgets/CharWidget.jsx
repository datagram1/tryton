import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * CharWidget - Text input field for char/string types
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const CharWidget = ({ name, value, onChange, readonly, field }) => {
  if (readonly) {
    return <span className="form-control-plaintext">{value || ''}</span>;
  }

  return (
    <Form.Control
      type="text"
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={field?.help || ''}
      required={field?.required}
    />
  );
};

export default CharWidget;
