import React from 'react';

/**
 * HTMLWidget - Display HTML content (read-only)
 * This widget is for displaying HTML content, not editing it.
 *
 * NOTE: For production use, install DOMPurify for proper HTML sanitization:
 *   npm install dompurify
 *   import DOMPurify from 'dompurify';
 *
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (HTML string)
 * @param {Function} props.onChange - Change handler (not used - read-only widget)
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const HTMLWidget = ({ name, value, onChange, readonly, field }) => {
  // Basic sanitization - strip script tags and dangerous attributes
  // TODO: Install and use DOMPurify for production
  const sanitizeHTML = (html) => {
    if (!html) return '';

    // Remove script tags and event handlers
    let sanitized = html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
      .replace(/on\w+\s*=\s*[^\s>]*/gi, '');

    return sanitized;
  };

  const sanitizedHTML = sanitizeHTML(value);

  // HTML widget is always read-only for security reasons
  return (
    <div
      className="html-widget form-control-plaintext"
      dangerouslySetInnerHTML={{ __html: sanitizedHTML }}
      style={{
        padding: '0.5rem',
        border: '1px solid #dee2e6',
        borderRadius: '0.25rem',
        backgroundColor: '#f8f9fa',
        minHeight: '3rem',
      }}
    />
  );
};

export default HTMLWidget;
