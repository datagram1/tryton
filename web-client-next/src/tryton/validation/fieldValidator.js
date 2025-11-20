/**
 * Field Validator
 * Implements Tryton-compatible field validation on the frontend
 *
 * Bridges Tryton's server-side validation with React UI:
 * - Validates required fields
 * - Checks domain constraints
 * - Handles states (readonly, invisible, required)
 * - Type-specific validation
 */

/**
 * Validate a single field value
 * @param {*} value - Field value
 * @param {Object} fieldDef - Field definition from server
 * @param {Object} record - Current record data
 * @param {Object} stateAttrs - Computed state attributes (required, readonly, invisible)
 * @param {boolean} softValidation - If true, only warn; don't block
 * @returns {Object} { valid: boolean, error: string|null, warning: string|null }
 */
export function validateField(value, fieldDef, record, stateAttrs = {}, softValidation = false) {
  const result = {
    valid: true,
    error: null,
    warning: null,
  };

  // Skip validation for readonly or invisible fields
  if (stateAttrs.readonly || stateAttrs.invisible) {
    return result;
  }

  // Check required constraint
  const isRequired = stateAttrs.required || fieldDef.required;
  if (!softValidation && isRequired && isEmpty(value, fieldDef.type)) {
    result.valid = false;
    result.error = `${fieldDef.string || 'This field'} is required`;
    return result;
  }

  // Type-specific validation
  if (!isEmpty(value, fieldDef.type)) {
    const typeValidation = validateByType(value, fieldDef);
    if (!typeValidation.valid) {
      result.valid = false;
      result.error = typeValidation.error;
      return result;
    }
  }

  // Domain validation (simplified - full domain validation requires backend)
  if (fieldDef.domain) {
    // For complex domains, we'll need server-side validation
    // For now, mark as needing server validation
    result.needsServerValidation = true;
  }

  return result;
}

/**
 * Check if a value is considered "empty" for validation purposes
 */
function isEmpty(value, fieldType) {
  if (value === null || value === undefined) {
    return true;
  }

  switch (fieldType) {
    case 'char':
    case 'text':
      return typeof value === 'string' && value.trim() === '';

    case 'many2one':
      return !value || (Array.isArray(value) && !value[0]);

    case 'one2many':
    case 'many2many':
      return !Array.isArray(value) || value.length === 0;

    case 'boolean':
      // Boolean fields are never empty (false is a valid value)
      return false;

    case 'integer':
    case 'float':
    case 'numeric':
      return value === '' || value === null || value === undefined;

    case 'date':
    case 'datetime':
    case 'time':
      return !value;

    case 'selection':
      return !value || value === '';

    default:
      return !value;
  }
}

/**
 * Validate based on field type
 */
function validateByType(value, fieldDef) {
  const result = { valid: true, error: null };

  switch (fieldDef.type) {
    case 'integer':
      if (!Number.isInteger(Number(value))) {
        result.valid = false;
        result.error = `${fieldDef.string || 'This field'} must be an integer`;
      }
      break;

    case 'float':
    case 'numeric':
      if (isNaN(Number(value))) {
        result.valid = false;
        result.error = `${fieldDef.string || 'This field'} must be a number`;
      }
      // Check digits constraint if present
      if (fieldDef.digits && Array.isArray(fieldDef.digits)) {
        const [total, decimal] = fieldDef.digits;
        const numValue = Number(value);
        const strValue = numValue.toString();
        const parts = strValue.split('.');

        if (parts[0].length > (total - decimal)) {
          result.valid = false;
          result.error = `${fieldDef.string || 'This field'} exceeds maximum digits`;
        }
        if (parts[1] && parts[1].length > decimal) {
          result.valid = false;
          result.error = `${fieldDef.string || 'This field'} has too many decimal places`;
        }
      }
      break;

    case 'date':
      if (value && !isValidDate(value)) {
        result.valid = false;
        result.error = `${fieldDef.string || 'This field'} must be a valid date`;
      }
      break;

    case 'datetime':
      if (value && !isValidDateTime(value)) {
        result.valid = false;
        result.error = `${fieldDef.string || 'This field'} must be a valid date/time`;
      }
      break;

    case 'email':
      if (value && !isValidEmail(value)) {
        result.valid = false;
        result.error = `${fieldDef.string || 'This field'} must be a valid email address`;
      }
      break;

    case 'url':
      if (value && !isValidURL(value)) {
        result.valid = false;
        result.error = `${fieldDef.string || 'This field'} must be a valid URL`;
      }
      break;

    case 'selection':
      // Validate that value is one of the allowed selections
      if (fieldDef.selection && Array.isArray(fieldDef.selection)) {
        const validValues = fieldDef.selection.map(([key]) => key);
        if (value && !validValues.includes(value)) {
          result.valid = false;
          result.error = `${fieldDef.string || 'This field'} has an invalid value`;
        }
      }
      break;
  }

  return result;
}

/**
 * Helper: Validate date string
 */
function isValidDate(dateString) {
  const date = new Date(dateString);
  return date instanceof Date && !isNaN(date);
}

/**
 * Helper: Validate datetime string
 */
function isValidDateTime(datetimeString) {
  return isValidDate(datetimeString);
}

/**
 * Helper: Validate email
 */
function isValidEmail(email) {
  // Simple email validation regex
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Helper: Validate URL
 */
function isValidURL(url) {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate entire record
 * @param {Object} record - Record data
 * @param {Object} fields - Field definitions
 * @param {Object} statesMap - Map of field states (computed from states attribute)
 * @param {Array} fieldsToValidate - Specific fields to validate (null = all)
 * @param {boolean} softValidation - If true, only warn
 * @returns {Object} { valid: boolean, errors: Object, warnings: Object }
 */
export function validateRecord(record, fields, statesMap = {}, fieldsToValidate = null, softValidation = false) {
  const errors = {};
  const warnings = {};
  let valid = true;

  for (const fieldName in fields) {
    // Skip if specific fields requested and this isn't one of them
    if (fieldsToValidate && !fieldsToValidate.includes(fieldName)) {
      continue;
    }

    const fieldDef = fields[fieldName];
    const value = record[fieldName];
    const stateAttrs = statesMap[fieldName] || {};

    const validation = validateField(value, fieldDef, record, stateAttrs, softValidation);

    if (!validation.valid) {
      errors[fieldName] = validation.error;
      valid = false;
    }

    if (validation.warning) {
      warnings[fieldName] = validation.warning;
    }
  }

  return { valid, errors, warnings };
}

/**
 * Compute field states based on states attribute
 * @param {Object} statesDefinition - States definition from field
 * @param {Object} record - Current record data
 * @returns {Object} { required: boolean, readonly: boolean, invisible: boolean }
 */
export function computeFieldStates(statesDefinition, record) {
  const result = {
    required: false,
    readonly: false,
    invisible: false,
  };

  if (!statesDefinition) {
    return result;
  }

  // States is typically an object like:
  // { required: 'field_x == "value"', readonly: 'state == "done"' }
  // For now, we'll implement simple evaluation
  // Full PYSON evaluation would require the pyson parser

  for (const attr in statesDefinition) {
    const condition = statesDefinition[attr];

    // Simple condition evaluation (would need full PYSON for production)
    if (typeof condition === 'boolean') {
      result[attr] = condition;
    } else if (typeof condition === 'string') {
      // Simplified evaluation - in production, use proper PYSON parser
      result[attr] = evaluateSimpleCondition(condition, record);
    }
  }

  return result;
}

/**
 * Simplified condition evaluation
 * In production, this should use Tryton's PYSON parser
 */
function evaluateSimpleCondition(condition, record) {
  // Very basic evaluation - just for demonstration
  // Real implementation needs PYSON parser from sao/pyson.js

  // Handle simple equality checks like: "state == 'done'"
  const eqMatch = condition.match(/^(\w+)\s*==\s*['"](.+)['"]$/);
  if (eqMatch) {
    const [, fieldName, value] = eqMatch;
    return record[fieldName] == value;
  }

  // Handle simple boolean checks like: "is_active"
  if (condition in record) {
    return Boolean(record[condition]);
  }

  // Default to false if we can't evaluate
  return false;
}

export default {
  validateField,
  validateRecord,
  computeFieldStates,
  isEmpty,
};
