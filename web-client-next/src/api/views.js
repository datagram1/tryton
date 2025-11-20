import rpc from './rpc';

/**
 * Views API utilities
 * Handles fetching view definitions from Tryton
 */

/**
 * Fetch a view definition from the server
 * @param {string} modelName - The model name (e.g., 'party.party')
 * @param {number|null} viewId - Optional view ID (null for default)
 * @param {string} viewType - View type ('form', 'tree', 'graph', 'calendar', etc.)
 * @param {string} sessionId - Active session ID
 * @param {string} database - Database name
 * @returns {Promise<Object>} - View definition with fields and arch
 */
export async function fetchView(modelName, viewId, viewType, sessionId, database) {
  try {
    const result = await rpc.fieldsViewGet(
      modelName,
      viewId,
      viewType,
      sessionId,
      database
    );

    return {
      type: result.type || viewType,
      fields: result.fields || {},
      arch: result.arch || '',
      viewId: result.view_id || viewId,
      model: result.model || modelName,
      fieldChilds: result.field_childs || null,
    };
  } catch (error) {
    console.error(`Failed to fetch view for ${modelName}:`, error);
    throw error;
  }
}

/**
 * Fetch multiple views for a model
 * @param {string} modelName - The model name
 * @param {Array<string>} viewTypes - Array of view types to fetch
 * @param {string} sessionId - Active session ID
 * @param {string} database - Database name
 * @returns {Promise<Object>} - Object with view types as keys
 */
export async function fetchViews(modelName, viewTypes, sessionId, database) {
  const views = {};

  try {
    await Promise.all(
      viewTypes.map(async (viewType) => {
        views[viewType] = await fetchView(
          modelName,
          null,
          viewType,
          sessionId,
          database
        );
      })
    );

    return views;
  } catch (error) {
    console.error(`Failed to fetch views for ${modelName}:`, error);
    throw error;
  }
}

/**
 * Get action definition
 * @param {number} actionId - Action ID
 * @param {string} sessionId - Active session ID
 * @param {string} database - Database name
 * @returns {Promise<Object>} - Action definition
 */
export async function fetchAction(actionId, sessionId, database) {
  try {
    // Fetch the action record
    const actions = await rpc.read(
      'ir.action',
      [actionId],
      ['type'],
      sessionId,
      database
    );

    if (!actions || actions.length === 0) {
      throw new Error('Action not found');
    }

    const actionType = actions[0].type;

    // Fetch the specific action based on type
    let action;
    switch (actionType) {
      case 'ir.action.act_window':
        action = await rpc.read(
          'ir.action.act_window',
          [actionId],
          [
            'name',
            'res_model',
            'views',
            'domain',
            'context',
            'limit',
            'search_value',
          ],
          sessionId,
          database
        );
        break;

      case 'ir.action.wizard':
        action = await rpc.read(
          'ir.action.wizard',
          [actionId],
          ['name', 'wiz_name', 'model'],
          sessionId,
          database
        );
        break;

      case 'ir.action.report':
        action = await rpc.read(
          'ir.action.report',
          [actionId],
          ['name', 'report_name', 'model'],
          sessionId,
          database
        );
        break;

      case 'ir.action.url':
        action = await rpc.read(
          'ir.action.url',
          [actionId],
          ['name', 'url'],
          sessionId,
          database
        );
        break;

      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }

    if (!action || action.length === 0) {
      throw new Error('Action not found');
    }

    return {
      ...action[0],
      type: actionType,
    };
  } catch (error) {
    console.error(`Failed to fetch action ${actionId}:`, error);
    throw error;
  }
}

/**
 * Parse action views array
 * @param {Array} views - Views array from action definition
 * @returns {Array} - Parsed views with id and type
 */
export function parseActionViews(views) {
  if (!views || !Array.isArray(views)) {
    return [];
  }

  return views.map((view) => {
    if (Array.isArray(view)) {
      // Format: [view_id, view_type]
      return {
        id: view[0],
        type: view[1],
      };
    } else if (typeof view === 'object') {
      // Format: {view_id: ..., view_type: ...}
      return {
        id: view.view_id || null,
        type: view.view_type || 'tree',
      };
    }
    return null;
  }).filter(Boolean);
}

export default {
  fetchView,
  fetchViews,
  fetchAction,
  parseActionViews,
};
