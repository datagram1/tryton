import { useState, useEffect, useRef } from 'react';
import './PanedComponent.css';

/**
 * PanedComponent - Splittable panes with draggable divider
 *
 * Supports both horizontal and vertical orientation with resizable panels.
 * Reference: /home/user/tryton/sao/src/common.js (Sao.common.Paned)
 */
function PanedComponent({ orientation = 'horizontal', children, defaultPosition = 50 }) {
  const [position, setPosition] = useState(defaultPosition); // percentage
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef(null);

  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDragging || !containerRef.current) return;

      const rect = containerRef.current.getBoundingClientRect();

      let newPosition;
      if (orientation === 'horizontal') {
        const x = e.clientX - rect.left;
        newPosition = (x / rect.width) * 100;
      } else {
        const y = e.clientY - rect.top;
        newPosition = (y / rect.height) * 100;
      }

      // Limit position between 10% and 90%
      newPosition = Math.max(10, Math.min(90, newPosition));
      setPosition(newPosition);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, orientation]);

  const childArray = Array.isArray(children) ? children : [children];
  const child1 = childArray[0] || null;
  const child2 = childArray[1] || null;

  if (orientation === 'horizontal') {
    return (
      <div className="paned-container paned-horizontal" ref={containerRef}>
        <div
          className="paned-child paned-child1"
          style={{ width: `${position}%` }}
        >
          {child1}
        </div>
        <div
          className="paned-divider paned-divider-vertical"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="vertical"
        >
          <div className="paned-divider-handle"></div>
        </div>
        <div
          className="paned-child paned-child2"
          style={{ width: `${100 - position}%` }}
        >
          {child2}
        </div>
      </div>
    );
  } else {
    return (
      <div className="paned-container paned-vertical" ref={containerRef}>
        <div
          className="paned-child paned-child1"
          style={{ height: `${position}%` }}
        >
          {child1}
        </div>
        <div
          className="paned-divider paned-divider-horizontal"
          onMouseDown={handleMouseDown}
          role="separator"
          aria-orientation="horizontal"
        >
          <div className="paned-divider-handle"></div>
        </div>
        <div
          className="paned-child paned-child2"
          style={{ height: `${100 - position}%` }}
        >
          {child2}
        </div>
      </div>
    );
  }
}

export default PanedComponent;
