import rpc from '../../api/rpc';

/**
 * Button Action Handler
 * Handles button clicks in Tryton forms
 */

/**
 * Execute a button action
 * @param {string} modelName - The model name
 * @param {string} buttonName - The button method name
 * @param {Array} recordIds - Array of record IDs to execute the action on
 * @param {Object} context - Context for the action
 * @param {string} sessionId - Session ID
 * @param {string} database - Database name
 * @returns {Promise} - Result from the server
 */
export async function executeButtonAction(
  modelName,
  buttonName,
  recordIds,
  context = {},
  sessionId,
  database
) {
  try {
    // In Tryton, button actions are called as methods on the model
    // The method name is the button's 'name' attribute
    const result = await rpc.model(
      modelName,
      buttonName,
      [recordIds, context],
      sessionId,
      database
    );

    return result;
  } catch (error) {
    console.error('Error executing button action:', error);
    throw error;
  }
}

/**
 * Handle button action result
 * The result can be:
 * - null/undefined: Just reload the form
 * - action dict: Open a new view/window
 * - wizard: Open a wizard dialog
 */
export function handleButtonResult(result, onAction) {
  if (!result) {
    // Just reload/refresh
    return { type: 'reload' };
  }

  if (typeof result === 'object' && result.type) {
    // It's an action - could be ir.action.act_window, ir.action.report, etc.
    if (onAction) {
      onAction(result);
    }
    return { type: 'action', action: result };
  }

  // Unknown result type
  return { type: 'unknown', result };
}

/**
 * Create a button click handler
 */
export function createButtonHandler(
  modelName,
  buttonName,
  recordId,
  sessionId,
  database,
  onComplete
) {
  return async () => {
    try {
      const recordIds = recordId ? [recordId] : [];

      const result = await executeButtonAction(
        modelName,
        buttonName,
        recordIds,
        {},
        sessionId,
        database
      );

      const handledResult = handleButtonResult(result, onComplete);

      if (onComplete) {
        onComplete(handledResult);
      }

      return handledResult;
    } catch (error) {
      console.error('Button action failed:', error);

      if (onComplete) {
        onComplete({ type: 'error', error });
      }

      throw error;
    }
  };
}

export default {
  executeButtonAction,
  handleButtonResult,
  createButtonHandler,
};
