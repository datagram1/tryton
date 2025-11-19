import React, { useState, useRef } from 'react';
import { Form, Button, ProgressBar, Alert } from 'react-bootstrap';
import {
  FaUpload,
  FaDownload,
  FaTrash,
  FaFilePdf,
  FaFileWord,
  FaFileExcel,
  FaFilePowerpoint,
  FaFileImage,
  FaFileArchive,
  FaFileAlt,
  FaFile
} from 'react-icons/fa';

/**
 * DocumentWidget - Document upload/download with preview
 * Supports PDF preview and displays appropriate file type icons
 *
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {string} props.value - Current value (base64 encoded document data)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const DocumentWidget = ({ name, value, onChange, readonly, field }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState(0);
  const [fileType, setFileType] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const fileInputRef = useRef(null);

  // Get file extension from filename
  const getFileExtension = (filename) => {
    if (!filename) return '';
    const parts = filename.split('.');
    return parts.length > 1 ? parts[parts.length - 1].toLowerCase() : '';
  };

  // Get appropriate icon based on file type
  const getDocumentIcon = (filename) => {
    const ext = getFileExtension(filename);
    const iconProps = { size: 32, className: 'text-muted mb-2' };

    switch (ext) {
      case 'pdf':
        return <FaFilePdf {...iconProps} style={{ color: '#dc3545' }} />;
      case 'doc':
      case 'docx':
        return <FaFileWord {...iconProps} style={{ color: '#2b579a' }} />;
      case 'xls':
      case 'xlsx':
        return <FaFileExcel {...iconProps} style={{ color: '#217346' }} />;
      case 'ppt':
      case 'pptx':
        return <FaFilePowerpoint {...iconProps} style={{ color: '#d24726' }} />;
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
        return <FaFileImage {...iconProps} style={{ color: '#6c757d' }} />;
      case 'zip':
      case 'rar':
      case 'tar':
      case 'gz':
        return <FaFileArchive {...iconProps} style={{ color: '#ffc107' }} />;
      case 'txt':
      case 'md':
        return <FaFileAlt {...iconProps} style={{ color: '#6c757d' }} />;
      default:
        return <FaFile {...iconProps} />;
    }
  };

  // Format file size for display
  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Check if file is a PDF
  const isPDF = (filename) => {
    return getFileExtension(filename) === 'pdf';
  };

  // Get data URL for PDF preview
  const getPDFDataURL = () => {
    if (!value || !isPDF(fileName)) return null;

    // Check if value already has data URL prefix
    if (value.startsWith('data:')) {
      return value;
    }

    // Add data URL prefix for PDF
    return `data:application/pdf;base64,${value}`;
  };

  // Handle file selection
  const handleFileSelect = (file) => {
    if (!file) return;

    setFileName(file.name);
    setFileSize(file.size);
    setFileType(file.type);
    setUploadProgress(0);
    setShowPreview(false);

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
    const blob = new Blob([byteArray], { type: fileType || 'application/octet-stream' });

    // Create download link
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName || 'document';
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
    setFileType('');
    setUploadProgress(0);
    setShowPreview(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const pdfDataURL = getPDFDataURL();

  if (readonly) {
    if (!value) {
      return <span className="form-control-plaintext text-muted">No document</span>;
    }

    return (
      <div className="form-control-plaintext">
        <div className="d-flex align-items-center">
          <div className="me-3">{getDocumentIcon(fileName)}</div>
          <div className="flex-grow-1">
            <div>
              <strong>{fileName || 'Document'}</strong>
            </div>
            {fileSize > 0 && (
              <small className="text-muted">{formatFileSize(fileSize)}</small>
            )}
          </div>
          <div>
            <Button
              variant="outline-primary"
              size="sm"
              onClick={handleDownload}
            >
              <FaDownload className="me-1" />
              Download
            </Button>
            {isPDF(fileName) && (
              <Button
                variant="outline-secondary"
                size="sm"
                onClick={() => setShowPreview(!showPreview)}
                className="ms-2"
              >
                {showPreview ? 'Hide' : 'Preview'}
              </Button>
            )}
          </div>
        </div>

        {/* PDF Preview */}
        {showPreview && pdfDataURL && (
          <div className="mt-3 border rounded">
            <iframe
              src={pdfDataURL}
              title="PDF Preview"
              style={{
                width: '100%',
                height: '600px',
                border: 'none',
              }}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div>
      {/* Drag and drop area */}
      {!value && (
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
          {getDocumentIcon(fileName)}
          <p className="mb-1">
            <strong>Click to upload</strong> or drag and drop
          </p>
          <small className="text-muted">
            PDF, DOC, XLS, and other document formats
          </small>
          {field?.size && (
            <div>
              <small className="text-muted">
                Maximum file size: {formatFileSize(field.size)}
              </small>
            </div>
          )}
        </div>
      )}

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

      {/* Document info */}
      {value && fileName && (
        <div>
          <div className="mt-2 border rounded p-3">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <div className="me-3">{getDocumentIcon(fileName)}</div>
                <div>
                  <div>
                    <strong>{fileName}</strong>
                  </div>
                  <small className="text-muted">{formatFileSize(fileSize)}</small>
                </div>
              </div>
              <div>
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={handleDownload}
                  className="me-2"
                  title="Download"
                >
                  <FaDownload />
                </Button>
                {isPDF(fileName) && (
                  <Button
                    variant="outline-secondary"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="me-2"
                    title="Toggle Preview"
                  >
                    {showPreview ? 'Hide' : 'Preview'}
                  </Button>
                )}
                <Button
                  variant="outline-warning"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="me-2"
                  title="Change document"
                >
                  <FaUpload />
                </Button>
                <Button
                  variant="outline-danger"
                  size="sm"
                  onClick={handleClear}
                  title="Remove"
                >
                  <FaTrash />
                </Button>
              </div>
            </div>
          </div>

          {/* PDF Preview */}
          {showPreview && pdfDataURL && (
            <div className="mt-3 border rounded">
              <iframe
                src={pdfDataURL}
                title="PDF Preview"
                style={{
                  width: '100%',
                  height: '600px',
                  border: 'none',
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default DocumentWidget;
