import { useCallback, useRef } from 'react';
import rpc from '../api/rpc';

/**
 * Custom hook for handling field changes with debouncing and on_change server calls
 *
 * In Tryton, when a field changes, the server may define on_change methods that
 * need to be called to update other fields based on the change.
 *
 * @param {string} modelName - The model name
 * @param {Object} fields - Field definitions from fields_view_get
 * @param {Function} onUpdate - Callback to update multiple fields at once
 * @param {string} sessionId - Session ID
 * @param {string} database - Database name
 * @param {number} debounceMs - Debounce delay in milliseconds (default: 300)
 */
function useOnChange(modelName, fields, onUpdate, sessionId, database, debounceMs = 300) {
  const debounceTimers = useRef({});

  /**
   * Check if a field has on_change methods defined
   */
  const hasOnChange = useCallback((fieldName) => {
    const field = fields[fieldName];
    return field && field.on_change && field.on_change.length > 0;
  }, [fields]);

  /**
   * Call the on_change method for a field
   */
  const callOnChange = useCallback(async (fieldName, currentRecord) => {
    const field = fields[fieldName];

    if (!field || !field.on_change || field.on_change.length === 0) {
      return null;
    }

    try {
      // The on_change method is called with the current record values
      // and returns a dictionary of field updates
      const result = await rpc.model(
        modelName,
        'on_change',
        [currentRecord, [fieldName]],
        sessionId,
        database
      );

      return result;
    } catch (error) {
      console.error(`Error calling on_change for ${fieldName}:`, error);
      return null;
    }
  }, [modelName, fields, sessionId, database]);

  /**
   * Handle field change with debouncing
   */
  const handleChange = useCallback((fieldName, value, currentRecord) => {
    // Clear existing timer for this field
    if (debounceTimers.current[fieldName]) {
      clearTimeout(debounceTimers.current[fieldName]);
    }

    // Update the field value immediately in local state
    onUpdate({ [fieldName]: value });

    // If the field has on_change, debounce the server call
    if (hasOnChange(fieldName)) {
      debounceTimers.current[fieldName] = setTimeout(async () => {
        const updatedRecord = { ...currentRecord, [fieldName]: value };
        const changes = await callOnChange(fieldName, updatedRecord);

        if (changes && typeof changes === 'object') {
          // Update multiple fields based on on_change result
          onUpdate(changes);
        }
      }, debounceMs);
    }
  }, [onUpdate, hasOnChange, callOnChange, debounceMs]);

  /**
   * Clean up timers on unmount
   */
  const cleanup = useCallback(() => {
    Object.values(debounceTimers.current).forEach(timer => clearTimeout(timer));
    debounceTimers.current = {};
  }, []);

  return {
    handleChange,
    hasOnChange,
    cleanup,
  };
}

export default useOnChange;
