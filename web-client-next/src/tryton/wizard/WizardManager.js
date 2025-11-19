/**
 * Wizard Manager
 * Handles multi-state wizard workflows in Tryton
 *
 * Based on Tryton SAO wizard.js implementation
 * Reference: /home/user/tryton/sao/src/wizard.js
 */

import rpc from '../../api/rpc';

/**
 * WizardManager class
 * Manages the state and execution of a multi-step wizard
 */
export class WizardManager {
  constructor(action, data, context) {
    this.action = action; // Wizard action name (e.g., 'party.party.replace')
    this.actionId = data?.action_id || null;
    this.id = data?.id || null; // Active record ID
    this.ids = data?.ids || []; // Active record IDs
    this.model = data?.model || null; // Active model
    this.context = { ...context };

    // Set active context variables
    this.context.active_id = this.id;
    this.context.active_ids = this.ids;
    this.context.active_model = this.model;
    this.context.action_id = this.actionId;

    // Wizard state
    this.sessionId = null; // Server-side wizard session ID
    this.state = null; // Current wizard state
    this.startState = null; // Initial state
    this.endState = null; // Terminal state
    this.screenState = null; // Current screen state name

    // View and buttons
    this.view = null; // Current view definition
    this.buttons = []; // Current state buttons
    this.values = {}; // Current form values
    this.defaults = {}; // Default values for current state

    // Flags
    this.processing = false;
    this.waitingResponse = false;

    // Callbacks
    this.onUpdate = null; // Called when view/buttons update
    this.onEnd = null; // Called when wizard completes
    this.onError = null; // Called on error
  }

  /**
   * Initialize and start the wizard
   * Calls wizard.{action}.create on the server
   */
  async start(sessionId, database) {
    try {
      console.log('[WizardManager] Starting wizard:', this.action);

      // Call wizard.{action}.create to initialize wizard session
      const result = await rpc.wizardCreate(
        this.action,
        this.context,
        sessionId,
        database
      );

      // Result: [session_id, start_state, end_state]
      this.sessionId = result[0];
      this.startState = result[1];
      this.state = result[1];
      this.endState = result[2];

      console.log('[WizardManager] Wizard created:', {
        sessionId: this.sessionId,
        startState: this.startState,
        endState: this.endState
      });

      // Process the first state
      await this.process(sessionId, database);

      return this.sessionId;
    } catch (error) {
      console.error('[WizardManager] Error starting wizard:', error);
      if (this.onError) {
        this.onError(error);
      }
      throw error;
    }
  }

  /**
   * Process the current wizard state
   * Calls wizard.{action}.execute on the server
   */
  async process(sessionId, database) {
    if (this.processing || this.waitingResponse) {
      console.log('[WizardManager] Already processing, skipping');
      return;
    }

    try {
      console.log('[WizardManager] Processing state:', this.state);

      // Check if we've reached the end state
      if (this.state === this.endState) {
        console.log('[WizardManager] Reached end state, finishing wizard');
        await this.end(sessionId, database);
        return;
      }

      this.processing = true;

      // Prepare data for current state
      const data = {};
      if (this.screenState) {
        data[this.screenState] = this.values;
      }

      // Call wizard.{action}.execute
      const result = await rpc.wizardExecute(
        this.action,
        this.sessionId,
        data,
        this.state,
        this.context,
        sessionId,
        database
      );

      console.log('[WizardManager] Execute result:', result);

      // Handle view update
      if (result.view) {
        this.view = result.view.fields_view;
        this.buttons = result.view.buttons || [];
        this.defaults = result.view.defaults || {};
        this.values = result.view.values || {};
        this.screenState = result.view.state;

        // Set waiting flag - we need user input
        this.waitingResponse = true;

        // Notify listeners that view has updated
        if (this.onUpdate) {
          this.onUpdate({
            view: this.view,
            buttons: this.buttons,
            defaults: this.defaults,
            values: this.values,
            state: this.screenState
          });
        }
      } else {
        // No view means we should proceed to end state
        this.state = this.endState;
        await this.process(sessionId, database);
      }

      // Handle actions (e.g., open windows, show messages)
      if (result.actions && result.actions.length > 0) {
        console.log('[WizardManager] Wizard returned actions:', result.actions);
        // TODO: Execute actions
        // For now, just log them
      }

      this.processing = false;
    } catch (error) {
      console.error('[WizardManager] Error processing wizard:', error);
      this.processing = false;

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Respond to a wizard button click
   * Validates current form and transitions to the button's target state
   */
  async response(buttonDef, formValues, sessionId, database, validate = true) {
    console.log('[WizardManager] Response to button:', buttonDef, formValues);

    this.waitingResponse = false;

    // Update values from form
    this.values = formValues || {};

    // TODO: Implement validation
    if (validate && buttonDef.validate) {
      // For now, skip validation - will be implemented with form validation system
      console.log('[WizardManager] Validation requested but not yet implemented');
    }

    // Transition to the button's target state
    this.state = buttonDef.state;

    // Process the new state
    await this.process(sessionId, database);
  }

  /**
   * End the wizard
   * Calls wizard.{action}.delete on the server
   */
  async end(sessionId, database) {
    try {
      console.log('[WizardManager] Ending wizard:', this.sessionId);

      const result = await rpc.wizardDelete(
        this.action,
        this.sessionId,
        this.context,
        sessionId,
        database
      );

      console.log('[WizardManager] Wizard ended, server action:', result);

      // Notify listeners that wizard has completed
      if (this.onEnd) {
        this.onEnd(result);
      }

      return result;
    } catch (error) {
      console.error('[WizardManager] Error ending wizard:', error);

      if (this.onError) {
        this.onError(error);
      }

      throw error;
    }
  }

  /**
   * Cancel and destroy the wizard
   */
  async cancel(sessionId, database) {
    try {
      console.log('[WizardManager] Cancelling wizard');

      // If we have a session, delete it on the server
      if (this.sessionId) {
        await rpc.wizardDelete(
          this.action,
          this.sessionId,
          this.context,
          sessionId,
          database
        );
      }

      // Notify listeners
      if (this.onEnd) {
        this.onEnd(null);
      }
    } catch (error) {
      console.error('[WizardManager] Error cancelling wizard:', error);

      if (this.onError) {
        this.onError(error);
      }
    }
  }

  /**
   * Update button states based on current record
   * This would typically check button attributes like 'readonly', 'invisible'
   */
  updateButtons(record) {
    // TODO: Implement dynamic button state evaluation
    // For now, return buttons as-is
    return this.buttons;
  }

  /**
   * Get the current wizard state
   */
  getState() {
    return {
      sessionId: this.sessionId,
      state: this.state,
      startState: this.startState,
      endState: this.endState,
      screenState: this.screenState,
      view: this.view,
      buttons: this.buttons,
      values: this.values,
      defaults: this.defaults,
      processing: this.processing,
      waitingResponse: this.waitingResponse
    };
  }
}

/**
 * Create and start a wizard
 * Factory function for creating wizard instances
 */
export async function createWizard(action, data, context, sessionId, database) {
  const wizard = new WizardManager(action, data, context);
  await wizard.start(sessionId, database);
  return wizard;
}

export default WizardManager;
