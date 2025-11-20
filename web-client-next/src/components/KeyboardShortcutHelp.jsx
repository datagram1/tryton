import React, { useState, useMemo } from 'react';
import { Modal, Button, Form, InputGroup } from 'react-bootstrap';

/**
 * Keyboard Shortcut Help Dialog
 * Displays all available keyboard shortcuts organized by category
 * Opens with F1 key
 */

// Default shortcuts that are always available
const DEFAULT_SHORTCUTS = [
  {
    category: 'General',
    shortcuts: [
      { keys: 'F1', description: 'Show keyboard shortcuts help' },
      { keys: 'Ctrl+S', description: 'Save current record' },
      { keys: 'Ctrl+N', description: 'Create new record' },
      { keys: 'Ctrl+R', description: 'Reload/Undo changes' },
      { keys: 'Escape', description: 'Cancel current operation' },
    ],
  },
  {
    category: 'Record Actions',
    shortcuts: [
      { keys: 'Ctrl+D', description: 'Delete current record' },
      { keys: 'Ctrl+Shift+D', description: 'Duplicate current record' },
      { keys: 'Ctrl+Up', description: 'Previous record' },
      { keys: 'Ctrl+Down', description: 'Next record' },
    ],
  },
  {
    category: 'View Actions',
    shortcuts: [
      { keys: 'Ctrl+L', description: 'Switch between form and list view' },
      { keys: 'Ctrl+F', description: 'Search/Filter' },
      { keys: 'Ctrl+K', description: 'Global search' },
    ],
  },
  {
    category: 'Advanced Actions',
    shortcuts: [
      { keys: 'Ctrl+P', description: 'Print/Generate report' },
      { keys: 'Ctrl+E', description: 'Open action menu' },
      { keys: 'Ctrl+Shift+T', description: 'Open attachments' },
      { keys: 'Ctrl+Shift+O', description: 'Open notes' },
      { keys: 'Ctrl+Shift+E', description: 'Send email' },
      { keys: 'Ctrl+Shift+R', description: 'View related records' },
    ],
  },
  {
    category: 'Tab Management',
    shortcuts: [
      { keys: 'Alt+Tab', description: 'Next tab' },
      { keys: 'Alt+Shift+Tab', description: 'Previous tab' },
      { keys: 'Alt+W', description: 'Close current tab' },
      { keys: 'Ctrl+Tab', description: 'Cycle through tabs' },
    ],
  },
];

function KeyboardShortcutHelp({ show, onHide, customShortcuts = [] }) {
  const [searchTerm, setSearchTerm] = useState('');

  // Combine default and custom shortcuts
  const allShortcuts = useMemo(() => {
    const combined = [...DEFAULT_SHORTCUTS];

    if (customShortcuts.length > 0) {
      const customCategory = {
        category: 'Custom',
        shortcuts: customShortcuts.map(sc => ({
          keys: sc.shortcut || sc.keys,
          description: sc.description || 'Custom shortcut',
        })),
      };
      combined.push(customCategory);
    }

    return combined;
  }, [customShortcuts]);

  // Filter shortcuts based on search term
  const filteredShortcuts = useMemo(() => {
    if (!searchTerm) return allShortcuts;

    const term = searchTerm.toLowerCase();
    return allShortcuts
      .map(category => ({
        ...category,
        shortcuts: category.shortcuts.filter(
          sc =>
            sc.keys.toLowerCase().includes(term) ||
            sc.description.toLowerCase().includes(term)
        ),
      }))
      .filter(category => category.shortcuts.length > 0);
  }, [allShortcuts, searchTerm]);

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleClearSearch = () => {
    setSearchTerm('');
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-keyboard me-2"></i>
          Keyboard Shortcuts
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="mb-3">
          <InputGroup>
            <InputGroup.Text>
              <i className="bi bi-search"></i>
            </InputGroup.Text>
            <Form.Control
              type="text"
              placeholder="Search shortcuts..."
              value={searchTerm}
              onChange={handleSearchChange}
              autoFocus
            />
            {searchTerm && (
              <Button variant="outline-secondary" onClick={handleClearSearch}>
                <i className="bi bi-x"></i>
              </Button>
            )}
          </InputGroup>
        </div>

        <div style={{ maxHeight: '500px', overflowY: 'auto' }}>
          {filteredShortcuts.length === 0 ? (
            <div className="text-center text-muted py-4">
              <i className="bi bi-search fs-1"></i>
              <p className="mt-2">No shortcuts found matching "{searchTerm}"</p>
            </div>
          ) : (
            filteredShortcuts.map((category, idx) => (
              <div key={idx} className="mb-4">
                <h5 className="text-primary border-bottom pb-2">
                  {category.category}
                </h5>
                <div className="list-group list-group-flush">
                  {category.shortcuts.map((shortcut, sIdx) => (
                    <div
                      key={sIdx}
                      className="list-group-item d-flex justify-content-between align-items-center border-0 px-0"
                    >
                      <span className="text-muted">{shortcut.description}</span>
                      <kbd className="bg-light text-dark border px-2 py-1">
                        {shortcut.keys}
                      </kbd>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>

        <div className="alert alert-info mt-3 mb-0">
          <i className="bi bi-info-circle me-2"></i>
          <small>
            <strong>Note:</strong> On Mac, use <kbd>Cmd</kbd> instead of <kbd>Ctrl</kbd> for most shortcuts.
            Some shortcuts may not be available in all contexts.
          </small>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default KeyboardShortcutHelp;
