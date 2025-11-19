import { useState, useCallback, useEffect } from 'react';
import { validateRecord, validateField, computeFieldStates } from '../tryton/validation/fieldValidator';
import rpc from '../api/rpc';

/**
 * useFormValidation Hook
 * Manages form validation state and integrates with Tryton's validation system
 *
 * This hook implements Step B-E from the validation bridging strategy:
 * - Interprets metadata and enforces client-side constraints
 * - Hooks change events to call backend on_change methods
 * - Calls backend pre_validate before save
 * - Displays server-side validation errors
 */
export function useFormValidation(modelName, fields, record, sessionId, database) {
  // Track validation state
  const [validationErrors, setValidationErrors] = useState({});
  const [validationWarnings, setValidationWarnings] = useState({});
  const [fieldStates, setFieldStates] = useState({});
  const [isValidating, setIsValidating] = useState(false);

  /**
   * Compute field states based on record data
   * Handles states like: { required: "field == 'value'", readonly: "state == 'done'" }
   */
  useEffect(() => {
    if (!fields || !record) return;

    const newStates = {};
    for (const fieldName in fields) {
      const fieldDef = fields[fieldName];
      if (fieldDef.states) {
        newStates[fieldName] = computeFieldStates(fieldDef.states, record);
      } else {
        // Default states based on field definition
        newStates[fieldName] = {
          required: fieldDef.required || false,
          readonly: fieldDef.readonly || false,
          invisible: false,
        };
      }
    }

    setFieldStates(newStates);
  }, [fields, record]);

  /**
   * Validate a single field (client-side)
   */
  const validateSingleField = useCallback((fieldName, value) => {
    if (!fields || !fields[fieldName]) return { valid: true };

    const fieldDef = fields[fieldName];
    const stateAttrs = fieldStates[fieldName] || {};

    const validation = validateField(value, fieldDef, record, stateAttrs, false);

    // Update validation state
    setValidationErrors(prev => {
      const updated = { ...prev };
      if (validation.error) {
        updated[fieldName] = validation.error;
      } else {
        delete updated[fieldName];
      }
      return updated;
    });

    setValidationWarnings(prev => {
      const updated = { ...prev };
      if (validation.warning) {
        updated[fieldName] = validation.warning;
      } else {
        delete updated[fieldName];
      }
      return updated;
    });

    return validation;
  }, [fields, fieldStates, record]);

  /**
   * Validate all fields (client-side)
   */
  const validateAll = useCallback((softValidation = false) => {
    if (!fields || !record) {
      return { valid: true, errors: {}, warnings: {} };
    }

    const result = validateRecord(record, fields, fieldStates, null, softValidation);

    setValidationErrors(result.errors);
    setValidationWarnings(result.warnings);

    return result;
  }, [fields, record, fieldStates]);

  /**
   * Call server-side on_change method for a field
   * This handles dynamic field updates and validation
   */
  const callOnChange = useCallback(async (fieldName, value) => {
    if (!modelName || !sessionId || !database) return null;

    const fieldDef = fields[fieldName];
    if (!fieldDef || !fieldDef.on_change) return null;

    try {
      // Prepare on_change arguments
      const args = {
        ...record,
        [fieldName]: value,
      };

      // Call the on_change method on the server
      const result = await rpc.model(
        modelName,
        'on_change',
        [[args], [fieldName]],
        sessionId,
        database
      );

      // Result contains updated field values
      return result;
    } catch (error) {
      console.error(`Error calling on_change for ${fieldName}:`, error);
      return null;
    }
  }, [modelName, fields, record, sessionId, database]);

  /**
   * Call server-side on_change_with method
   * Used for computed fields that depend on other fields
   */
  const callOnChangeWith = useCallback(async (fieldName) => {
    if (!modelName || !sessionId || !database) return null;

    const fieldDef = fields[fieldName];
    if (!fieldDef || !fieldDef.on_change_with) return null;

    try {
      // Call the on_change_with method
      const result = await rpc.model(
        modelName,
        `on_change_with_${fieldName}`,
        [record],
        sessionId,
        database
      );

      return result;
    } catch (error) {
      console.error(`Error calling on_change_with for ${fieldName}:`, error);
      return null;
    }
  }, [modelName, fields, record, sessionId, database]);

  /**
   * Call server-side pre_validate before saving
   * This is Tryton's main validation entry point
   */
  const preValidate = useCallback(async () => {
    if (!modelName || !sessionId || !database || !record) {
      return { valid: true, errors: {} };
    }

    setIsValidating(true);

    try {
      // Call the server's pre_validate method
      await rpc.preValidate(
        modelName,
        [record],
        sessionId,
        database
      );

      // If no exception, validation passed
      setValidationErrors({});
      return { valid: true, errors: {} };
    } catch (error) {
      // Server returned validation errors
      let errors = {};

      // Parse Tryton error format
      if (error.data && Array.isArray(error.data)) {
        const [errorType, ...errorArgs] = error.data;

        if (errorType === 'UserError' && errorArgs[0]) {
          // UserError format: ['UserError', message, description]
          errors._form = errorArgs[0];
        } else if (errorArgs[0]) {
          errors._form = errorArgs[0];
        }
      } else if (error.message) {
        errors._form = error.message;
      }

      setValidationErrors(errors);
      return { valid: false, errors };
    } finally {
      setIsValidating(false);
    }
  }, [modelName, record, sessionId, database]);

  /**
   * Handle field change with validation and on_change calls
   * This is the main integration point for form field changes
   */
  const handleFieldChange = useCallback(async (fieldName, value, onFieldChange) => {
    // 1. Update the field value (via parent callback)
    onFieldChange(fieldName, value);

    // 2. Validate the field client-side
    validateSingleField(fieldName, value);

    // 3. Call on_change if defined
    const onChangeResult = await callOnChange(fieldName, value);

    if (onChangeResult) {
      // Apply the changes returned by on_change
      for (const changedField in onChangeResult) {
        if (changedField !== fieldName) {
          onFieldChange(changedField, onChangeResult[changedField]);
        }
      }
    }

    // 4. Check for on_change_with fields that depend on this field
    for (const otherFieldName in fields) {
      const otherFieldDef = fields[otherFieldName];
      if (otherFieldDef.on_change_with &&
          otherFieldDef.on_change_with.includes(fieldName)) {
        const newValue = await callOnChangeWith(otherFieldName);
        if (newValue !== null && newValue !== undefined) {
          onFieldChange(otherFieldName, newValue);
        }
      }
    }
  }, [fields, validateSingleField, callOnChange, callOnChangeWith]);

  /**
   * Get validation props for a field (for UI rendering)
   */
  const getFieldValidationProps = useCallback((fieldName) => {
    const states = fieldStates[fieldName] || {};
    const error = validationErrors[fieldName];
    const warning = validationWarnings[fieldName];

    return {
      required: states.required,
      readonly: states.readonly,
      invisible: states.invisible,
      error,
      warning,
      isInvalid: !!error,
      isValid: !error && !!record[fieldName],
      // Bootstrap form classes
      className: error ? 'is-invalid' : '',
    };
  }, [fieldStates, validationErrors, validationWarnings, record]);

  /**
   * Check if form has any validation errors
   */
  const hasErrors = useCallback(() => {
    return Object.keys(validationErrors).length > 0;
  }, [validationErrors]);

  /**
   * Clear all validation errors
   */
  const clearErrors = useCallback(() => {
    setValidationErrors({});
    setValidationWarnings({});
  }, []);

  return {
    // Validation state
    validationErrors,
    validationWarnings,
    fieldStates,
    isValidating,
    hasErrors: hasErrors(),

    // Validation methods
    validateSingleField,
    validateAll,
    preValidate,

    // On-change methods
    callOnChange,
    callOnChangeWith,
    handleFieldChange,

    // UI helpers
    getFieldValidationProps,
    clearErrors,
  };
}

export default useFormValidation;
