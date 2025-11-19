import { useEffect, useState } from 'react';
import { Navbar, Container, Dropdown, Spinner } from 'react-bootstrap';
import { FiMenu, FiUser, FiLogOut } from 'react-icons/fi';
import Sidebar from './Sidebar';
import TabManager from './TabManager';
import useSessionStore from '../store/session';
import useMenuStore from '../store/menu';
import useTabsStore from '../store/tabs';

/**
 * MainLayout Component
 * Application shell with navigation, sidebar, and content area
 */
function MainLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const { username, logout, sessionId, database } = useSessionStore();
  const { menuTree, isLoading, loadMenu, error } = useMenuStore();
  const { openTab } = useTabsStore();

  // Load menu on mount
  useEffect(() => {
    if (sessionId && database && menuTree.length === 0) {
      loadMenu(sessionId, database);
    }
  }, [sessionId, database, loadMenu, menuTree.length]);

  const handleMenuClick = (menuItem) => {
    // When a menu item is clicked, open a new tab
    if (menuItem.actionId) {
      openTab({
        id: `menu-${menuItem.id}`,
        title: menuItem.name,
        type: 'action',
        props: {
          actionId: menuItem.actionId,
          actionType: menuItem.actionType,
          menuId: menuItem.id,
        },
      });
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="d-flex flex-column vh-100">
      {/* Top Navbar */}
      <Navbar bg="primary" variant="dark" className="px-3">
        <Navbar.Brand className="d-flex align-items-center">
          <button
            className="btn btn-link text-white p-0 me-3"
            onClick={() => setSidebarVisible(!sidebarVisible)}
            title="Toggle Sidebar"
          >
            <FiMenu size={24} />
          </button>
          <span className="fw-bold">Tryton Web Client</span>
        </Navbar.Brand>

        <Navbar.Collapse className="justify-content-end">
          <Dropdown align="end">
            <Dropdown.Toggle
              variant="outline-light"
              size="sm"
              className="d-flex align-items-center"
            >
              <FiUser className="me-2" />
              {username}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={handleLogout}>
                <FiLogOut className="me-2" />
                Logout
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Navbar.Collapse>
      </Navbar>

      {/* Main Content Area */}
      <div className="d-flex flex-grow-1 overflow-hidden">
        {/* Sidebar */}
        {sidebarVisible && (
          <Sidebar
            menuTree={menuTree}
            onMenuClick={handleMenuClick}
            className="h-100"
            style={{ width: '280px', minWidth: '280px' }}
          />
        )}

        {/* Content Area */}
        <div className="flex-grow-1 d-flex flex-column overflow-hidden">
          {isLoading ? (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="text-center">
                <Spinner animation="border" variant="primary" />
                <p className="mt-3 text-muted">Loading menu...</p>
              </div>
            </div>
          ) : error ? (
            <div className="d-flex align-items-center justify-content-center h-100">
              <div className="alert alert-danger">
                <h5>Error Loading Menu</h5>
                <p>{error}</p>
              </div>
            </div>
          ) : (
            <TabManager />
          )}
        </div>
      </div>
    </div>
  );
}

export default MainLayout;
