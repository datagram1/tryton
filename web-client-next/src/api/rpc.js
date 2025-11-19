import axios from 'axios';

/**
 * Tryton RPC Client
 * Implements JSON-RPC 2.0 protocol for communicating with Tryton server
 */

let requestId = 0;
let authorizationHeader = null;

/**
 * Set the authorization header for authenticated requests
 * Format: base64(username:userId:session)
 */
export function setAuthHeader(username, userId, sessionId) {
  if (username && userId && sessionId) {
    authorizationHeader = btoa(`${username}:${userId}:${sessionId}`);
  } else {
    authorizationHeader = null;
  }
}

/**
 * Clear the authorization header
 */
export function clearAuthHeader() {
  authorizationHeader = null;
}

/**
 * Custom error classes for Tryton-specific errors
 */
export class TrytonError extends Error {
  constructor(message, code, data) {
    super(message);
    this.name = 'TrytonError';
    this.code = code;
    this.data = data;
  }
}

export class ConcurrencyException extends TrytonError {
  constructor(message, data) {
    super(message, 'ConcurrencyException', data);
    this.name = 'ConcurrencyException';
  }
}

export class UserError extends TrytonError {
  constructor(message, data) {
    super(message, 'UserError', data);
    this.name = 'UserError';
  }
}

/**
 * Make a JSON-RPC call to the Tryton server
 *
 * @param {string} method - The RPC method to call (e.g., 'common.db.login')
 * @param {Array} params - Array of parameters for the method
 * @param {string|null} sessionId - Optional session ID for authenticated requests
 * @param {string} database - Database name (default: empty string for common methods)
 * @returns {Promise<any>} - The result from the server
 */
export async function call(method, params = [], sessionId = null, database = '') {
  requestId++;

  // For Tryton RPC, most methods need a context object as the last parameter
  // The context gets merged with session context on the server
  const paramsWithContext = [...params];
  const lastParam = paramsWithContext[paramsWithContext.length - 1];

  // Methods that don't need context appended
  const noContextMethods = ['common.db.login', 'common.db.list', 'common.server.version'];
  const needsContext = !noContextMethods.includes(method);

  // If last param is not a plain object or doesn't exist, append empty context
  if (needsContext && (!lastParam || typeof lastParam !== 'object' || Array.isArray(lastParam))) {
    paramsWithContext.push({});
  }

  const payload = {
    method,
    params: paramsWithContext,
    id: requestId,
  };

  // Construct URL: Use /tryton prefix for Vite proxy, then database path
  // Proxy will rewrite /tryton/* to backend
  // Backend expects: /{database}/ or /
  const url = database ? `/tryton/${database}/` : '/tryton/';

  console.log('[rpc] Calling:', { method, url, params: paramsWithContext, requestId });

  try {
    const response = await axios.post(url, payload, {
      headers: {
        'Content-Type': 'application/json',
        ...(authorizationHeader && { 'Authorization': `Session ${authorizationHeader}` }),
      },
    });

    console.log('[rpc] Response:', { method, requestId, status: response.status, data: response.data });

    if (response.data.error) {
      const error = response.data.error;

      // Tryton errors come as arrays: [errorType, args...]
      if (Array.isArray(error)) {
        const [errorType, ...args] = error;

        // Handle specific Tryton error types
        if (errorType === 'LoginException') {
          const err = new TrytonError('Login challenge', 'LoginException', args);
          err.args = args; // Store args for challenge-response handling
          throw err;
        }

        if (errorType === 'ConcurrencyException') {
          throw new ConcurrencyException(args[0] || 'Concurrency error', args);
        }

        if (errorType === 'UserError') {
          throw new UserError(args[0] || 'User error', args);
        }

        // Generic error from array format
        throw new TrytonError(
          args[0] || 'Unknown error',
          errorType || 'UnknownError',
          args
        );
      }

      // Handle object-format errors (for compatibility)
      if (error.code === 'ConcurrencyException') {
        throw new ConcurrencyException(error.message, error.data);
      }

      if (error.code === 'UserError') {
        throw new UserError(error.message, error.data);
      }

      // Generic error
      throw new TrytonError(
        error.message || 'Unknown error',
        error.code || 'UnknownError',
        error.data
      );
    }

    return response.data.result;
  } catch (error) {
    // Re-throw Tryton errors as-is
    if (error instanceof TrytonError) {
      throw error;
    }

    // Handle network errors
    if (error.response) {
      // Server responded with error status
      throw new TrytonError(
        `Server error: ${error.response.status}`,
        'NetworkError',
        error.response.data
      );
    } else if (error.request) {
      // Request was made but no response received
      throw new TrytonError(
        'No response from server',
        'NetworkError',
        null
      );
    } else {
      // Error setting up the request
      throw new TrytonError(
        error.message || 'Request failed',
        'RequestError',
        null
      );
    }
  }
}

/**
 * Helper methods for common RPC operations
 */

export const rpc = {
  /**
   * Login Step 1: Send username only to initiate challenge-response
   * Server responds with LoginException asking for password
   */
  loginStep1: (database, username, deviceCookie = null, language = 'en') =>
    call('common.db.login', [username, { device_cookie: deviceCookie }, language], null, database),

  /**
   * Login Step 2: Send username + password to complete authentication
   * Returns [userId, sessionId, busUrlHost]
   */
  loginStep2: (database, username, password, deviceCookie = null, language = 'en') =>
    call('common.db.login', [username, { password, device_cookie: deviceCookie }, language], null, database),

  /**
   * Logout from the server
   */
  logout: (sessionId, database) =>
    call('common.db.logout', [], sessionId, database),

  /**
   * Get server version
   */
  version: () =>
    call('common.version', []),

  /**
   * List available databases
   */
  listDatabases: () =>
    call('common.db.list', []),

  /**
   * Call a model method
   */
  model: (modelName, method, params, sessionId, database) =>
    call(`model.${modelName}.${method}`, params, sessionId, database),

  /**
   * Search for records
   */
  search: (modelName, domain, offset, limit, order, sessionId, database) =>
    call(`model.${modelName}.search`, [domain, offset, limit, order], sessionId, database),

  /**
   * Read records
   */
  read: (modelName, ids, fields, sessionId, database) =>
    call(`model.${modelName}.read`, [ids, fields], sessionId, database),

  /**
   * Search and read records
   */
  searchRead: (modelName, domain, offset, limit, order, fields, sessionId, database) =>
    call(`model.${modelName}.search_read`, [domain, offset, limit, order, fields], sessionId, database),

  /**
   * Write/update records
   */
  write: (modelName, ids, values, sessionId, database) =>
    call(`model.${modelName}.write`, [ids, values], sessionId, database),

  /**
   * Create records
   */
  create: (modelName, values, sessionId, database) =>
    call(`model.${modelName}.create`, [values], sessionId, database),

  /**
   * Delete records
   */
  delete: (modelName, ids, sessionId, database) =>
    call(`model.${modelName}.delete`, [ids], sessionId, database),

  /**
   * Get field view definition
   */
  fieldsViewGet: (modelName, viewId, viewType, sessionId, database) =>
    call(`model.${modelName}.fields_view_get`, [viewId, viewType], sessionId, database),

  /**
   * Get default values for a new record
   * @param {string} modelName - Model name (e.g., 'party.party')
   * @param {Array<string>} fields - List of field names to get defaults for
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @param {Object} context - Optional context object (can include default_FIELDNAME values)
   * @returns {Promise<Object>} - Object mapping field names to default values
   */
  defaultGet: (modelName, fields, sessionId, database, context = {}) =>
    call(`model.${modelName}.default_get`, [fields, context], sessionId, database),

  /**
   * Copy/duplicate records
   * @param {string} modelName - Model name
   * @param {Array<number>} ids - Record IDs to copy
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @param {Object} context - Optional context
   * @returns {Promise<Array<number>>} - IDs of new copied records
   */
  copy: (modelName, ids, sessionId, database, context = {}) =>
    call(`model.${modelName}.copy`, [ids, context], sessionId, database),

  /**
   * Execute on_change callback for field dependencies
   * @param {string} modelName - Model name
   * @param {Object} values - Current record values
   * @param {Array<string>} fieldNames - Fields that changed
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @returns {Promise<Object>} - Updated field values
   */
  onChange: (modelName, values, fieldNames, sessionId, database) =>
    call(`model.${modelName}.on_change`, [values, fieldNames], sessionId, database),

  /**
   * Server-side validation before save
   * @param {string} modelName - Model name
   * @param {Array<Object>} values - Record values to validate
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @returns {Promise<void>} - Throws error if validation fails
   */
  preValidate: (modelName, values, sessionId, database) =>
    call(`model.${modelName}.pre_validate`, [values], sessionId, database),

  /**
   * Get field definitions for a model
   * @param {string} modelName - Model name
   * @param {Array<string>} fieldNames - Optional list of field names (null = all fields)
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @returns {Promise<Object>} - Field definitions
   */
  fieldsGet: (modelName, fieldNames, sessionId, database) =>
    call(`model.${modelName}.fields_get`, [fieldNames], sessionId, database),

  /**
   * Count records matching a domain
   * @param {string} modelName - Model name
   * @param {Array} domain - Search domain
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @returns {Promise<number>} - Count of matching records
   */
  searchCount: (modelName, domain, sessionId, database) =>
    call(`model.${modelName}.search_count`, [domain], sessionId, database),

  /**
   * Export record data
   * @param {string} modelName - Model name
   * @param {Array<number>} ids - Record IDs to export
   * @param {Array<string>} fields - Fields to export
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @returns {Promise<Array>} - Exported data
   */
  exportData: (modelName, ids, fields, sessionId, database) =>
    call(`model.${modelName}.export_data`, [ids, fields], sessionId, database),

  /**
   * Import record data
   * @param {string} modelName - Model name
   * @param {Array<string>} fields - Field names
   * @param {Array<Array>} data - Data rows to import
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @returns {Promise<number>} - Number of records imported
   */
  importData: (modelName, fields, data, sessionId, database) =>
    call(`model.${modelName}.import_data`, [fields, data], sessionId, database),

  /**
   * Search for records by name (autocomplete)
   * @param {string} modelName - Model name
   * @param {string} searchText - Text to search for
   * @param {Array} domain - Optional search domain filter
   * @param {string} sessionId - Session ID
   * @param {string} database - Database name
   * @param {Object} context - Optional context
   * @returns {Promise<Array>} - Array of [id, name] tuples
   */
  nameSearch: (modelName, searchText, domain = [], sessionId, database, context = {}) =>
    call(`model.${modelName}.name_search`, [searchText, domain, context], sessionId, database),
};

export default rpc;
