import React from 'react';
import { Form } from 'react-bootstrap';
import { FaPhone } from 'react-icons/fa';

/**
 * CallToWidget - Phone number input field with tel: link
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (phone number)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const CallToWidget = ({ name, value, onChange, readonly, field }) => {
  // Format phone number for display (simple formatting)
  const formatPhoneNumber = (phone) => {
    if (!phone) return '';
    // Remove all non-numeric characters for tel: link
    const cleaned = phone.replace(/\D/g, '');
    return cleaned;
  };

  if (readonly) {
    if (!value) {
      return <span className="form-control-plaintext"></span>;
    }

    const telLink = `tel:${formatPhoneNumber(value)}`;

    return (
      <div className="form-control-plaintext">
        <a
          href={telLink}
          className="text-primary"
          title={`Call ${value}`}
        >
          <FaPhone className="me-1" />
          {value}
        </a>
      </div>
    );
  }

  return (
    <div>
      <Form.Control
        type="tel"
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={field?.help || '+1 (555) 123-4567'}
        required={field?.required}
      />
      {value && (
        <small className="text-muted">
          <a href={`tel:${formatPhoneNumber(value)}`} className="text-primary">
            <FaPhone className="me-1" size={10} />
            Call
          </a>
        </small>
      )}
    </div>
  );
};

export default CallToWidget;
