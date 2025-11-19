import React from 'react';
import Many2OneWidget from './Many2OneWidget';

/**
 * One2OneWidget - Single record selection for One2One relationships
 *
 * This widget behaves identically to Many2OneWidget but represents
 * a one-to-one relationship rather than many-to-one. The UI is the
 * same (autocomplete/lookup), but the semantic meaning is different.
 *
 * In Tryton, a One2One field is a special case of Many2One where
 * the relationship is constrained to be unique on the target side.
 *
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {Array|number} props.value - Current value [id, name] or just id
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata (must include 'relation' - the target model)
 *
 * Reference: /home/user/tryton/sao/src/view/form.js (One2One class)
 */
const One2OneWidget = (props) => {
  // One2One behaves exactly like Many2One from the UI perspective
  // It's just a semantic difference indicating a one-to-one relationship
  return <Many2OneWidget {...props} />;
};

export default One2OneWidget;
