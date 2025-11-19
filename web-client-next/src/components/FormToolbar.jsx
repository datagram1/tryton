import { Navbar, Container, Button, ButtonGroup } from 'react-bootstrap';
import { FaSave, FaTimes, FaPlus, FaTrash, FaUndo, FaRedo } from 'react-icons/fa';

/**
 * FormToolbar Component
 * Toolbar for form actions (Save, Cancel, etc.)
 */
function FormToolbar({ onSave, onCancel, isDirty, isSaving, onNew, onDelete }) {
  return (
    <Navbar bg="light" className="border-bottom py-2">
      <Container fluid>
        <ButtonGroup size="sm">
          <Button
            variant={isDirty ? 'primary' : 'outline-primary'}
            onClick={onSave}
            disabled={!isDirty || isSaving}
            title="Save (Ctrl+S)"
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
              title="New record"
            >
              <FaPlus />
            </Button>
          )}

          {onDelete && (
            <Button
              variant="outline-danger"
              onClick={onDelete}
              disabled={isSaving}
              title="Delete record"
            >
              <FaTrash />
            </Button>
          )}
        </ButtonGroup>
      </Container>
    </Navbar>
  );
}

export default FormToolbar;
