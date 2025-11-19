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

// Widget registry mapping Tryton types to React components
const widgetRegistry = {
  // Text types
  char: CharWidget,
  text: CharWidget, // Multi-line text uses same widget for now

  // Numeric types
  integer: IntegerWidget,
  float: FloatWidget,
  numeric: FloatWidget,

  // Boolean
  boolean: BooleanWidget,

  // Date/Time types
  date: DateWidget,
  datetime: DateTimeWidget,
  time: DateTimeWidget, // Time fields can use datetime widget

  // Selection (dropdown)
  selection: SelectionWidget,

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
