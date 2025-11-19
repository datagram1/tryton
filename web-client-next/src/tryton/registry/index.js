/**
 * Tryton Widget Registry
 *
 * Maps Tryton field types to React components.
 * This registry is used by the TrytonViewRenderer to determine
 * which component to render for each field type.
 */

import CharWidget from './widgets/CharWidget';
import IntegerWidget from './widgets/IntegerWidget';
import FloatWidget from './widgets/FloatWidget';
import BooleanWidget from './widgets/BooleanWidget';
import DateWidget from './widgets/DateWidget';
import DateTimeWidget from './widgets/DateTimeWidget';
import SelectionWidget from './widgets/SelectionWidget';
import LabelWidget from './widgets/LabelWidget';
import Many2OneWidget from './widgets/Many2OneWidget';
import One2ManyWidget from './widgets/One2ManyWidget';
import Many2ManyWidget from './widgets/Many2ManyWidget';
import PasswordWidget from './widgets/PasswordWidget';
import TimeWidget from './widgets/TimeWidget';

// Widget registry mapping Tryton types to React components
const widgetRegistry = {
  // Text types
  char: CharWidget,
  text: CharWidget, // Multi-line text uses CharWidget with textarea
  password: PasswordWidget,

  // Numeric types
  integer: IntegerWidget,
  float: FloatWidget,
  numeric: FloatWidget,

  // Boolean
  boolean: BooleanWidget,

  // Date/Time types
  date: DateWidget,
  datetime: DateTimeWidget,
  time: TimeWidget,

  // Selection (dropdown)
  selection: SelectionWidget,

  // Relational fields
  many2one: Many2OneWidget,
  one2many: One2ManyWidget,
  many2many: Many2ManyWidget,

  // Layout widgets
  label: LabelWidget,
};

/**
 * Get the appropriate widget component for a field type
 * @param {string} fieldType - The Tryton field type
 * @returns {React.Component} The widget component
 */
export const getWidget = (fieldType) => {
  return widgetRegistry[fieldType] || CharWidget; // Default to CharWidget if type not found
};

/**
 * Register a custom widget for a specific field type
 * @param {string} fieldType - The Tryton field type
 * @param {React.Component} component - The widget component
 */
export const registerWidget = (fieldType, component) => {
  widgetRegistry[fieldType] = component;
};

/**
 * Check if a widget is registered for a field type
 * @param {string} fieldType - The Tryton field type
 * @returns {boolean}
 */
export const hasWidget = (fieldType) => {
  return fieldType in widgetRegistry;
};

export default widgetRegistry;
