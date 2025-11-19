import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import rpc from '../api/rpc';

/**
 * Preferences Store
 * Manages user preferences and settings
 */
const usePreferencesStore = create(
  persist(
    (set, get) => ({
      // State
      language: 'en',
      dateFormat: '%Y-%m-%d',
      timeFormat: '%H:%M:%S',
      numberFormat: '.',
      thousandsSeparator: ',',
      locale: 'en_US',
      theme: 'light',
      customColors: {
        primary: '#0d6efd',
        secondary: '#6c757d',
        success: '#198754',
        danger: '#dc3545',
        warning: '#ffc107',
        info: '#0dcaf0',
      },
      isLoading: false,
      error: null,

      /**
       * Load preferences from server
       * @param {string} sessionId - Session ID
       * @param {string} database - Database name
       * @returns {Promise<void>}
       */
      loadPreferences: async (sessionId, database) => {
        set({ isLoading: true, error: null });

        try {
          // Call res.user.get_preferences method
          const preferences = await rpc.model(
            'res.user',
            'get_preferences',
            [true],
            sessionId,
            database
          );

          console.log('[PreferencesStore] Loaded preferences:', preferences);

          // Update state with server preferences
          set({
            language: preferences.language || 'en',
            locale: preferences.locale || 'en_US',
            // Map other preferences if available
            isLoading: false,
          });
        } catch (error) {
          console.error('[PreferencesStore] Failed to load preferences:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to load preferences',
          });
        }
      },

      /**
       * Save preferences to server
       * @param {Object} newPreferences - Preferences to save
       * @param {number} userId - User ID
       * @param {string} sessionId - Session ID
       * @param {string} database - Database name
       * @returns {Promise<boolean>}
       */
      savePreferences: async (newPreferences, userId, sessionId, database) => {
        set({ isLoading: true, error: null });

        try {
          // Call res.user.write to update preferences
          await rpc.write(
            'res.user',
            [userId],
            newPreferences,
            sessionId,
            database
          );

          console.log('[PreferencesStore] Saved preferences:', newPreferences);

          // Update local state
          set({
            ...newPreferences,
            isLoading: false,
          });

          return true;
        } catch (error) {
          console.error('[PreferencesStore] Failed to save preferences:', error);
          set({
            isLoading: false,
            error: error.message || 'Failed to save preferences',
          });
          return false;
        }
      },

      /**
       * Update local preferences (without saving to server)
       * @param {Object} newPreferences - Preferences to update
       */
      updatePreferences: (newPreferences) => {
        set((state) => ({
          ...state,
          ...newPreferences,
        }));
      },

      /**
       * Update theme
       * @param {string} theme - Theme name ('light' or 'dark')
       */
      setTheme: (theme) => {
        set({ theme });

        // Update document body class for theme
        if (typeof document !== 'undefined') {
          document.body.setAttribute('data-bs-theme', theme);
        }
      },

      /**
       * Update custom colors
       * @param {Object} colors - Custom color overrides
       */
      updateColors: (colors) => {
        set((state) => ({
          customColors: {
            ...state.customColors,
            ...colors,
          },
        }));
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'tryton-preferences', // Key for localStorage
      partialize: (state) => ({
        // Persist these fields
        language: state.language,
        dateFormat: state.dateFormat,
        timeFormat: state.timeFormat,
        numberFormat: state.numberFormat,
        thousandsSeparator: state.thousandsSeparator,
        locale: state.locale,
        theme: state.theme,
        customColors: state.customColors,
      }),
    }
  )
);

export default usePreferencesStore;
