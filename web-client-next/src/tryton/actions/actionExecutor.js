import rpc from '../../api/rpc';

/**
 * Action Executor
 * Handles execution of Tryton actions (ir.action.act_window, ir.action.report, etc.)
 */

/**
 * Parse action ID string
 * Action IDs come in format: "ir.action.act_window,89"
 * @param {string} actionId - Action ID string
 * @returns {Object} - { model: 'ir.action.act_window', id: 89 }
 */
export function parseActionId(actionId) {
  if (!actionId || typeof actionId !== 'string') {
    return null;
  }

  const parts = actionId.split(',');
  if (parts.length !== 2) {
    return null;
  }

  return {
    model: parts[0].trim(),
    id: parseInt(parts[1].trim(), 10),
  };
}

/**
 * Fetch action definition from server
 * @param {string} actionId - Action ID string (e.g., "ir.action.act_window,89")
 * @param {string} sessionId - Session ID
 * @param {string} database - Database name
 * @returns {Promise<Object>} - Action definition
 */
export async function fetchAction(actionId, sessionId, database) {
  console.log('[actionExecutor] fetchAction called:', { actionId, sessionId, database });
  const parsed = parseActionId(actionId);

  if (!parsed) {
    throw new Error(`Invalid action ID: ${actionId}`);
  }

  console.log('[actionExecutor] Parsed action:', parsed);

  try {
    // Read the action record
    console.log('[actionExecutor] Calling rpc.read with:', {
      model: parsed.model,
      ids: [parsed.id],
      fields: [],
      sessionId,
      database
    });

    const actions = await rpc.read(
      parsed.model,
      [parsed.id],
      null, // Read all fields (null means all fields in Tryton)
      sessionId,
      database
    );

    console.log('[actionExecutor] rpc.read response:', actions);

    if (!actions || actions.length === 0) {
      throw new Error(`Action not found: ${actionId}`);
    }

    return actions[0];
  } catch (error) {
    console.error('[actionExecutor] Error fetching action:', error);
    throw error;
  }
}

/**
 * Execute an act_window action
 * This is the most common action type - opens a model view
 * @param {Object} action - Action definition from server
 * @param {string} sessionId - Session ID
 * @param {string} database - Database name
 * @returns {Promise<Object>} - View configuration
 */
export async function executeActWindowAction(action, sessionId, database) {
  console.log('[actionExecutor] executeActWindowAction called with action:', action);

  try {
    // Extract key information from action
    const resModel = action.res_model;
    console.log('[actionExecutor] Extracted resModel:', resModel);

    const viewMode = action.view_mode || 'tree,form'; // e.g., "tree,form" or "form,tree"
    const viewModes = viewMode.split(',').map(m => m.trim());
    const domain = action.domain || '[]';
    const context = action.context || '{}';

    // Parse domain and context (they come as strings)
    let parsedDomain = [];
    let parsedContext = {};

    try {
      parsedDomain = JSON.parse(domain.replace(/'/g, '"'));
    } catch (e) {
      console.warn('Failed to parse domain:', domain);
    }

    try {
      parsedContext = JSON.parse(context.replace(/'/g, '"'));
    } catch (e) {
      console.warn('Failed to parse context:', context);
    }

    // Get the view IDs for each mode
    const viewIds = {};
    if (action.views && Array.isArray(action.views)) {
      // views is an array of [view_id, view_type] tuples
      action.views.forEach(([viewId, viewType]) => {
        viewIds[viewType] = viewId || null;
      });
    }

    // Determine the initial view type (usually the first in view_mode)
    const initialViewType = viewModes[0] || 'tree';

    const result = {
      resModel,
      viewModes,
      initialViewType,
      viewIds,
      domain: parsedDomain,
      context: parsedContext,
      name: action.name,
      limit: action.limit || 80,
    };

    console.log('[actionExecutor] executeActWindowAction result:', result);

    return result;
  } catch (error) {
    console.error('[actionExecutor] Error executing act_window action:', error);
    throw error;
  }
}

/**
 * Execute any action
 * Routes to the appropriate handler based on action type
 * @param {string} actionId - Action ID string
 * @param {string} sessionId - Session ID
 * @param {string} database - Database name
 * @returns {Promise<Object>} - Action execution result
 */
export async function executeAction(actionId, sessionId, database) {
  // Fetch the action definition
  const action = await fetchAction(actionId, sessionId, database);

  // Determine action type from the model
  const parsed = parseActionId(actionId);
  const actionType = parsed.model;

  switch (actionType) {
    case 'ir.action.act_window':
      return {
        type: 'act_window',
        action,
        config: await executeActWindowAction(action, sessionId, database),
      };

    case 'ir.action.report':
      return {
        type: 'report',
        action,
        message: 'Report actions not yet implemented',
      };

    case 'ir.action.wizard':
      return {
        type: 'wizard',
        action,
        config: {
          wizardAction: action.wiz_name || action.model, // Wizard action name
          name: action.name,
          window: action.window || false, // Open in tab vs modal
        },
      };

    case 'ir.action.url':
      return {
        type: 'url',
        action,
        url: action.url,
      };

    default:
      return {
        type: 'unknown',
        action,
        message: `Unknown action type: ${actionType}`,
      };
  }
}

export default {
  parseActionId,
  fetchAction,
  executeActWindowAction,
  executeAction,
};
