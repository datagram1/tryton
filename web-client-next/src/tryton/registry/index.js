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
import One2OneWidget from './widgets/One2OneWidget';
import One2ManyWidget from './widgets/One2ManyWidget';
import Many2ManyWidget from './widgets/Many2ManyWidget';
import PasswordWidget from './widgets/PasswordWidget';
import TimeWidget from './widgets/TimeWidget';
import URLWidget from './widgets/URLWidget';
import EmailWidget from './widgets/EmailWidget';
import ColorWidget from './widgets/ColorWidget';
import CallToWidget from './widgets/CallToWidget';
import NumericWidget from './widgets/NumericWidget';
import MultiSelectionWidget from './widgets/MultiSelectionWidget';
import BinaryWidget from './widgets/BinaryWidget';
import ImageWidget from './widgets/ImageWidget';
import HTMLWidget from './widgets/HTMLWidget';
import ProgressBarWidget from './widgets/ProgressBarWidget';
import TimeDeltaWidget from './widgets/TimeDeltaWidget';
import ReferenceWidget from './widgets/ReferenceWidget';
import DocumentWidget from './widgets/DocumentWidget';

// Widget registry mapping Tryton types to React components
const widgetRegistry = {
  // Text types
  char: CharWidget,
  text: CharWidget, // Multi-line text uses CharWidget with textarea
  password: PasswordWidget,

  // Numeric types
  integer: IntegerWidget,
  float: FloatWidget,
  numeric: NumericWidget, // Arbitrary precision decimals

  // Boolean
  boolean: BooleanWidget,

  // Date/Time types
  date: DateWidget,
  datetime: DateTimeWidget,
  time: TimeWidget,
  timedelta: TimeDeltaWidget, // Duration/time difference

  // Selection (dropdown)
  selection: SelectionWidget,
  multiselection: MultiSelectionWidget, // Multiple selection with tags

  // Relational fields
  many2one: Many2OneWidget,
  one2one: One2OneWidget, // One-to-one relationship
  one2many: One2ManyWidget,
  many2many: Many2ManyWidget,
  reference: ReferenceWidget, // Dynamic model reference

  // Link/Contact widgets
  url: URLWidget,
  email: EmailWidget,
  callto: CallToWidget,

  // Visual widgets
  color: ColorWidget,

  // Binary/Media widgets
  binary: BinaryWidget, // File upload/download
  image: ImageWidget, // Image upload with preview
  document: DocumentWidget, // Document upload with PDF preview

  // Special/Display widgets
  html: HTMLWidget, // HTML content display (read-only)
  progressbar: ProgressBarWidget, // Progress bar display (read-only)

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
