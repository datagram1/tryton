import { useState } from 'react';
import { Nav, Accordion } from 'react-bootstrap';
import { FiFolder, FiFile, FiChevronRight, FiChevronDown } from 'react-icons/fi';

/**
 * Recursive Menu Item Component
 * Renders a menu item and its children
 */
function MenuItem({ item, level = 0, onMenuClick }) {
  const [isOpen, setIsOpen] = useState(false);
  const hasChildren = item.children && item.children.length > 0;
  const isAction = !hasChildren && item.actionId;

  const handleClick = () => {
    if (hasChildren) {
      setIsOpen(!isOpen);
    } else if (isAction) {
      onMenuClick(item);
    }
  };

  const paddingLeft = `${level * 1.25 + 0.75}rem`;

  return (
    <>
      <Nav.Link
        onClick={handleClick}
        className="d-flex align-items-center py-2 text-dark border-bottom"
        style={{
          paddingLeft,
          cursor: 'pointer',
          backgroundColor: isOpen ? '#f8f9fa' : 'transparent',
        }}
      >
        {hasChildren && (
          <span className="me-2" style={{ width: '1rem' }}>
            {isOpen ? <FiChevronDown size={14} /> : <FiChevronRight size={14} />}
          </span>
        )}
        {!hasChildren && <span className="me-2" style={{ width: '1rem' }} />}

        <span className="me-2">
          {hasChildren ? <FiFolder size={16} /> : <FiFile size={16} />}
        </span>

        <span className="flex-grow-1">{item.name}</span>
      </Nav.Link>

      {hasChildren && isOpen && (
        <div>
          {item.children.map((child) => (
            <MenuItem
              key={child.id}
              item={child}
              level={level + 1}
              onMenuClick={onMenuClick}
            />
          ))}
        </div>
      )}
    </>
  );
}

/**
 * Sidebar Component
 * Displays the application menu in a collapsible navigation tree
 */
function Sidebar({ menuTree, onMenuClick, className = '' }) {
  if (!menuTree || menuTree.length === 0) {
    return (
      <div className={`bg-white border-end ${className}`}>
        <div className="p-3 text-muted text-center">
          <small>No menu items available</small>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white border-end overflow-auto ${className}`}>
      <div className="p-3 border-bottom">
        <h6 className="mb-0 fw-bold">Menu</h6>
      </div>

      <Nav className="flex-column">
        {menuTree.map((item) => (
          <MenuItem key={item.id} item={item} onMenuClick={onMenuClick} />
        ))}
      </Nav>
    </div>
  );
}

export default Sidebar;
