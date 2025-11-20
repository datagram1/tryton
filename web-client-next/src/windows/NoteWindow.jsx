import React, { useState, useEffect, useCallback } from 'react';
import { Modal, Button, Table, Alert, Form, Badge, Spinner } from 'react-bootstrap';
import { FaPlus, FaEdit, FaTrash, FaTimes, FaStickyNote } from 'react-icons/fa';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * NoteWindow - Modal window for managing record notes
 *
 * @param {Object} props
 * @param {boolean} props.show - Whether window is visible
 * @param {Function} props.onHide - Callback when window closes
 * @param {string} props.modelName - Model name of the record
 * @param {number} props.recordId - Record ID
 * @param {string} props.recordName - Record name for display
 */
const NoteWindow = ({
  show,
  onHide,
  modelName,
  recordId,
  recordName = '',
}) => {
  const { sessionId, database } = useSessionStore();
  const [notes, setNotes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState(null);
  const [editingNote, setEditingNote] = useState(null);
  const [noteText, setNoteText] = useState('');

  /**
   * Load notes for the current record
   */
  const loadNotes = useCallback(async () => {
    if (!modelName || !recordId) return;

    try {
      setIsLoading(true);
      setError(null);

      // Search for notes on this record
      // Domain: [['resource', '=', 'model.name,id']]
      const resource = `${modelName},${recordId}`;
      const noteIds = await rpc.search(
        'ir.note',
        [['resource', '=', resource]],
        0,
        null,
        [['write_date', 'DESC']],
        sessionId,
        database
      );

      if (noteIds && noteIds.length > 0) {
        // Read note data
        const noteData = await rpc.read(
          'ir.note',
          noteIds,
          ['message', 'unread', 'write_date', 'write_uid'],
          sessionId,
          database
        );
        setNotes(noteData || []);
      } else {
        setNotes([]);
      }

      setIsLoading(false);
    } catch (err) {
      console.error('Error loading notes:', err);
      setError(err.message || 'Failed to load notes');
      setIsLoading(false);
    }
  }, [modelName, recordId, sessionId, database]);

  /**
   * Load notes when window opens
   */
  useEffect(() => {
    if (show && modelName && recordId) {
      loadNotes();
    }
  }, [show, modelName, recordId, loadNotes]);

  /**
   * Handle add new note
   */
  const handleAddNote = () => {
    setEditingNote(null);
    setNoteText('');
  };

  /**
   * Handle edit note
   */
  const handleEditNote = (note) => {
    setEditingNote(note);
    setNoteText(note.message || '');
  };

  /**
   * Handle save note
   */
  const handleSaveNote = async () => {
    if (!noteText.trim()) {
      setError('Note message cannot be empty');
      return;
    }

    try {
      setIsSaving(true);
      setError(null);

      const resource = `${modelName},${recordId}`;

      if (editingNote) {
        // Update existing note
        await rpc.write(
          'ir.note',
          [editingNote.id],
          { message: noteText },
          sessionId,
          database
        );
      } else {
        // Create new note
        await rpc.create(
          'ir.note',
          [{
            message: noteText,
            resource: resource,
          }],
          sessionId,
          database
        );
      }

      // Clear form and reload
      setNoteText('');
      setEditingNote(null);
      await loadNotes();
      setIsSaving(false);
    } catch (err) {
      console.error('Error saving note:', err);
      setError(err.message || 'Failed to save note');
      setIsSaving(false);
    }
  };

  /**
   * Handle cancel edit
   */
  const handleCancelEdit = () => {
    setEditingNote(null);
    setNoteText('');
    setError(null);
  };

  /**
   * Handle delete note
   */
  const handleDeleteNote = async (noteId) => {
    if (!confirm('Are you sure you want to delete this note?')) {
      return;
    }

    try {
      setError(null);

      await rpc.delete(
        'ir.note',
        [noteId],
        sessionId,
        database
      );

      // Reload notes
      await loadNotes();
    } catch (err) {
      console.error('Error deleting note:', err);
      setError(err.message || 'Failed to delete note');
    }
  };

  /**
   * Handle mark as read
   */
  const handleMarkAsRead = async (noteId) => {
    try {
      setError(null);

      await rpc.write(
        'ir.note',
        [noteId],
        { unread: false },
        sessionId,
        database
      );

      // Reload notes
      await loadNotes();
    } catch (err) {
      console.error('Error marking note as read:', err);
      setError(err.message || 'Failed to mark note as read');
    }
  };

  /**
   * Format date
   */
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString();
  };

  /**
   * Count unread notes
   */
  const unreadCount = notes.filter(note => note.unread).length;

  return (
    <Modal show={show} onHide={onHide} size="lg">
      <Modal.Header closeButton>
        <Modal.Title>
          Notes {recordName && `- ${recordName}`}
          {notes.length > 0 && (
            <>
              <Badge bg="secondary" className="ms-2">{notes.length}</Badge>
              {unreadCount > 0 && (
                <Badge bg="danger" className="ms-1">{unreadCount} unread</Badge>
              )}
            </>
          )}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {/* Error Alert */}
        {error && (
          <Alert variant="danger" dismissible onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Note Editor */}
        <div className="mb-3">
          <Form.Group>
            <Form.Label>
              {editingNote ? 'Edit Note' : 'Add New Note'}
            </Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Enter note message..."
              disabled={isSaving}
            />
          </Form.Group>
          <div className="mt-2">
            <Button
              size="sm"
              variant="primary"
              onClick={handleSaveNote}
              disabled={isSaving || !noteText.trim()}
              className="me-2"
            >
              {isSaving ? (
                <>
                  <Spinner animation="border" size="sm" className="me-1" />
                  Saving...
                </>
              ) : (
                <>
                  <FaPlus className="me-1" />
                  {editingNote ? 'Update' : 'Add'} Note
                </>
              )}
            </Button>
            {editingNote && (
              <Button
                size="sm"
                variant="secondary"
                onClick={handleCancelEdit}
                disabled={isSaving}
              >
                <FaTimes className="me-1" />
                Cancel
              </Button>
            )}
          </div>
        </div>

        <hr />

        {/* Loading State */}
        {isLoading && (
          <div className="text-center p-3">
            <Spinner animation="border" role="status">
              <span className="visually-hidden">Loading...</span>
            </Spinner>
          </div>
        )}

        {/* Notes List */}
        {!isLoading && notes.length > 0 && (
          <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
            {notes.map(note => (
              <div
                key={note.id}
                className={`border rounded p-3 mb-2 ${note.unread ? 'border-primary bg-light' : ''}`}
              >
                <div className="d-flex justify-content-between align-items-start">
                  <div className="flex-grow-1">
                    <div className="d-flex align-items-center mb-1">
                      <FaStickyNote className={`me-2 ${note.unread ? 'text-primary' : 'text-secondary'}`} />
                      <small className="text-muted">
                        {formatDate(note.write_date)}
                        {Array.isArray(note.write_uid) && note.write_uid.length > 1 && (
                          <> by {note.write_uid[1]}</>
                        )}
                      </small>
                      {note.unread && (
                        <Badge bg="primary" className="ms-2">Unread</Badge>
                      )}
                    </div>
                    <div style={{ whiteSpace: 'pre-wrap' }}>{note.message}</div>
                  </div>
                  <div className="ms-3">
                    {note.unread && (
                      <Button
                        size="sm"
                        variant="outline-primary"
                        onClick={() => handleMarkAsRead(note.id)}
                        className="me-1"
                        title="Mark as read"
                      >
                        ✓
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() => handleEditNote(note)}
                      className="me-1"
                      title="Edit"
                    >
                      <FaEdit />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => handleDeleteNote(note.id)}
                      title="Delete"
                    >
                      <FaTrash />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* No Notes */}
        {!isLoading && notes.length === 0 && (
          <Alert variant="info">
            No notes found. Add a new note using the form above.
          </Alert>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-1" />
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default NoteWindow;
