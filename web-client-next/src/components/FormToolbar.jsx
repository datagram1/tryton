import { Navbar, Container, Button, ButtonGroup, Badge } from 'react-bootstrap';
import {
  FaSave,
  FaTimes,
  FaPlus,
  FaTrash,
  FaUndo,
  FaCopy,
  FaList,
  FaChevronUp,
  FaChevronDown,
  FaPaperclip
} from 'react-icons/fa';

/**
 * FormToolbar Component
 * Toolbar for form actions (Save, Cancel, etc.)
 */
function FormToolbar({
  onSave,
  onCancel,
  isDirty,
  isSaving,
  hasErrors = false,
  onNew,
  onDelete,
  onDuplicate,
  onReload,
  onSwitchView,
  onPrevious,
  onNext,
  onAttachments,
  attachmentCount = 0,
  hasRecord = false
}) {
  return (
    <Navbar bg="light" className="border-bottom py-2">
      <Container fluid>
        <ButtonGroup size="sm">
          <Button
            variant={isDirty ? 'primary' : 'outline-primary'}
            onClick={onSave}
            disabled={!isDirty || isSaving || hasErrors}
            title={hasErrors ? 'Fix validation errors before saving' : 'Save (Ctrl+S)'}
          >
            <FaSave className="me-1" />
            {isSaving ? 'Saving...' : 'Save'}
          </Button>

          <Button
            variant="outline-secondary"
            onClick={onCancel}
            disabled={!isDirty || isSaving}
            title="Cancel changes"
          >
            <FaTimes className="me-1" />
            Cancel
          </Button>
        </ButtonGroup>

        <ButtonGroup size="sm" className="ms-2">
          {onNew && (
            <Button
              variant="outline-success"
              onClick={onNew}
              disabled={isSaving}
              title="New record (Ctrl+N)"
            >
              <FaPlus className="me-1" />
              New
            </Button>
          )}

          {onDelete && hasRecord && (
            <Button
              variant="outline-danger"
              onClick={onDelete}
              disabled={isSaving}
              title="Delete record (Ctrl+D)"
            >
              <FaTrash className="me-1" />
              Delete
            </Button>
          )}

          {onDuplicate && hasRecord && (
            <Button
              variant="outline-secondary"
              onClick={onDuplicate}
              disabled={isSaving}
              title="Duplicate record (Ctrl+Shift+D)"
            >
              <FaCopy className="me-1" />
              Duplicate
            </Button>
          )}

          {onReload && (
            <Button
              variant="outline-secondary"
              onClick={onReload}
              disabled={isSaving}
              title="Reload record (Ctrl+R)"
            >
              <FaUndo className="me-1" />
              Reload
            </Button>
          )}
        </ButtonGroup>

        <ButtonGroup size="sm" className="ms-2">
          {onSwitchView && (
            <Button
              variant="outline-secondary"
              onClick={onSwitchView}
              disabled={isSaving}
              title="Switch to list view (Ctrl+L)"
            >
              <FaList className="me-1" />
              List
            </Button>
          )}

          {onPrevious && (
            <Button
              variant="outline-secondary"
              onClick={onPrevious}
              disabled={isSaving}
              title="Previous record (Ctrl+Up)"
            >
              <FaChevronUp />
            </Button>
          )}

          {onNext && (
            <Button
              variant="outline-secondary"
              onClick={onNext}
              disabled={isSaving}
              title="Next record (Ctrl+Down)"
            >
              <FaChevronDown />
            </Button>
          )}
        </ButtonGroup>

        {onAttachments && hasRecord && (
          <ButtonGroup size="sm" className="ms-2">
            <Button
              variant="outline-info"
              onClick={onAttachments}
              disabled={isSaving}
              title="Manage attachments (Ctrl+Shift+T)"
            >
              <FaPaperclip className="me-1" />
              Attachments
              {attachmentCount > 0 && (
                <Badge bg="danger" className="ms-2">{attachmentCount}</Badge>
              )}
            </Button>
          </ButtonGroup>
        )}
      </Container>
    </Navbar>
  );
}

export default FormToolbar;
