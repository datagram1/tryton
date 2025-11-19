import { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Alert } from 'react-bootstrap';
import TrytonViewRenderer from '../tryton/renderer/TrytonViewRenderer';
import FormToolbar from './FormToolbar';
import AttachmentWindow from '../windows/AttachmentWindow';
import NoteWindow from '../windows/NoteWindow';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import useTabsStore from '../store/tabs';
import { createButtonHandler } from '../tryton/actions/buttonHandler';
import { useFormValidation } from '../hooks/useFormValidation';

/**
 * FormView Component
 * Container for displaying and editing a single Tryton record
 */
function FormView({ modelName, recordId, viewId = null, listContext = null }) {
  const { sessionId, database } = useSessionStore();
  const { openTab, updateTab, activeTabId } = useTabsStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [fields, setFields] = useState({});
  const [recordData, setRecordData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachmentCount, setAttachmentCount] = useState(0);
  const [showNotes, setShowNotes] = useState(false);
  const [noteCount, setNoteCount] = useState(0);
  const [unreadNoteCount, setUnreadNoteCount] = useState(0);

  // Initialize form validation
  const {
    validationErrors,
    validationWarnings,
    fieldStates,
    isValidating,
    hasErrors,
    validateAll,
    preValidate,
    handleFieldChange: handleValidatedFieldChange,
    getFieldValidationProps,
  } = useFormValidation(modelName, fields, recordData, sessionId, database);

  /**
   * Load view definition and record data
   */
  useEffect(() => {
    const loadViewAndData = async () => {
      if (!modelName || !sessionId || !database) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        // 1. Fetch the view definition
        const viewResult = await rpc.fieldsViewGet(
          modelName,
          viewId,
          'form',
          sessionId,
          database
        );

        // 2. Parse the XML architecture
        const parsedView = parseAndNormalizeView(viewResult.arch);

        setViewDefinition(parsedView);
        setFields(viewResult.fields || {});

        // 3. Load record data if recordId is provided
        if (recordId) {
          const records = await rpc.read(
            modelName,
            [recordId],
            Object.keys(viewResult.fields),
            sessionId,
            database
          );

          if (records && records.length > 0) {
            setRecordData(records[0]);
            setOriginalData(records[0]);
          }
        } else {
          // New record - get default values from server
          console.log('[FormView] Creating new record, fetching defaults...');
          const fieldNames = Object.keys(viewResult.fields);

          try {
            const defaults = await rpc.defaultGet(
              modelName,
              fieldNames,
              sessionId,
              database,
              {} // context - can be extended with default_FIELDNAME values
            );

            console.log('[FormView] Received defaults:', defaults);

            // Initialize record with defaults and null id
            const defaultData = {
              id: null,
              ...defaults,
            };

            setRecordData(defaultData);
            setOriginalData(defaultData);
            // Mark as dirty so user can save with defaults
            setIsDirty(true);
          } catch (err) {
            console.error('[FormView] Error fetching defaults:', err);
            // Fallback to empty record if default_get fails
            const defaultData = { id: null };
            setRecordData(defaultData);
            setOriginalData(defaultData);
            setIsDirty(true);
          }
        }
      } catch (err) {
        console.error('Error loading view/data:', err);
        setError(err.message || 'Failed to load form');
      } finally {
        setIsLoading(false);
      }
    };

    loadViewAndData();
  }, [modelName, recordId, viewId, sessionId, database]);

  /**
   * Handle field value changes with validation
   */
  const handleFieldChange = useCallback(async (fieldName, value) => {
    // Update record data via callback
    const updateRecord = (field, val) => {
      setRecordData((prev) => ({ ...prev, [field]: val }));
      setIsDirty(true);
    };

    // Call validation-aware field change handler
    await handleValidatedFieldChange(fieldName, value, updateRecord);
  }, [handleValidatedFieldChange]);

  /**
   * Handle save operation with validation
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

      // 1. Client-side validation
      const clientValidation = validateAll();
      if (!clientValidation.valid) {
        setError('Please fix validation errors before saving');
        setIsSaving(false);
        return;
      }

      // 2. Server-side pre-validation
      const serverValidation = await preValidate();
      if (!serverValidation.valid) {
        // Errors are already set in validation state
        setError('Server validation failed. Please check the errors below.');
        setIsSaving(false);
        return;
      }

      // Prepare data for save (exclude id and internal fields)
      const dataToSave = { ...recordData };
      delete dataToSave.id;

      if (recordId) {
        // Update existing record
        await rpc.write(
          modelName,
          [recordId],
          dataToSave,
          sessionId,
          database
        );

        // Reload the record to get updated values
        const records = await rpc.read(
          modelName,
          [recordId],
          Object.keys(fields),
          sessionId,
          database
        );

        if (records && records.length > 0) {
          setRecordData(records[0]);
          setOriginalData(records[0]);
        }
      } else {
        // Create new record
        const newIds = await rpc.create(
          modelName,
          [dataToSave],
          sessionId,
          database
        );

        if (newIds && newIds.length > 0) {
          // Reload the newly created record
          const records = await rpc.read(
            modelName,
            newIds,
            Object.keys(fields),
            sessionId,
            database
          );

          if (records && records.length > 0) {
            setRecordData(records[0]);
            setOriginalData(records[0]);
          }
        }
      }

      setIsDirty(false);
    } catch (err) {
      console.error('Error saving record:', err);
      setError(err.message || 'Failed to save record');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Handle cancel operation
   */
  const handleCancel = () => {
    setRecordData(originalData);
    setIsDirty(false);
  };

  /**
   * Handle new record button click
   */
  const handleNew = useCallback(() => {
    // Open form view in new tab for creating a new record
    openTab({
      id: `form-${modelName}-new-${Date.now()}`,
      title: `${modelName} - New`,
      type: 'form',
      props: {
        modelName,
        recordId: null, // null indicates a new record
      },
    });
  }, [modelName, openTab]);

  /**
   * Handle delete record button click
   */
  const handleDelete = useCallback(async () => {
    if (!recordId) {
      setError('Cannot delete a record that has not been saved yet');
      return;
    }

    // Confirmation dialog
    const confirmed = window.confirm(
      'Are you sure you want to delete this record? This action cannot be undone.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Delete the record
      await rpc.delete(modelName, [recordId], sessionId, database);

      // Close the current tab (or navigate back)
      // For now, show a success message
      alert('Record deleted successfully');

      // TODO: Close the current tab or navigate to list view
      window.history.back();
    } catch (err) {
      console.error('Error deleting record:', err);
      setError(err.message || 'Failed to delete record');
      setIsSaving(false);
    }
  }, [modelName, recordId, sessionId, database]);

  /**
   * Handle duplicate record button click
   */
  const handleDuplicate = useCallback(async () => {
    if (!recordId) {
      setError('Cannot duplicate a record that has not been saved yet');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      // Copy the record
      const newIds = await rpc.copy(modelName, [recordId], sessionId, database);

      if (newIds && newIds.length > 0) {
        const newId = newIds[0];

        // Open the duplicated record in a new tab
        openTab({
          id: `form-${modelName}-${newId}-${Date.now()}`,
          title: `${modelName} - ${newId} (Copy)`,
          type: 'form',
          props: {
            modelName,
            recordId: newId,
          },
        });
      }
    } catch (err) {
      console.error('Error duplicating record:', err);
      setError(err.message || 'Failed to duplicate record');
    } finally {
      setIsSaving(false);
    }
  }, [modelName, recordId, sessionId, database, openTab]);

  /**
   * Handle reload record button click
   */
  const handleReload = useCallback(async () => {
    if (!recordId) {
      // For new records, just reset to defaults
      handleCancel();
      return;
    }

    // Confirmation if there are unsaved changes
    if (isDirty) {
      const confirmed = window.confirm(
        'You have unsaved changes. Are you sure you want to reload and lose your changes?'
      );

      if (!confirmed) {
        return;
      }
    }

    try {
      setIsLoading(true);
      setError(null);

      // Reload the record from server
      const records = await rpc.read(
        modelName,
        [recordId],
        Object.keys(fields),
        sessionId,
        database
      );

      if (records && records.length > 0) {
        setRecordData(records[0]);
        setOriginalData(records[0]);
        setIsDirty(false);
      }
    } catch (err) {
      console.error('Error reloading record:', err);
      setError(err.message || 'Failed to reload record');
    } finally {
      setIsLoading(false);
    }
  }, [recordId, modelName, fields, sessionId, database, isDirty, handleCancel]);

  /**
   * Handle switch view button click
   */
  const handleSwitchView = useCallback(() => {
    // Switch to list view
    openTab({
      id: `list-${modelName}-${Date.now()}`,
      title: modelName,
      type: 'list',
      props: {
        modelName,
      },
    });
  }, [modelName, openTab]);

  /**
   * Handle previous record navigation
   */
  const handlePrevious = useCallback(() => {
    if (!listContext || !listContext.recordIds) {
      return;
    }

    const { recordIds, currentIndex } = listContext;

    if (currentIndex > 0) {
      const prevRecordId = recordIds[currentIndex - 1];

      // Update the current tab to show the previous record
      if (activeTabId) {
        updateTab(activeTabId, {
          id: `form-${modelName}-${prevRecordId}`,
          title: `${modelName} #${prevRecordId}`,
          props: {
            modelName,
            recordId: prevRecordId,
            listContext: {
              ...listContext,
              currentIndex: currentIndex - 1,
            },
          },
        });
      }
    }
  }, [listContext, modelName, activeTabId, updateTab]);

  /**
   * Handle next record navigation
   */
  const handleNext = useCallback(() => {
    if (!listContext || !listContext.recordIds) {
      return;
    }

    const { recordIds, currentIndex } = listContext;

    if (currentIndex < recordIds.length - 1) {
      const nextRecordId = recordIds[currentIndex + 1];

      // Update the current tab to show the next record
      if (activeTabId) {
        updateTab(activeTabId, {
          id: `form-${modelName}-${nextRecordId}`,
          title: `${modelName} #${nextRecordId}`,
          props: {
            modelName,
            recordId: nextRecordId,
            listContext: {
              ...listContext,
              currentIndex: currentIndex + 1,
            },
          },
        });
      }
    }
  }, [listContext, modelName, activeTabId, updateTab]);

  /**
   * Load attachment count for current record
   */
  const loadAttachmentCount = useCallback(async () => {
    if (!modelName || !recordId || !sessionId || !database) {
      setAttachmentCount(0);
      return;
    }

    try {
      const resource = `${modelName},${recordId}`;
      const attachmentIds = await rpc.search(
        'ir.attachment',
        [['resource', '=', resource]],
        0,
        null,
        null,
        sessionId,
        database
      );
      setAttachmentCount(attachmentIds ? attachmentIds.length : 0);
    } catch (err) {
      console.error('Error loading attachment count:', err);
      setAttachmentCount(0);
    }
  }, [modelName, recordId, sessionId, database]);

  /**
   * Load attachment count when record changes
   */
  useEffect(() => {
    if (recordId) {
      loadAttachmentCount();
    }
  }, [recordId, loadAttachmentCount]);

  /**
   * Load note count and unread count for current record
   */
  const loadNoteCount = useCallback(async () => {
    if (!modelName || !recordId || !sessionId || !database) {
      setNoteCount(0);
      setUnreadNoteCount(0);
      return;
    }

    try {
      const resource = `${modelName},${recordId}`;
      const noteIds = await rpc.search(
        'ir.note',
        [['resource', '=', resource]],
        0,
        null,
        null,
        sessionId,
        database
      );

      if (noteIds && noteIds.length > 0) {
        setNoteCount(noteIds.length);

        // Count unread notes
        const unreadIds = await rpc.search(
          'ir.note',
          [['resource', '=', resource], ['unread', '=', true]],
          0,
          null,
          null,
          sessionId,
          database
        );
        setUnreadNoteCount(unreadIds ? unreadIds.length : 0);
      } else {
        setNoteCount(0);
        setUnreadNoteCount(0);
      }
    } catch (err) {
      console.error('Error loading note count:', err);
      setNoteCount(0);
      setUnreadNoteCount(0);
    }
  }, [modelName, recordId, sessionId, database]);

  /**
   * Load note count when record changes
   */
  useEffect(() => {
    if (recordId) {
      loadNoteCount();
    }
  }, [recordId, loadNoteCount]);

  /**
   * Handle attachment button click
   */
  const handleAttachment = useCallback(() => {
    setShowAttachments(true);
  }, []);

  /**
   * Handle attachment window close
   */
  const handleAttachmentClose = useCallback(() => {
    setShowAttachments(false);
    // Reload count after closing in case attachments were added/deleted
    loadAttachmentCount();
  }, [loadAttachmentCount]);

  /**
   * Handle note button click
   */
  const handleNote = useCallback(() => {
    setShowNotes(true);
  }, []);

  /**
   * Handle note window close
   */
  const handleNoteClose = useCallback(() => {
    setShowNotes(false);
    // Reload count after closing in case notes were added/deleted
    loadNoteCount();
  }, [loadNoteCount]);

  /**
   * Handle button clicks
   */
  const handleButtonClick = useCallback(async (buttonName) => {
    try {
      setError(null);

      const buttonHandler = createButtonHandler(
        modelName,
        buttonName,
        recordId,
        sessionId,
        database,
        (result) => {
          // Handle the result
          if (result.type === 'reload') {
            // Reload the form
            window.location.reload();
          } else if (result.type === 'action') {
            // Open new window/view (not yet implemented)
            console.log('Action result:', result.action);
            alert('Action executed successfully! (Opening new views not yet implemented)');
          } else if (result.type === 'error') {
            setError(result.error.message || 'Button action failed');
          }
        }
      );

      await buttonHandler();
    } catch (err) {
      console.error('Error executing button:', err);
      setError(err.message || 'Button action failed');
    }
  }, [modelName, recordId, sessionId, database]);

  // Loading state
  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center py-5">
        <Spinner animation="border" variant="primary" />
        <span className="ms-3">Loading form...</span>
      </Container>
    );
  }

  // Error state
  if (error) {
    return (
      <Container className="py-3">
        <Alert variant="danger" dismissible onClose={() => setError(null)}>
          {error}
        </Alert>
      </Container>
    );
  }

  // No view definition
  if (!viewDefinition) {
    return (
      <Container className="py-3">
        <Alert variant="warning">No view definition found</Alert>
      </Container>
    );
  }

  return (
    <div className="form-view">
      <FormToolbar
        onSave={handleSave}
        onCancel={handleCancel}
        onNew={handleNew}
        onDelete={handleDelete}
        onDuplicate={handleDuplicate}
        onReload={handleReload}
        onSwitchView={handleSwitchView}
        onPrevious={listContext ? handlePrevious : null}
        onNext={listContext ? handleNext : null}
        onAttachment={handleAttachment}
        attachmentCount={attachmentCount}
        onNote={handleNote}
        noteCount={noteCount}
        unreadNoteCount={unreadNoteCount}
        isDirty={isDirty}
        isSaving={isSaving || isValidating}
        hasErrors={hasErrors}
        hasRecord={!!recordId}
      />

      {/* Display form-level validation errors */}
      {validationErrors._form && (
        <Container className="py-2">
          <Alert variant="danger">
            {validationErrors._form}
          </Alert>
        </Container>
      )}

      <Container className="py-3">
        <TrytonViewRenderer
          node={viewDefinition}
          fields={fields}
          record={recordData}
          onFieldChange={handleFieldChange}
          onButtonClick={handleButtonClick}
          readonly={false}
          validationErrors={validationErrors}
          validationWarnings={validationWarnings}
          fieldStates={fieldStates}
          getFieldValidationProps={getFieldValidationProps}
        />
      </Container>

      {/* Attachment Window */}
      <AttachmentWindow
        show={showAttachments}
        onHide={handleAttachmentClose}
        modelName={modelName}
        recordId={recordId}
        recordName={recordData.rec_name || recordData.name || `#${recordId}`}
      />

      {/* Note Window */}
      <NoteWindow
        show={showNotes}
        onHide={handleNoteClose}
        modelName={modelName}
        recordId={recordId}
        recordName={recordData.rec_name || recordData.name || `#${recordId}`}
      />
    </div>
  );
}

export default FormView;
