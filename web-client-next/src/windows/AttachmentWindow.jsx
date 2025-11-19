import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Modal, Button, Table, Alert, Form, Badge, Spinner } from 'react-bootstrap';
import { FaUpload, FaDownload, FaTrash, FaTimes, FaFile, FaImage, FaFilePdf, FaFileWord, FaFileExcel } from 'react-icons/fa';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * AttachmentWindow - Modal window for managing record attachments
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether window is visible
 * @param {Function} props.onHide - Callback when window closes
 * @param {string} props.modelName - Model name of the record
 * @param {number} props.recordId - Record ID
 * @param {string} props.recordName - Record name for display
 */
const AttachmentWindow = ({
  show,
  onHide,
  modelName,
  recordId,
  recordName = '',
}) => {
  const { sessionId, database } = useSessionStore();
  const [attachments, setAttachments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  /**
   * Load attachments for the current record
   */
  const loadAttachments = useCallback(async () => {
    if (!modelName || !recordId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Search for attachments on this record
      // Domain: [['resource', '=', 'model.name,id']]
      const resource = `${modelName},${recordId}`;
      const attachmentIds = await rpc.search(
        'ir.attachment',
        [['resource', '=', resource]],
        0,
        null,
        [['create_date', 'DESC']],
        sessionId,
        database
      );

      if (attachmentIds && attachmentIds.length > 0) {
        // Read attachment data
        const attachmentData = await rpc.read(
          'ir.attachment',
          attachmentIds,
          ['name', 'type', 'data_size', 'create_date', 'create_uid'],
          sessionId,
          database
        );
        setAttachments(attachmentData || []);
      } else {
        setAttachments([]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error loading attachments:', err);
      setError(err.message || 'Failed to load attachments');
      setIsLoading(false);
    }
  }, [modelName, recordId, sessionId, database]);

  /**
   * Load attachments when window opens
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

      const resource = `${modelName},${recordId}`;

      // Upload each file
      for (const file of files) {
        // Read file as base64
        const reader = new FileReader();

        await new Promise((resolve, reject) => {
          reader.onload = async (e) => {
            try {
              // Extract base64 data (remove data:*/*;base64, prefix)
              const base64Data = e.target.result.split(',')[1];

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

              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      }

      // Reload attachments
      await loadAttachments();
      setIsUploading(false);
    } catch (err) {
      console.error('Error uploading file:', err);
      setError(err.message || 'Failed to upload file');
      setIsUploading(false);
    }
  };

  /**
   * Handle file input change
   */
  const handleFileInputChange = (e) => {
    const files = Array.from(e.target.files);
    handleFileUpload(files);
    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  /**
   * Handle download attachment
   */
  const handleDownload = async (attachment) => {
    try {
      // Read the attachment data
      const attachmentData = await rpc.read(
        'ir.attachment',
        [attachment.id],
        ['name', 'data'],
        sessionId,
        database
      );

      if (attachmentData && attachmentData.length > 0) {
        const { name, data } = attachmentData[0];

        // Convert base64 to blob and download
        const byteCharacters = atob(data);
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
        link.download = name;
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
   * Handle delete attachment
   */
  const handleDelete = async (attachmentId) => {
    if (!confirm('Are you sure you want to delete this attachment?')) {
      return;
    }

    try {
      setError(null);

      await rpc.delete(
        'ir.attachment',
        [attachmentId],
        sessionId,
        database
      );

      // Reload attachments
      await loadAttachments();
    } catch (err) {
      console.error('Error deleting attachment:', err);
      setError(err.message || 'Failed to delete attachment');
    }
  };

  /**
   * Handle drag over
   */
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  /**
   * Handle drag leave
   */
  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  /**
   * Handle drop
   */
  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = Array.from(e.dataTransfer.files);
    handleFileUpload(files);
  };

  /**
   * Format file size
   */
  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
  };

  /**
   * Get file icon based on name
   */
  const getFileIcon = (fileName) => {
    const ext = fileName.split('.').pop().toLowerCase();

    if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'svg', 'webp'].includes(ext)) {
      return <FaImage className="text-primary" />;
    } else if (ext === 'pdf') {
      return <FaFilePdf className="text-danger" />;
    } else if (['doc', 'docx'].includes(ext)) {
      return <FaFileWord className="text-info" />;
    } else if (['xls', 'xlsx'].includes(ext)) {
      return <FaFileExcel className="text-success" />;
    } else {
      return <FaFile className="text-secondary" />;
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Attachments {recordName && `- ${recordName}`}
          {attachments.length > 0 && (
            <Badge bg="secondary" className="ms-2">{attachments.length}</Badge>
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

        {/* Upload Area */}
        <div
          className={`border rounded p-4 mb-3 text-center ${isDragging ? 'border-primary bg-light' : 'border-secondary'}`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          style={{ cursor: 'pointer' }}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileInputChange}
            style={{ display: 'none' }}
          />
          <FaUpload size={32} className="text-secondary mb-2" />
          <p className="mb-0">
            {isUploading ? (
              <>
                <Spinner animation="border" size="sm" className="me-2" />
                Uploading...
              </>
            ) : (
              <>
                Drag and drop files here, or click to select files
              </>
            )}
          </p>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="text-center p-3">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {/* Attachments Table */}
        {!isLoading && attachments.length > 0 && (
          <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
            <Table hover size="sm">
              <thead style={{ position: 'sticky', top: 0, backgroundColor: 'white', zIndex: 1 }}>
                <tr>
                  <th style={{ width: '40px' }}></th>
                  <th>Name</th>
                  <th>Size</th>
                  <th>Created</th>
                  <th style={{ width: '120px' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {attachments.map(attachment => (
                  <tr key={attachment.id}>
                    <td className="text-center">
                      {getFileIcon(attachment.name)}
                    </td>
                    <td>{attachment.name}</td>
                    <td>{formatFileSize(attachment.data_size)}</td>
                    <td>{formatDate(attachment.create_date)}</td>
                    <td>
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleDownload(attachment)}
                        className="me-1"
                        title="Download"
                      >
                        <FaDownload />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline-danger"
                        onClick={() => handleDelete(attachment.id)}
                        title="Delete"
                      >
                        <FaTrash />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        {/* No Attachments */}
        {!isLoading && attachments.length === 0 && (
          <Alert variant="info">
            No attachments found. Upload files using the area above.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-1" />
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default AttachmentWindow;
