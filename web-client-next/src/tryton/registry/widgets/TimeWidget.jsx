import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * TimeWidget - Time input field (HH:MM:SS format)
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (time string)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const TimeWidget = ({ name, value, onChange, readonly, field }) => {
  // Format time value for display
  const formatTime = (timeValue) => {
    if (!timeValue) return '';

    // If value is already in HH:MM or HH:MM:SS format, return as is
    if (typeof timeValue === 'string' && timeValue.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      return timeValue;
    }

    // If value is a datetime object or ISO string, extract time portion
    if (typeof timeValue === 'string') {
      const date = new Date(timeValue);
      if (!isNaN(date.getTime())) {
        return date.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit'
        });
      }
    }

    return timeValue;
  };

  if (readonly) {
    return (
      <span className="form-control-plaintext">
        {formatTime(value)}
      </span>
    );
  }

  return (
    <Form.Control
      type="time"
      name={name}
      value={value || ''}
      onChange={(e) => onChange(name, e.target.value)}
      required={field?.required}
      step="1" // Allow seconds input
    />
  );
};

export default TimeWidget;
