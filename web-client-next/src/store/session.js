import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import rpc, { setAuthHeader, clearAuthHeader } from '../api/rpc';

/**
 * Session Store
 * Manages user authentication and session state
 */
const useSessionStore = create(
  persist(
    (set, get) => ({
      // State
      sessionId: null,
      userId: null,
      username: null,
      database: null,
      context: {
        company: null,
        language: 'en',
      },
      isAuthenticated: false,
      isLoading: false,
      error: null,

      /**
       * Login action - implements Tryton's challenge-response authentication
       * @param {string} database - Database name
       * @param {string} username - Username
       * @param {string} password - Password
       * @returns {Promise<boolean>} - Success status
       */
      login: async (database, username, password) => {
        set({ isLoading: true, error: null });

        try {
          // Step 1: Send username only to get challenge
          // Server will respond with LoginException asking for password
          try {
            await rpc.loginStep1(database, username, null, 'en');
            // If this succeeds without exception, server accepted it
            // (unusual, but handle it)
          } catch (err) {
            // Expected: LoginException asking for password
            if (err.code !== 'LoginException') {
              // Unexpected error, rethrow
              throw err;
            }
            // LoginException is expected here, continue to step 2
          }

          // Step 2: Send username + password to complete authentication
          const result = await rpc.loginStep2(database, username, password, null, 'en');

          if (result && result.length >= 2) {
            const [userId, sessionId, busUrlHost] = result;

            // Set authorization header for future requests
            setAuthHeader(username, userId, sessionId);

            // Store session data
            set({
              sessionId,
              userId,
              username,
              database,
              isAuthenticated: true,
              isLoading: false,
              error: null,
            });

            // Optionally fetch user context/preferences
            // TODO: Re-enable once model RPC methods are fully working
            // try {
            //   const userContext = await rpc.model(
            //     'res.user',
            //     'get_preferences',
            //     [true],
            //     sessionId,
            //     database
            //   );

            //   set((state) => ({
            //     context: {
            //       ...state.context,
            //       ...userContext,
            //     },
            //   }));
            // } catch (contextError) {
            //   console.warn('Failed to fetch user context:', contextError);
            //   // Non-critical error, continue with login
            // }

            return true;
          } else {
            throw new Error('Invalid login response');
          }
        } catch (error) {
          clearAuthHeader();
          set({
            isLoading: false,
            error: error.message || 'Login failed',
            isAuthenticated: false,
            sessionId: null,
            userId: null,
          });

          console.error('Login error:', error);
          return false;
        }
      },

      /**
       * Logout action
       * Clears session data and notifies server
       */
      logout: async () => {
        const { sessionId, database } = get();

        if (sessionId && database) {
          try {
            await rpc.logout(sessionId, database);
          } catch (error) {
            console.warn('Logout RPC failed:', error);
            // Continue with local logout even if server call fails
          }
        }

        // Clear authorization header
        clearAuthHeader();

        // Clear session state
        set({
          sessionId: null,
          userId: null,
          username: null,
          database: null,
          context: {
            company: null,
            language: 'en',
          },
          isAuthenticated: false,
          isLoading: false,
          error: null,
        });
      },

      /**
       * Update context
       * @param {object} newContext - Context updates
       */
      updateContext: (newContext) => {
        set((state) => ({
          context: {
            ...state.context,
            ...newContext,
          },
        }));
      },

      /**
       * Clear error
       */
      clearError: () => {
        set({ error: null });
      },

      /**
       * Set loading state
       */
      setLoading: (isLoading) => {
        set({ isLoading });
      },
    }),
    {
      name: 'tryton-session', // Key for localStorage
      partialize: (state) => ({
        // Only persist these fields
        sessionId: state.sessionId,
        userId: state.userId,
        username: state.username,
        database: state.database,
        context: state.context,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export default useSessionStore;
