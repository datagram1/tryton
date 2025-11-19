import { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Alert } from 'react-bootstrap';
import TrytonViewRenderer from '../tryton/renderer/TrytonViewRenderer';
import FormToolbar from './FormToolbar';
import { parseXML } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

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
        const parsedView = parseXML(viewResult.arch);

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
   * Handle field value changes
   */
  const handleFieldChange = useCallback((fieldName, value) => {
    setRecordData((prev) => {
      const updated = { ...prev, [fieldName]: value };
      return updated;
    });
    setIsDirty(true);
  }, []);

  /**
   * Handle save operation
   */
  const handleSave = async () => {
    try {
      setIsSaving(true);
      setError(null);

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
        isSaving={isSaving}
      />

      <Container className="py-3">
        <TrytonViewRenderer
          node={viewDefinition}
          fields={fields}
          record={recordData}
          onFieldChange={handleFieldChange}
          readonly={false}
        />
      </Container>
    </div>
  );
}

export default FormView;
