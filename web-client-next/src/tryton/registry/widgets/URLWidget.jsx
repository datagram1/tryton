import React from 'react';
import { Form } from 'react-bootstrap';
import { FaExternalLinkAlt } from 'react-icons/fa';

/**
 * URLWidget - URL input field with clickable link display
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (URL)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const URLWidget = ({ name, value, onChange, readonly, field }) => {
  // Validate URL format
  const isValidURL = (url) => {
    if (!url) return false;
    try {
      new URL(url);
      return true;
    } catch {
      // Try with https:// prefix
      try {
        new URL(`https://${url}`);
        return true;
      } catch {
        return false;
      }
    }
  };

  // Ensure URL has protocol
  const normalizeURL = (url) => {
    if (!url) return '';
    if (url.match(/^https?:\/\//i)) {
      return url;
    }
    return `https://${url}`;
  };

  if (readonly) {
    if (!value) {
      return <span className="form-control-plaintext"></span>;
    }

    const displayURL = value;
    const linkURL = normalizeURL(value);

    return (
      <div className="form-control-plaintext">
        <a
          href={linkURL}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary"
          title={`Open ${displayURL} in new tab`}
        >
          {displayURL} <FaExternalLinkAlt size={12} />
        </a>
      </div>
    );
  }

  return (
    <div>
      <Form.Control
        type="url"
        name={name}
        value={value || ''}
        onChange={(e) => onChange(name, e.target.value)}
        placeholder={field?.help || 'https://example.com'}
        required={field?.required}
        pattern="https?://.+"
      />
      {value && isValidURL(value) && (
        <small className="text-muted">
          <a
            href={normalizeURL(value)}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary"
          >
            Open link <FaExternalLinkAlt size={10} />
          </a>
        </small>
      )}
    </div>
  );
};

export default URLWidget;
