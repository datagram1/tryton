import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * DateWidget - Date input field
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (Tryton format: 'YYYY-MM-DD')
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const DateWidget = ({ name, value, onChange, readonly, field }) => {
  // Convert Tryton date format to display format
  const formatDateForDisplay = (dateStr) => {
    if (!dateStr) return '';
    // Tryton uses 'YYYY-MM-DD' which is already HTML5 date format
    return dateStr;
  };

  // Convert input value to Tryton format
  const handleChange = (e) => {
    const inputDate = e.target.value; // Already in 'YYYY-MM-DD' format
    onChange(name, inputDate || null);
  };

  if (readonly) {
    return (
      <span className="form-control-plaintext">
        {value ? new Date(value).toLocaleDateString() : ''}
      </span>
    );
  }

  return (
    <Form.Control
      type="date"
      name={name}
      value={formatDateForDisplay(value)}
      onChange={handleChange}
      required={field?.required}
    />
  );
};

export default DateWidget;
