import { create } from 'zustand';

/**
 * Tabs Store
 * Manages Multiple Document Interface (MDI) tabs
 */
const useTabsStore = create((set, get) => ({
  // State
  tabs: [],
  activeTabId: null,

  /**
   * Open a new tab
   * @param {Object} tab - Tab configuration
   * @param {string} tab.id - Unique tab identifier
   * @param {string} tab.title - Tab title
   * @param {string} tab.type - Tab type (e.g., 'form', 'list', 'graph')
   * @param {Object} tab.props - Additional props for the tab content
   */
  openTab: (tab) => {
    const { tabs, activeTabId } = get();

    // Check if tab already exists
    const existingTab = tabs.find((t) => t.id === tab.id);

    if (existingTab) {
      // Tab exists, just activate it
      set({ activeTabId: tab.id });
    } else {
      // Add new tab
      set({
        tabs: [...tabs, { ...tab, id: tab.id || `tab-${Date.now()}` }],
        activeTabId: tab.id,
      });
    }
  },

  /**
   * Close a tab
   * @param {string} tabId - Tab ID to close
   */
  closeTab: (tabId) => {
    const { tabs, activeTabId } = get();
    const tabIndex = tabs.findIndex((t) => t.id === tabId);

    if (tabIndex === -1) return;

    const newTabs = tabs.filter((t) => t.id !== tabId);

    // Determine new active tab
    let newActiveTabId = activeTabId;
    if (activeTabId === tabId) {
      // Closing active tab, switch to adjacent tab
      if (newTabs.length > 0) {
        const newIndex = Math.min(tabIndex, newTabs.length - 1);
        newActiveTabId = newTabs[newIndex].id;
      } else {
        newActiveTabId = null;
      }
    }

    set({
      tabs: newTabs,
      activeTabId: newActiveTabId,
    });
  },

  /**
   * Set active tab
   * @param {string} tabId - Tab ID to activate
   */
  setActiveTab: (tabId) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);

    if (tab) {
      set({ activeTabId: tabId });
    }
  },

  /**
   * Update tab properties
   * @param {string} tabId - Tab ID to update
   * @param {Object} updates - Properties to update
   */
  updateTab: (tabId, updates) => {
    set((state) => ({
      tabs: state.tabs.map((tab) =>
        tab.id === tabId ? { ...tab, ...updates } : tab
      ),
    }));
  },

  /**
   * Close all tabs
   */
  closeAllTabs: () => {
    set({
      tabs: [],
      activeTabId: null,
    });
  },

  /**
   * Close all tabs except the specified one
   * @param {string} tabId - Tab ID to keep open
   */
  closeOtherTabs: (tabId) => {
    const { tabs } = get();
    const tab = tabs.find((t) => t.id === tabId);

    if (tab) {
      set({
        tabs: [tab],
        activeTabId: tabId,
      });
    }
  },

  /**
   * Get active tab
   * @returns {Object|null} - Active tab or null
   */
  getActiveTab: () => {
    const { tabs, activeTabId } = get();
    return tabs.find((t) => t.id === activeTabId) || null;
  },
}));

export default useTabsStore;
