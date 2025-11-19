import React from 'react';
import { Form } from 'react-bootstrap';
import { FaEnvelope } from 'react-icons/fa';

/**
 * EmailWidget - Email input field with mailto: link
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (email address)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const EmailWidget = ({ name, value, onChange, readonly, field }) => {
  // Validate email format
  const isValidEmail = (email) => {
    if (!email) return false;
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (readonly) {
    if (!value) {
      return <span className="form-control-plaintext"></span>;
    }

    return (
      <div className="form-control-plaintext">
        <a
          href={`mailto:${value}`}
          className="text-primary"
          title={`Send email to ${value}`}
        >
          <FaEnvelope className="me-1" />
          {value}
        </a>
      </div>
    );
  }

  return (
    <div>
      <Form.Control
        type="email"
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={field?.help || 'email@example.com'}
        required={field?.required}
      />
      {value && isValidEmail(value) && (
        <small className="text-muted">
          <a href={`mailto:${value}`} className="text-primary">
            <FaEnvelope className="me-1" size={10} />
            Send email
          </a>
        </small>
      )}
    </div>
  );
};

export default EmailWidget;
