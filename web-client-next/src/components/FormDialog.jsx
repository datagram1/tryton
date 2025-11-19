import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import { FaSave } from 'react-icons/fa';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import FormView from './FormView';

/**
 * FormDialog - Modal dialog for creating or editing a record
 * Embeds a FormView inside a modal
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether dialog is visible
 * @param {Function} props.onHide - Callback when dialog closes
 * @param {Function} props.onSave - Callback when record is saved: (recordId) => void
 * @param {string} props.modelName - Model name
 * @param {number} props.recordId - Record ID to edit (null for new record)
 * @param {Object} props.defaults - Default values for new records
 * @param {Object} props.context - Context for the form
 * @param {string} props.title - Dialog title
 * @param {boolean} props.readonly - Readonly mode
 */
const FormDialog = ({
  show,
  onHide,
  onSave,
  modelName,
  recordId = null,
  defaults = {},
  context = {},
  title = 'Form',
  readonly = false,
}) => {
  const { sessionId, database } = useSessionStore();
  const [formData, setFormData] = useState({});
  const [viewDef, setViewDef] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

  /**
   * Load form view and record data
   */
  useEffect(() => {
    if (show && modelName) {
      loadFormData();
    }
  }, [show, modelName, recordId]);

  /**
   * Load form view definition and record data
   */
  const loadFormData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      // Get form view definition
      const view = await rpc.fieldsViewGet(
        modelName,
        null,
        'form',
        sessionId,
        database
      );

      setViewDef(view);

      if (recordId) {
        // Load existing record
        const fieldNames = Object.keys(view.fields);
        const records = await rpc.read(
          modelName,
          [recordId],
          fieldNames,
          sessionId,
          database
        );

        if (records && records.length > 0) {
          setFormData(records[0]);
        }
      } else {
        // New record - get default values
        const fieldNames = Object.keys(view.fields);
        const defaultValues = await rpc.defaultGet(
          modelName,
          fieldNames,
          sessionId,
          database,
          { ...context, ...defaults }
        );

        setFormData({ ...defaultValues, ...defaults });
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error loading form:', err);
      setError(err.message || 'Failed to load form');
      setIsLoading(false);
    }
  };

  /**
   * Handle field value change
   */
  const handleFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      [fieldName]: value,
    }));
    setIsDirty(true);
  };

  /**
   * Handle save
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // Prepare values for save (remove 'id' field)
      const { id, ...values } = formData;

      let savedId;

      if (recordId) {
        // Update existing record
        await rpc.write(
          modelName,
          [recordId],
          values,
          sessionId,
          database
        );
        savedId = recordId;
      } else {
        // Create new record
        const newIds = await rpc.create(
          modelName,
          [values],
          sessionId,
          database
        );
        savedId = newIds[0];
      }

      setIsSaving(false);
      setIsDirty(false);

      // Call onSave callback with the record ID
      if (onSave) {
        onSave(savedId);
      }

      handleClose();
    } catch (err) {
      console.error('Error saving record:', err);
      setError(err.message || 'Failed to save record');
      setIsSaving(false);
    }
  };

  /**
   * Handle close
   */
  const handleClose = () => {
    if (isDirty) {
      if (!confirm('You have unsaved changes. Are you sure you want to close?')) {
        return;
      }
    }

    setFormData({});
    setViewDef(null);
    setError(null);
    setIsDirty(false);
    onHide();
  };

  return (
    <Modal show={show} onHide={handleClose} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center p-3">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
          </div>
        )}

        {/* Form View */}
        {!isLoading && viewDef && (
          <FormView
            modelName={modelName}
            viewDef={viewDef}
            record={formData}
            onChange={handleFieldChange}
            readonly={readonly}
            embedded={true}
          />
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSaving}>
          Cancel
        </Button>
        {!readonly && (
          <Button
            variant="primary"
            onClick={handleSave}
            disabled={isSaving || !isDirty}
          >
            {isSaving ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Saving...
              </>
            ) : (
              <>
                <FaSave className="me-1" /> Save
              </>
            )}
          </Button>
        )}
      </Modal.Footer>
    </Modal>
  );
};

export default FormDialog;
