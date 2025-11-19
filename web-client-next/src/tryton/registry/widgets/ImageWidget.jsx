import React, { useState, useRef } from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import { FaUpload, FaTrash, FaImage } from 'react-icons/fa';

/**
 * ImageWidget - Image upload/display with preview
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (base64 encoded image data)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const ImageWidget = ({ name, value, onChange, readonly, field }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Maximum image size (5MB default)
  const maxSize = field?.size || 5 * 1024 * 1024;

  // Get data URL from base64 value
  const getImageDataURL = () => {
    if (!value) return null;

    // Check if value already has data URL prefix
    if (value.startsWith('data:')) {
      return value;
    }

    // Add data URL prefix (assume PNG if not specified)
    return `data:image/png;base64,${value}`;
  };

  // Validate image file
  const validateImage = (file) => {
    setError(null);

    // Check file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return false;
    }

    // Check file size
    if (file.size > maxSize) {
      const maxMB = Math.round(maxSize / 1024 / 1024);
      setError(`Image size must be less than ${maxMB}MB`);
      return false;
    }

    return true;
  };

  // Handle image selection
  const handleImageSelect = (file) => {
    if (!file || !validateImage(file)) return;

    // Read file as base64
    const reader = new FileReader();

    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]; // Remove data URL prefix
      onChange(name, base64);
    };

    reader.onerror = () => {
      setError('Error reading image file');
    };

    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  // Handle drag and drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);

    const file = e.dataTransfer.files[0];
    if (file) {
      handleImageSelect(file);
    }
  };

  // Handle clear
  const handleClear = () => {
    onChange(name, null);
    setError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const imageDataURL = getImageDataURL();

  if (readonly) {
    if (!value) {
      return <span className="form-control-plaintext text-muted">No image</span>;
    }

    return (
      <div className="form-control-plaintext">
        <img
          src={imageDataURL}
          alt="Preview"
          style={{
            maxWidth: '300px',
            maxHeight: '300px',
            border: '1px solid #dee2e6',
            borderRadius: '4px',
          }}
        />
      </div>
    );
  }

  return (
    <div>
      {/* Image preview */}
      {imageDataURL && (
        <div className="mb-3 position-relative d-inline-block">
          <img
            src={imageDataURL}
            alt="Preview"
            style={{
              maxWidth: '300px',
              maxHeight: '300px',
              border: '1px solid #dee2e6',
              borderRadius: '4px',
            }}
          />
          <Button
            variant="danger"
            size="sm"
            onClick={handleClear}
            className="position-absolute top-0 end-0 m-2"
            title="Remove image"
          >
            <FaTrash />
          </Button>
        </div>
      )}

      {/* Upload area */}
      {!imageDataURL && (
        <div
          className={`border rounded p-4 text-center ${
            isDragging ? 'border-primary bg-light' : 'border-secondary'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <FaImage size={48} className="text-muted mb-3" />
          <p className="mb-1">
            <strong>Click to upload image</strong> or drag and drop
          </p>
          <small className="text-muted">
            PNG, JPG, GIF up to {Math.round(maxSize / 1024 / 1024)}MB
          </small>
        </div>
      )}

      {/* Hidden file input */}
      <Form.Control
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Change image button when image exists */}
      {imageDataURL && (
        <Button
          variant="outline-primary"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          className="mt-2"
        >
          <FaUpload className="me-1" />
          Change Image
        </Button>
      )}

      {/* Error message */}
      {error && (
        <Alert variant="danger" className="mt-2 mb-0" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      )}
    </div>
  );
};

export default ImageWidget;
