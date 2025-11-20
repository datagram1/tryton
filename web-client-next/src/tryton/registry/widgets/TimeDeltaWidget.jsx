import React, { useState, useEffect } from 'react';
import { Form, InputGroup } from 'react-bootstrap';

/**
 * TimeDeltaWidget - Duration/time difference input
 * Handles duration in format: days, hours, minutes, seconds
 * @param {Object} props
 * @param {string} props.name - Field name
 * @param {number} props.value - Current value (duration in seconds)
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.readonly - Readonly mode
 * @param {Object} props.field - Field metadata
 */
const TimeDeltaWidget = ({ name, value, onChange, readonly, field }) => {
  const [days, setDays] = useState(0);
  const [hours, setHours] = useState(0);
  const [minutes, setMinutes] = useState(0);
  const [seconds, setSeconds] = useState(0);

  // Convert seconds to days, hours, minutes, seconds
  useEffect(() => {
    if (value === null || value === undefined) {
      setDays(0);
      setHours(0);
      setMinutes(0);
      setSeconds(0);
      return;
    }

    const totalSeconds = parseInt(value);
    const d = Math.floor(totalSeconds / 86400);
    const h = Math.floor((totalSeconds % 86400) / 3600);
    const m = Math.floor((totalSeconds % 3600) / 60);
    const s = totalSeconds % 60;

    setDays(d);
    setHours(h);
    setMinutes(m);
    setSeconds(s);
  }, [value]);

  // Convert days, hours, minutes, seconds to total seconds
  const updateValue = (d, h, m, s) => {
    const totalSeconds = (d * 86400) + (h * 3600) + (m * 60) + s;
    onChange(name, totalSeconds);
  };

  // Format duration for display
  const formatDuration = () => {
    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (seconds > 0 || parts.length === 0) parts.push(`${seconds}s`);
    return parts.join(' ');
  };

  if (readonly) {
    return (
      <span className="form-control-plaintext">
        {formatDuration()}
      </span>
    );
  }

  return (
    <div className="d-flex gap-2 align-items-center flex-wrap">
      {/* Days */}
      <InputGroup size="sm" style={{ width: '100px' }}>
        <Form.Control
          type="number"
          min="0"
          value={days}
          onChange={(e) => {
            const val = Math.max(0, parseInt(e.target.value) || 0);
            setDays(val);
            updateValue(val, hours, minutes, seconds);
          }}
          placeholder="0"
        />
        <InputGroup.Text>d</InputGroup.Text>
      </InputGroup>

      {/* Hours */}
      <InputGroup size="sm" style={{ width: '100px' }}>
        <Form.Control
          type="number"
          min="0"
          max="23"
          value={hours}
          onChange={(e) => {
            const val = Math.max(0, Math.min(23, parseInt(e.target.value) || 0));
            setHours(val);
            updateValue(days, val, minutes, seconds);
          }}
          placeholder="0"
        />
        <InputGroup.Text>h</InputGroup.Text>
      </InputGroup>

      {/* Minutes */}
      <InputGroup size="sm" style={{ width: '100px' }}>
        <Form.Control
          type="number"
          min="0"
          max="59"
          value={minutes}
          onChange={(e) => {
            const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
            setMinutes(val);
            updateValue(days, hours, val, seconds);
          }}
          placeholder="0"
        />
        <InputGroup.Text>m</InputGroup.Text>
      </InputGroup>

      {/* Seconds */}
      <InputGroup size="sm" style={{ width: '100px' }}>
        <Form.Control
          type="number"
          min="0"
          max="59"
          value={seconds}
          onChange={(e) => {
            const val = Math.max(0, Math.min(59, parseInt(e.target.value) || 0));
            setSeconds(val);
            updateValue(days, hours, minutes, val);
          }}
          placeholder="0"
        />
        <InputGroup.Text>s</InputGroup.Text>
      </InputGroup>

      {/* Display formatted value */}
      <small className="text-muted">
        = {formatDuration()}
      </small>
    </div>
  );
};

export default TimeDeltaWidget;
