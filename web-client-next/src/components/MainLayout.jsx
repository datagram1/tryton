import { useEffect, useState } from 'react';
import { Navbar, Container, Dropdown, Spinner, Alert } from 'react-bootstrap';
import { FiMenu, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import Sidebar from './Sidebar';
import TabManager from './TabManager';
import PreferencesWindow from '../windows/PreferencesWindow';
import useSessionStore from '../store/session';
import useMenuStore from '../store/menu';
import useTabsStore from '../store/tabs';
import usePreferencesStore from '../store/preferences';
import { executeAction } from '../tryton/actions/actionExecutor';

/**
 * MainLayout Component
 * Application shell with navigation, sidebar, and content area
 */
function MainLayout() {
  const [sidebarVisible, setSidebarVisible] = useState(true);
  const [showPreferences, setShowPreferences] = useState(false);
  const { username, logout, sessionId, database } = useSessionStore();
  const { menuTree, isLoading, loadMenu, error } = useMenuStore();
  const { openTab } = useTabsStore();
  const { loadPreferences, theme } = usePreferencesStore();

  // Load menu on mount
  useEffect(() => {
    if (sessionId && database && menuTree.length === 0) {
      loadMenu(sessionId, database);
    }
  }, [sessionId, database, loadMenu, menuTree.length]);

  // Load user preferences on mount
  useEffect(() => {
    if (sessionId && database) {
      loadPreferences(sessionId, database);
    }
  }, [sessionId, database, loadPreferences]);

  // Apply theme on mount and when it changes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.setAttribute('data-bs-theme', theme);
    }
  }, [theme]);

  const handleMenuClick = async (menuItem) => {
    // When a menu item is clicked, execute the action and open appropriate view
    if (!menuItem.actionId) {
      return;
    }

    try {
      // Execute the action to get configuration
      console.log('[MainLayout] Executing action:', menuItem.actionId);
      const result = await executeAction(menuItem.actionId, sessionId, database);
      console.log('[MainLayout] Action result:', result);

      if (result.type === 'act_window') {
        const config = result.config;
        console.log('[MainLayout] Act window config:', config);

        // Determine which view to open (tree or form)
        const viewType = config.initialViewType;
        const tabType = viewType === 'form' ? 'form' : 'list';

        const tabProps = {
          modelName: config.resModel,
          viewId: config.viewIds[viewType] || null,
          domain: config.domain,
          limit: config.limit,
        };

        console.log('[MainLayout] Opening tab with props:', tabProps);

        // Create appropriate tab
        openTab({
          id: `menu-${menuItem.id}-${Date.now()}`,
          title: config.name || menuItem.name,
          type: tabType,
          props: tabProps,
        });
      } else if (result.type === 'url') {
        // Open URL in new window
        window.open(result.url, '_blank');
      } else {
        // Show message for unsupported action types
        alert(result.message || `Action type '${result.type}' not yet supported`);
      }
    } catch (error) {
      console.error('Error executing action:', error);
      alert(`Failed to execute action: ${error.message}`);
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
              {/* Avatar with initials */}
              <div
                className="rounded-circle bg-light text-primary d-flex align-items-center justify-content-center me-2"
                style={{
                  width: '32px',
                  height: '32px',
                  fontSize: '14px',
                  fontWeight: 'bold',
                }}
              >
                {username
                  ? username
                      .split(/[\s._-]+/)
                      .slice(0, 2)
                      .map((part) => part[0])
                      .join('')
                      .toUpperCase()
                  : 'U'}
              </div>
              {username}
            </Dropdown.Toggle>

            <Dropdown.Menu>
              <Dropdown.Item onClick={() => setShowPreferences(true)}>
                <FiSettings className="me-2" />
                Preferences
              </Dropdown.Item>
              <Dropdown.Divider />
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

      {/* Preferences Window */}
      <PreferencesWindow
        show={showPreferences}
        onHide={() => setShowPreferences(false)}
      />
    </div>
  );
}

export default MainLayout;
