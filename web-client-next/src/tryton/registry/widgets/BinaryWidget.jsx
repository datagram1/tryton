import React, { useState, useRef } from 'react';
import { Form, Button, ProgressBar, Alert } from 'react-bootstrap';
import { FaUpload, FaDownload, FaFile, FaTrash } from 'react-icons/fa';

/**
 * BinaryWidget - File upload/download widget
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (base64 encoded or file data)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const BinaryWidget = ({ name, value, onChange, readonly, field }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const fileInputRef = useRef(null);

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setUploadProgress(0);

    // Read file as base64
    const reader = new FileReader();

    reader.onprogress = (e) => {
      if (e.lengthComputable) {
        const progress = Math.round((e.loaded / e.total) * 100);
        setUploadProgress(progress);
      }
    };

    reader.onload = (e) => {
      const base64 = e.target.result.split(',')[1]; // Remove data URL prefix
      onChange(name, base64);
      setUploadProgress(100);
    };

    reader.onerror = () => {
      alert('Error reading file');
      setUploadProgress(0);
    };

    reader.readAsDataURL(file);
  };

  // Handle file input change
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      handleFileSelect(file);
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
      handleFileSelect(file);
    }
  };

  // Handle download
  const handleDownload = () => {
    if (!value) return;

    // Create blob from base64
    const byteCharacters = atob(value);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray]);

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'download';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // Handle clear
  const handleClear = () => {
    onChange(name, null);
    setFileName('');
    setFileSize(0);
    setUploadProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (readonly) {
    if (!value) {
      return <span className="form-control-plaintext text-muted">No file</span>;
    }

    return (
      <div className="form-control-plaintext">
        <Button
          variant="outline-primary"
          size="sm"
          onClick={handleDownload}
        >
          <FaDownload className="me-1" />
          Download {fileName && `(${fileName})`}
        </Button>
        {fileSize > 0 && (
          <small className="ms-2 text-muted">{formatFileSize(fileSize)}</small>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Drag and drop area */}
      <div
        className={`border rounded p-3 text-center ${
          isDragging ? 'border-primary bg-light' : 'border-secondary'
        }`}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        style={{ cursor: 'pointer' }}
        onClick={() => fileInputRef.current?.click()}
      >
        <FaFile size={32} className="text-muted mb-2" />
        <p className="mb-1">
          <strong>Click to upload</strong> or drag and drop
        </p>
        {field?.size && (
          <small className="text-muted">
            Maximum file size: {formatFileSize(field.size)}
          </small>
        )}
      </div>

      {/* Hidden file input */}
      <Form.Control
        ref={fileInputRef}
        type="file"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Upload progress */}
      {uploadProgress > 0 && uploadProgress < 100 && (
        <ProgressBar
          now={uploadProgress}
          label={`${uploadProgress}%`}
          className="mt-2"
        />
      )}

      {/* File info */}
      {value && fileName && (
        <div className="mt-2 d-flex align-items-center justify-content-between">
          <div>
            <FaFile className="me-2 text-muted" />
            <strong>{fileName}</strong>
            <small className="ms-2 text-muted">{formatFileSize(fileSize)}</small>
          </div>
          <div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleDownload}
              className="me-2"
            >
              <FaDownload />
            </Button>
            <Button
              variant="outline-danger"
              size="sm"
              onClick={handleClear}
            >
              <FaTrash />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BinaryWidget;
