import { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Alert } from 'react-bootstrap';
import TrytonViewRenderer from '../tryton/renderer/TrytonViewRenderer';
import FormToolbar from './FormToolbar';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import { createButtonHandler } from '../tryton/actions/buttonHandler';
import { useFormValidation } from '../hooks/useFormValidation';

/**
 * FormView Component
 * Container for displaying and editing a single Tryton record
 */
function FormView({ modelName, recordId, viewId = null }) {
  const { sessionId, database } = useSessionStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [fields, setFields] = useState({});
  const [recordData, setRecordData] = useState({});
  const [originalData, setOriginalData] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [isDirty, setIsDirty] = useState(false);

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
          // New record - initialize with default values
          const defaultData = { id: null };
          setRecordData(defaultData);
          setOriginalData(defaultData);
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
        isDirty={isDirty}
        isSaving={isSaving || isValidating}
        hasErrors={hasErrors}
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
    </div>
  );
}

export default FormView;
