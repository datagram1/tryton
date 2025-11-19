import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Table, Alert, Form, Badge, ProgressBar } from 'react-bootstrap';
import { FaUpload, FaDownload, FaTrash, FaPaperclip, FaFilePdf, FaFileImage, FaFileWord, FaFileExcel, FaFile, FaTimes } from 'react-icons/fa';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * AttachmentWindow - Modal dialog for managing record attachments
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether dialog is visible
 * @param {Function} props.onHide - Callback when dialog closes
 * @param {string} props.modelName - Model name of the record
 * @param {number} props.recordId - Record ID
 * @param {string} props.recordName - Display name of the record
 * @param {Function} props.onAttachmentCountChange - Callback when attachment count changes
 */
const AttachmentWindow = ({
  show,
  onHide,
  modelName,
  recordId,
  recordName = '',
  onAttachmentCountChange,
}) => {
  const { sessionId, database } = useSessionStore();
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Get icon for file type
   */
  const getFileIcon = (filename) => {
    const ext = filename?.split('.').pop()?.toLowerCase();
    if (!ext) return <FaFile />;

    if (['pdf'].includes(ext)) return <FaFilePdf className="text-danger" />;
    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg'].includes(ext)) return <FaFileImage className="text-primary" />;
    if (['doc', 'docx'].includes(ext)) return <FaFileWord className="text-primary" />;
    if (['xls', 'xlsx'].includes(ext)) return <FaFileExcel className="text-success" />;
    return <FaFile />;
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  /**
   * Format date
   */
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  };

  /**
   * Load attachments
   */
  const loadAttachments = useCallback(async () => {
    if (!modelName || !recordId) return;

    try {
      setIsLoading(true);
      setError(null);

      const resource = `${modelName},${recordId}`;

      // Search for attachments with this resource
      const attachmentIds = await rpc.search(
        'ir.attachment',
        [['resource', '=', resource]],
        0,
        1000, // limit
        [['name', 'ASC']], // order by name
        sessionId,
        database
      );

      if (attachmentIds && attachmentIds.length > 0) {
        // Read attachment records
        const records = await rpc.read(
          'ir.attachment',
          attachmentIds,
          ['name', 'type', 'data_size', 'create_date', 'create_uid'],
          sessionId,
          database
        );
        setAttachments(records || []);

        // Notify parent of attachment count
        if (onAttachmentCountChange) {
          onAttachmentCountChange(records.length);
        }
      } else {
        setAttachments([]);
        if (onAttachmentCountChange) {
          onAttachmentCountChange(0);
        }
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error loading attachments:', err);
      setError(err.message || 'Failed to load attachments');
      setIsLoading(false);
    }
  }, [modelName, recordId, sessionId, database, onAttachmentCountChange]);

  /**
   * Load attachments when dialog opens
   */
  useEffect(() => {
    if (show && modelName && recordId) {
      loadAttachments();
    }
  }, [show, modelName, recordId, loadAttachments]);

  /**
   * Handle file upload
   */
  const handleFileUpload = async (files) => {
    if (!files || files.length === 0) return;

    try {
      setIsUploading(true);
      setError(null);
      setUploadProgress(0);

      const resource = `${modelName},${recordId}`;

      // Upload each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];

        // Read file as base64
        const reader = new FileReader();
        const fileDataPromise = new Promise((resolve, reject) => {
          reader.onload = (e) => resolve(e.target.result);
          reader.onerror = reject;
        });
        reader.readAsDataURL(file);

        const dataUrl = await fileDataPromise;
        // Remove data URL prefix (e.g., "data:image/png;base64,")
        const base64Data = dataUrl.split(',')[1];

        // Create attachment record
        await rpc.create(
          'ir.attachment',
          [{
            name: file.name,
            type: 'data',
            data: base64Data,
            resource: resource,
          }],
          sessionId,
          database
        );

        // Update progress
        setUploadProgress(((i + 1) / files.length) * 100);
      }

      setIsUploading(false);
      setUploadProgress(0);

      // Reload attachments list
      loadAttachments();
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to upload file');
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    handleFileUpload(e.target.files);
    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle drag and drop
   */
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
    handleFileUpload(e.dataTransfer.files);
  };

  /**
   * Download attachment
   */
  const handleDownload = async (attachment) => {
    try {
      // Read attachment data
      const records = await rpc.read(
        'ir.attachment',
        [attachment.id],
        ['data', 'name'],
        sessionId,
        database
      );

      if (records && records.length > 0 && records[0].data) {
        // Convert base64 to blob and download
        const byteCharacters = atob(records[0].data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray]);

        // Create download link
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = records[0].name;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
      }
    } catch (err) {
      console.error('Error downloading attachment:', err);
      setError(err.message || 'Failed to download attachment');
    }
  };

  /**
   * Delete attachment
   */
  const handleDelete = async (attachment) => {
    if (!confirm(`Are you sure you want to delete "${attachment.name}"?`)) {
      return;
    }

    try {
      await rpc.delete(
        'ir.attachment',
        [attachment.id],
        sessionId,
        database
      );

      // Reload attachments list
      loadAttachments();
    } catch (err) {
      console.error('Error deleting attachment:', err);
      setError(err.message || 'Failed to delete attachment');
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          <FaPaperclip className="me-2" />
          Attachments {recordName && `- ${recordName}`}
          {attachments.length > 0 && (
            <Badge bg="primary" className="ms-2">{attachments.length}</Badge>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Upload Section */}
        <div
          className={`border rounded p-4 mb-3 text-center ${isDragging ? 'bg-light border-primary' : ''}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <FaUpload size={32} className="text-muted mb-2" />
          <p className="mb-2">Drag and drop files here, or click to select files</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            <FaUpload className="me-1" />
            Select Files
          </Button>
        </div>

        {/* Upload Progress */}
        {isUploading && (
          <ProgressBar
            now={uploadProgress}
            label={`${Math.round(uploadProgress)}%`}
            className="mb-3"
          />
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center p-3">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {/* Attachments List */}
        {!isLoading && attachments.length > 0 && (
          <Table hover responsive>
            <thead>
              <tr>
                <th style={{ width: '40px' }}></th>
                <th>Name</th>
                <th>Size</th>
                <th>Created</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {attachments.map((attachment) => (
                <tr key={attachment.id}>
                  <td>{getFileIcon(attachment.name)}</td>
                  <td>{attachment.name}</td>
                  <td>{formatFileSize(attachment.data_size)}</td>
                  <td>{formatDate(attachment.create_date)}</td>
                  <td>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      className="me-1"
                      onClick={() => handleDownload(attachment)}
                      title="Download"
                    >
                      <FaDownload />
                    </Button>
                    <Button
                      variant="outline-danger"
                      size="sm"
                      onClick={() => handleDelete(attachment)}
                      title="Delete"
                    >
                      <FaTrash />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}

        {/* Empty State */}
        {!isLoading && attachments.length === 0 && (
          <div className="text-center text-muted p-4">
            <FaPaperclip size={48} className="mb-3 opacity-25" />
            <p>No attachments yet. Upload files using the area above.</p>
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AttachmentWindow;
