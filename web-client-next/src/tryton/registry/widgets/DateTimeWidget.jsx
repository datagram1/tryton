import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * DateTimeWidget - DateTime input field
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (Tryton format: ISO 8601)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const DateTimeWidget = ({ name, value, onChange, readonly, field }) => {
  // Convert Tryton datetime format to HTML5 datetime-local format
  const formatDateTimeForInput = (dateTimeStr) => {
    if (!dateTimeStr) return '';
    // Tryton sends ISO 8601: '2024-01-15T14:30:00'
    // datetime-local needs 'YYYY-MM-DDTHH:mm'
    try {
      const date = new Date(dateTimeStr);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const hours = String(date.getHours()).padStart(2, '0');
      const minutes = String(date.getMinutes()).padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}`;
    } catch (e) {
      return '';
    }
  };

  // Convert input value back to Tryton ISO format
  const handleChange = (e) => {
    const inputValue = e.target.value;
    if (!inputValue) {
      onChange(name, null);
      return;
    }
    // Convert 'YYYY-MM-DDTHH:mm' to ISO 8601
    const isoString = new Date(inputValue).toISOString();
    onChange(name, isoString);
  };

  if (readonly) {
    return (
      <span className="form-control-plaintext">
        {value ? new Date(value).toLocaleString() : ''}
      </span>
    );
  }

  return (
    <Form.Control
      type="datetime-local"
      name={name}
      value={formatDateTimeForInput(value)}
      onChange={handleChange}
      required={field?.required}
    />
  );
};

export default DateTimeWidget;
