import { useEffect, useCallback, useRef } from 'react';

/**
 * Keyboard shortcut system for Tryton React UI
 * Provides a centralized way to register and handle keyboard shortcuts
 */

// Key code constants
export const KEYCODES = {
  ESC: 27,
  ENTER: 13,
  TAB: 9,
  SPACE: 32,
  UP: 38,
  DOWN: 40,
  LEFT: 37,
  RIGHT: 39,
  F1: 112,
  F2: 113,
  F3: 114,
  F4: 115,
  F5: 116,
  F6: 117,
  F7: 118,
  F8: 119,
  F9: 120,
  F10: 121,
  F11: 122,
  F12: 123,
};

/**
 * Parse a keyboard shortcut string into a normalized format
 * @param {string} shortcut - e.g., "Ctrl+S", "Alt+Shift+Tab", "F1"
 * @returns {Object} - { key, ctrlKey, altKey, shiftKey, metaKey }
 */
export function parseShortcut(shortcut) {
  const parts = shortcut.split('+').map(p => p.trim().toLowerCase());
  const result = {
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    metaKey: false,
    key: '',
  };

  parts.forEach(part => {
    if (part === 'ctrl' || part === 'control') {
      result.ctrlKey = true;
    } else if (part === 'alt') {
      result.altKey = true;
    } else if (part === 'shift') {
      result.shiftKey = true;
    } else if (part === 'meta' || part === 'cmd' || part === 'command') {
      result.metaKey = true;
    } else {
      result.key = part;
    }
  });

  return result;
}

/**
 * Check if an event matches a shortcut definition
 * @param {KeyboardEvent} event
 * @param {Object} shortcut - parsed shortcut object
 * @returns {boolean}
 */
export function matchesShortcut(event, shortcut) {
  const eventKey = event.key?.toLowerCase() || '';
  const shortcutKey = shortcut.key.toLowerCase();

  // Check if key matches
  const keyMatches = eventKey === shortcutKey ||
                     event.code?.toLowerCase() === shortcutKey ||
                     event.keyCode === KEYCODES[shortcut.key.toUpperCase()];

  if (!keyMatches) return false;

  // Check modifiers - on Mac, Cmd key is often used instead of Ctrl
  const ctrlOrMeta = (shortcut.ctrlKey && (event.ctrlKey || event.metaKey));
  const ctrlMatches = shortcut.ctrlKey ? ctrlOrMeta : !event.ctrlKey && !event.metaKey;
  const altMatches = shortcut.altKey === event.altKey;
  const shiftMatches = shortcut.shiftKey === event.shiftKey;

  return ctrlMatches && altMatches && shiftMatches;
}

/**
 * Custom hook to register keyboard shortcuts
 * @param {Object} shortcuts - Map of shortcut strings to handler functions
 * @param {Array} deps - Dependencies array for useEffect
 * @param {boolean} enabled - Whether shortcuts are enabled (default: true)
 * @param {string} scope - Optional scope identifier for debugging
 */
export function useKeyboardShortcuts(shortcuts = {}, deps = [], enabled = true, scope = 'global') {
  const shortcutsRef = useRef({});

  // Parse shortcuts once when they change
  useEffect(() => {
    const parsed = {};
    Object.entries(shortcuts).forEach(([shortcutStr, handler]) => {
      parsed[shortcutStr] = {
        ...parseShortcut(shortcutStr),
        handler,
        originalStr: shortcutStr,
      };
    });
    shortcutsRef.current = parsed;
  }, [shortcuts]);

  const handleKeyDown = useCallback((event) => {
    if (!enabled) return;

    // Don't trigger shortcuts when typing in input fields (unless it's Escape)
    const targetTag = event.target?.tagName?.toLowerCase();
    const isInput = ['input', 'textarea', 'select'].includes(targetTag);
    const isContentEditable = event.target?.isContentEditable;

    if ((isInput || isContentEditable) && event.key !== 'Escape' && event.keyCode !== KEYCODES.ESC) {
      // Allow certain shortcuts even in input fields
      const allowInInput = ['F1', 'Escape'];
      const shortcutKey = event.key;
      if (!allowInInput.includes(shortcutKey) && !(event.ctrlKey || event.metaKey)) {
        return;
      }
    }

    // Check each registered shortcut
    Object.values(shortcutsRef.current).forEach(shortcut => {
      if (matchesShortcut(event, shortcut)) {
        event.preventDefault();
        event.stopPropagation();

        // Call the handler
        try {
          shortcut.handler(event);
        } catch (error) {
          console.error(`Error in keyboard shortcut handler for ${shortcut.originalStr}:`, error);
        }
      }
    });
  }, [enabled]);

  useEffect(() => {
    if (!enabled) return;

    window.addEventListener('keydown', handleKeyDown, true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [handleKeyDown, enabled, ...deps]);
}

/**
 * Hook for registering shortcuts with cleanup
 * Useful for component-specific shortcuts that should be removed when component unmounts
 */
export function useComponentShortcuts(shortcuts, enabled = true) {
  useKeyboardShortcuts(shortcuts, [], enabled);
}

/**
 * Global shortcut registry for managing application-wide shortcuts
 */
class ShortcutRegistry {
  constructor() {
    this.shortcuts = new Map();
    this.listeners = new Set();
  }

  register(id, shortcut, handler, description = '') {
    this.shortcuts.set(id, {
      shortcut,
      handler,
      description,
      parsed: parseShortcut(shortcut),
    });
    this.notifyListeners();
  }

  unregister(id) {
    this.shortcuts.delete(id);
    this.notifyListeners();
  }

  getAll() {
    return Array.from(this.shortcuts.entries()).map(([id, data]) => ({
      id,
      ...data,
    }));
  }

  addListener(listener) {
    this.listeners.add(listener);
  }

  removeListener(listener) {
    this.listeners.delete(listener);
  }

  notifyListeners() {
    this.listeners.forEach(listener => listener(this.getAll()));
  }
}

export const shortcutRegistry = new ShortcutRegistry();

/**
 * Hook to access the global shortcut registry
 * Useful for displaying all available shortcuts
 */
export function useShortcutRegistry() {
  const [shortcuts, setShortcuts] = React.useState(shortcutRegistry.getAll());

  useEffect(() => {
    const listener = (updated) => setShortcuts(updated);
    shortcutRegistry.addListener(listener);
    return () => shortcutRegistry.removeListener(listener);
  }, []);

  return shortcuts;
}

export default useKeyboardShortcuts;
