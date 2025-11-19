import { useState } from 'react';
import { Collapse } from 'react-bootstrap';
import './ExpanderComponent.css';

/**
 * ExpanderComponent - Collapsible section with expand/collapse
 *
 * A collapsible panel with a header and expandable content area.
 * Reference: /home/user/tryton/sao/src/view/form.js (Sao.View.Form.Expander)
 */
function ExpanderComponent({ title = '', children, defaultExpanded = false }) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="expander-component card mb-3">
      <div
        className="expander-header card-header"
        onClick={toggleExpanded}
        role="button"
        aria-expanded={isExpanded}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleExpanded();
          }
        }}
      >
        <div className="expander-title">
          <span className={`expander-arrow ${isExpanded ? 'expanded' : ''}`}>
            ▶
          </span>
          <span className="expander-label">{title}</span>
        </div>
      </div>
      <Collapse in={isExpanded}>
        <div className="expander-body card-body">
          {children}
        </div>
      </Collapse>
    </div>
  );
}

export default ExpanderComponent;
