import React, { useState } from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import { FaEye, FaEyeSlash } from 'react-icons/fa';

/**
 * PasswordWidget - Password input field with show/hide toggle
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const PasswordWidget = ({ name, value, onChange, readonly, field }) => {
  const [showPassword, setShowPassword] = useState(false);

  if (readonly) {
    // Don't show password in readonly mode for security
    return <span className="form-control-plaintext">••••••••</span>;
  }

  return (
    <InputGroup>
      <Form.Control
        type={showPassword ? 'text' : 'password'}
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={field?.help || 'Enter password'}
        required={field?.required}
        autoComplete="new-password"
      />
      <Button
        variant="outline-secondary"
        onClick={() => setShowPassword(!showPassword)}
        title={showPassword ? 'Hide password' : 'Show password'}
      >
        {showPassword ? <FaEyeSlash /> : <FaEye />}
      </Button>
    </InputGroup>
  );
};

export default PasswordWidget;
