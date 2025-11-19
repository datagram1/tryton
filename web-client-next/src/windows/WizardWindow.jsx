import React, { useState, useEffect } from 'react';
import { Modal, Button, Alert } from 'react-bootstrap';
import useSessionStore from '../store/session';
import WizardManager from '../tryton/wizard/WizardManager';
import TrytonViewRenderer from '../tryton/renderer/TrytonViewRenderer';

/**
 * WizardWindow Component
 * Modal dialog for displaying and interacting with Tryton wizards
 *
 * Based on Tryton SAO wizard.js (Wizard.Dialog class)
 * Reference: /home/user/tryton/sao/src/wizard.js:268-398
 */
const WizardWindow = ({
  action,
  data,
  context,
  show,
  onClose,
  onComplete
}) => {
  const { sessionId, database } = useSessionStore();

  const [wizard, setWizard] = useState(null);
  const [wizardState, setWizardState] = useState(null);
  const [formValues, setFormValues] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [modalSize, setModalSize] = useState('md');

  /**
   * Initialize wizard when component mounts
   */
  useEffect(() => {
    if (show && action && !wizard) {
      initializeWizard();
    }
  }, [show, action]);

  /**
   * Initialize the wizard manager and start the wizard
   */
  const initializeWizard = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('[WizardWindow] Initializing wizard:', action, data, context);

      // Create wizard manager
      const wizardManager = new WizardManager(action, data, context);

      // Set up event handlers
      wizardManager.onUpdate = handleWizardUpdate;
      wizardManager.onEnd = handleWizardEnd;
      wizardManager.onError = handleWizardError;

      // Start the wizard
      await wizardManager.start(sessionId, database);

      setWizard(wizardManager);
      setLoading(false);
    } catch (err) {
      console.error('[WizardWindow] Error initializing wizard:', err);
      setError(err.message || 'Failed to initialize wizard');
      setLoading(false);
    }
  };

  /**
   * Handle wizard view/button updates
   */
  const handleWizardUpdate = (state) => {
    console.log('[WizardWindow] Wizard updated:', state);

    setWizardState(state);

    // Set form values from defaults and values
    const initialValues = { ...state.defaults, ...state.values };
    setFormValues(initialValues);

    // Determine modal size based on view content
    // If view has expandable fields, use large modal
    const hasExpandableFields = checkForExpandableFields(state.view);
    setModalSize(hasExpandableFields ? 'lg' : 'md');
  };

  /**
   * Check if view has expandable fields (multi-line text, rich text, etc.)
   */
  const checkForExpandableFields = (view) => {
    if (!view || !view.arch) {
      return false;
    }

    // Simple heuristic: check for text fields or notebooks
    const archStr = JSON.stringify(view.arch);
    return archStr.includes('"type":"text"') ||
           archStr.includes('"tag":"notebook"') ||
           archStr.includes('"widget":"richtext"');
  };

  /**
   * Handle wizard completion
   */
  const handleWizardEnd = (serverAction) => {
    console.log('[WizardWindow] Wizard ended:', serverAction);

    // Close the modal
    handleClose();

    // Notify parent of completion
    if (onComplete) {
      onComplete(serverAction);
    }

    // Handle server actions
    if (serverAction === 'reload menu') {
      // TODO: Reload menu
      console.log('[WizardWindow] TODO: Reload menu');
    } else if (serverAction === 'reload context') {
      // TODO: Reload session context
      console.log('[WizardWindow] TODO: Reload context');
    }
  };

  /**
   * Handle wizard errors
   */
  const handleWizardError = (err) => {
    console.error('[WizardWindow] Wizard error:', err);
    setError(err.message || 'An error occurred');
  };

  /**
   * Handle form value changes
   */
  const handleFormChange = (fieldName, value) => {
    console.log('[WizardWindow] Form change:', fieldName, value);

    setFormValues(prev => ({
      ...prev,
      [fieldName]: value
    }));
  };

  /**
   * Handle button click
   */
  const handleButtonClick = async (button) => {
    console.log('[WizardWindow] Button clicked:', button);

    if (!wizard) {
      console.error('[WizardWindow] No wizard instance');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Check if this is the end/cancel button
      if (button.state === wizard.endState) {
        // Cancel the wizard
        await wizard.cancel(sessionId, database);
        handleClose();
        return;
      }

      // Respond to the wizard with the button and current form values
      await wizard.response(button, formValues, sessionId, database, button.validate);

      setLoading(false);
    } catch (err) {
      console.error('[WizardWindow] Error handling button click:', err);
      setError(err.message || 'Failed to process wizard action');
      setLoading(false);
    }
  };

  /**
   * Handle modal close
   */
  const handleClose = () => {
    // Clean up wizard if it exists
    if (wizard && wizard.sessionId) {
      wizard.cancel(sessionId, database).catch(err => {
        console.error('[WizardWindow] Error cancelling wizard:', err);
      });
    }

    setWizard(null);
    setWizardState(null);
    setFormValues({});
    setError(null);
    setLoading(true);

    if (onClose) {
      onClose();
    }
  };

  /**
   * Handle escape key to close modal
   */
  const handleKeyDown = (e) => {
    if (e.key === 'Escape' && wizardState && wizard) {
      // Find the end/cancel button
      const endButton = wizardState.buttons.find(
        btn => btn.state === wizard.endState
      );
      if (endButton) {
        handleButtonClick(endButton);
      }
    }
  };

  /**
   * Get button style based on button attributes
   */
  const getButtonStyle = (button) => {
    if (button.default) {
      return 'primary';
    } else if (button.state === wizard?.endState) {
      return 'link';
    }
    return 'secondary';
  };

  /**
   * Render wizard buttons
   */
  const renderButtons = () => {
    if (!wizardState || !wizardState.buttons) {
      return null;
    }

    return wizardState.buttons.map((button, index) => (
      <Button
        key={index}
        variant={getButtonStyle(button)}
        onClick={() => handleButtonClick(button)}
        disabled={loading}
      >
        {button.string || button.state}
      </Button>
    ));
  };

  return (
    <Modal
      show={show}
      onHide={handleClose}
      size={modalSize}
      backdrop="static"
      keyboard={true}
      onKeyDown={handleKeyDown}
      className="wizard-modal"
    >
      <Modal.Header closeButton>
        <Modal.Title>{action || 'Wizard'}</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {error && (
          <Alert variant="danger" onClose={() => setError(null)} dismissible>
            {error}
          </Alert>
        )}

        {loading && !wizardState && (
          <div className="text-center p-4">
            <div className="spinner-border" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="mt-2">Loading wizard...</p>
          </div>
        )}

        {wizardState && wizardState.view && (
          <div className="wizard-content">
            <TrytonViewRenderer
              view={wizardState.view}
              record={formValues}
              onChange={handleFormChange}
              mode="form"
            />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer>
        {renderButtons()}
      </Modal.Footer>
    </Modal>
  );
};

export default WizardWindow;
