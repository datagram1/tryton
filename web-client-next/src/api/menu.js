import rpc from './rpc';

/**
 * Menu API utilities
 * Handles fetching and organizing Tryton menu structure
 */

/**
 * Fetch the application menu from the server
 * @param {string} sessionId - Active session ID
 * @param {string} database - Database name
 * @returns {Promise<Array>} - Flat list of menu items
 */
export async function fetchMenu(sessionId, database) {
  try {
    // Fetch all menu items
    const menuItems = await rpc.searchRead(
      'ir.ui.menu',
      [], // Empty domain to get all menus
      0, // offset
      null, // limit (null = no limit)
      null, // order
      ['id', 'name', 'parent', 'icon', 'sequence', 'action'], // fields
      sessionId,
      database
    );

    return menuItems || [];
  } catch (error) {
    console.error('Failed to fetch menu:', error);
    throw error;
  }
}

/**
 * Build a hierarchical tree from a flat list of menu items
 * @param {Array} flatMenu - Flat list of menu items with parent references
 * @returns {Array} - Hierarchical tree structure
 */
export function buildMenuTree(flatMenu) {
  if (!flatMenu || flatMenu.length === 0) {
    return [];
  }

  // Create a map for quick lookup
  const menuMap = new Map();
  const rootItems = [];

  // First pass: Create menu map
  flatMenu.forEach((item) => {
    menuMap.set(item.id, {
      ...item,
      children: [],
      parentId: Array.isArray(item.parent) ? item.parent[0] : item.parent,
      parentName: Array.isArray(item.parent) ? item.parent[1] : null,
      actionId: Array.isArray(item.action) ? item.action[0] : item.action,
      actionType: Array.isArray(item.action) ? item.action[1] : null,
    });
  });

  // Second pass: Build tree structure
  menuMap.forEach((menuItem) => {
    if (menuItem.parentId) {
      // Has a parent - add to parent's children
      const parent = menuMap.get(menuItem.parentId);
      if (parent) {
        parent.children.push(menuItem);
      } else {
        // Parent not found, treat as root
        rootItems.push(menuItem);
      }
    } else {
      // No parent - it's a root item
      rootItems.push(menuItem);
    }
  });

  // Sort children by sequence
  const sortBySequence = (items) => {
    items.sort((a, b) => (a.sequence || 0) - (b.sequence || 0));
    items.forEach((item) => {
      if (item.children && item.children.length > 0) {
        sortBySequence(item.children);
      }
    });
  };

  sortBySequence(rootItems);

  return rootItems;
}

/**
 * Find a menu item by ID in the tree
 * @param {Array} menuTree - Menu tree structure
 * @param {number} id - Menu item ID to find
 * @returns {Object|null} - Found menu item or null
 */
export function findMenuItemById(menuTree, id) {
  for (const item of menuTree) {
    if (item.id === id) {
      return item;
    }
    if (item.children && item.children.length > 0) {
      const found = findMenuItemById(item.children, id);
      if (found) {
        return found;
      }
    }
  }
  return null;
}

/**
 * Get breadcrumb path for a menu item
 * @param {Array} menuTree - Menu tree structure
 * @param {number} id - Menu item ID
 * @returns {Array} - Array of menu items from root to target
 */
export function getMenuBreadcrumb(menuTree, id) {
  const path = [];

  const findPath = (items, targetId, currentPath) => {
    for (const item of items) {
      const newPath = [...currentPath, item];
      if (item.id === targetId) {
        return newPath;
      }
      if (item.children && item.children.length > 0) {
        const found = findPath(item.children, targetId, newPath);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  return findPath(menuTree, id, path) || [];
}

export default {
  fetchMenu,
  buildMenuTree,
  findMenuItemById,
  getMenuBreadcrumb,
};
