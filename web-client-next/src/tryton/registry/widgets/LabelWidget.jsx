import React from 'react';
import { Form } from 'react-bootstrap';

/**
 * LabelWidget - Renders a label for a field or standalone label
 * @param {Object} props
 * @param {string} props.name - Field name (optional, used to look up field metadata)
 * @param {string} props.string - Label text (from XML 'string' attribute)
 * @param {Object} props.field - Field metadata
 * @param {Object} props.attributes - XML attributes
 */
const LabelWidget = ({ name, string, field, attributes }) => {
  // Determine label text: use 'string' attribute, or fall back to field metadata
  const labelText = string || field?.string || name || '';

  // Check if this label is required (from field metadata or attributes)
  const isRequired = field?.required || attributes?.required === 'True';

  return (
    <Form.Label className={isRequired ? 'required' : ''}>
      {labelText}
      {isRequired && <span className="text-danger ms-1">*</span>}
    </Form.Label>
  );
};

export default LabelWidget;
