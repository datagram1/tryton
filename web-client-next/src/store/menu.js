import { create } from 'zustand';
import { fetchMenu, buildMenuTree } from '../api/menu';

/**
 * Menu Store
 * Manages application menu state
 */
const useMenuStore = create((set, get) => ({
  // State
  menuTree: [],
  flatMenu: [],
  isLoading: false,
  error: null,
  selectedMenuId: null,

  /**
   * Load the menu from the server
   * @param {string} sessionId - Active session ID
   * @param {string} database - Database name
   */
  loadMenu: async (sessionId, database) => {
    set({ isLoading: true, error: null });

    try {
      const flatMenu = await fetchMenu(sessionId, database);
      const menuTree = buildMenuTree(flatMenu);

      set({
        flatMenu,
        menuTree,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        isLoading: false,
        error: error.message || 'Failed to load menu',
      });
      console.error('Menu load error:', error);
    }
  },

  /**
   * Set the selected menu item
   * @param {number} menuId - Menu item ID
   */
  selectMenuItem: (menuId) => {
    set({ selectedMenuId: menuId });
  },

  /**
   * Clear the menu
   */
  clearMenu: () => {
    set({
      menuTree: [],
      flatMenu: [],
      selectedMenuId: null,
      error: null,
    });
  },

  /**
   * Refresh the menu
   * @param {string} sessionId - Active session ID
   * @param {string} database - Database name
   */
  refreshMenu: async (sessionId, database) => {
    await get().loadMenu(sessionId, database);
  },
}));

export default useMenuStore;
