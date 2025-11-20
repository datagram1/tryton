import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * CharWidget - Text input field for char/string types and multi-line text
 * Supports both single-line (char) and multi-line (text) input
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const CharWidget = ({ name, value, onChange, readonly, field }) => {
  const isMultiline = field?.type === 'text';

  if (readonly) {
    if (isMultiline) {
      // For text fields, preserve line breaks in readonly mode
      return (
        <div className="form-control-plaintext" style={{ whiteSpace: 'pre-wrap' }}>
          {value || ''}
        </div>
      );
    }
    return <span className="form-control-plaintext">{value || ''}</span>;
  }

  // Multi-line textarea for 'text' type
  if (isMultiline) {
    return (
      <Form.Control
        as="textarea"
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={field?.help || ''}
        required={field?.required}
        rows={field?.rows || 5}
        style={{ resize: 'vertical' }}
      />
    );
  }

  // Single-line input for 'char' type
  return (
    <Form.Control
      type="text"
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      placeholder={field?.help || ''}
      required={field?.required}
      maxLength={field?.size || undefined}
    />
  );
};

export default CharWidget;
