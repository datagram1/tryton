import React from 'react';
import { ProgressBar } from 'react-bootstrap';

/**
 * ProgressBarWidget - Display progress bar (read-only)
 * Shows a visual progress bar based on numeric value
 *
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {number} props.value - Current value (0-100 for percentage, or absolute value)
 * @param {Function} props.onChange - Change handler (not used - read-only widget)
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const ProgressBarWidget = ({ name, value, onChange, readonly, field }) => {
  // Parse numeric value
  const numericValue = parseFloat(value) || 0;

  // Determine if we're showing percentage or absolute value
  // If field has a max value, calculate percentage
  const maxValue = field?.max || 100;
  const percentage = field?.max ? (numericValue / maxValue) * 100 : numericValue;

  // Clamp percentage between 0 and 100
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Determine color variant based on value
  const getVariant = (pct) => {
    if (pct >= 100) return 'success';
    if (pct >= 75) return 'info';
    if (pct >= 50) return 'primary';
    if (pct >= 25) return 'warning';
    return 'danger';
  };

  const variant = getVariant(clampedPercentage);

  // Format label
  const label = field?.max
    ? `${numericValue} / ${maxValue}`
    : `${Math.round(clampedPercentage)}%`;

  // ProgressBar is always read-only
  return (
    <div className="progress-bar-widget">
      <ProgressBar
        now={clampedPercentage}
        label={label}
        variant={variant}
        style={{ minHeight: '1.5rem' }}
      />
      {field?.help && (
        <small className="text-muted d-block mt-1">
          {field.help}
        </small>
      )}
    </div>
  );
};

export default ProgressBarWidget;
