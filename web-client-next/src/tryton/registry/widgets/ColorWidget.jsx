import React from 'react';
import { Form, InputGroup } from 'react-bootstrap';

/**
 * ColorWidget - Color picker input field
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (hex color code)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const ColorWidget = ({ name, value, onChange, readonly, field }) => {
  // Normalize color value to hex format
  const normalizeColor = (color) => {
    if (!color) return '#000000';
    // Ensure it starts with #
    if (!color.startsWith('#')) {
      return `#${color}`;
    }
    return color;
  };

  // Validate hex color
  const isValidHex = (color) => {
    if (!color) return false;
    const hexRegex = /^#?([0-9A-F]{3}|[0-9A-F]{6})$/i;
    return hexRegex.test(color);
  };

  const displayColor = normalizeColor(value);

  if (readonly) {
    return (
      <div className="form-control-plaintext d-flex align-items-center">
        <div
          style={{
            width: '24px',
            height: '24px',
            backgroundColor: displayColor,
            border: '1px solid #ccc',
            borderRadius: '4px',
            marginRight: '8px',
          }}
          title={displayColor}
        />
        <span>{displayColor}</span>
      </div>
    );
  }

  return (
    <InputGroup>
      <InputGroup.Text style={{ padding: '0.25rem 0.5rem' }}>
        <input
          type="color"
          value={displayColor}
          onChange={(e) => onChange(name, e.target.value)}
          style={{
            width: '32px',
            height: '32px',
            border: 'none',
            cursor: 'pointer',
          }}
          title="Pick a color"
        />
      </InputGroup.Text>
      <Form.Control
        type="text"
        name={name}
        value={value || ''}
        onChange={(e) => {
          const val = e.target.value;
          // Validate hex format
          if (!val || isValidHex(val)) {
            onChange(name, val);
          }
        }}
        placeholder={field?.help || '#000000'}
        required={field?.required}
        pattern="^#?([0-9A-F]{3}|[0-9A-F]{6})$"
        maxLength={7}
      />
    </InputGroup>
  );
};

export default ColorWidget;
