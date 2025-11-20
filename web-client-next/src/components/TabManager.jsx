import { Nav, Tab, Button } from 'react-bootstrap';
import { FiX } from 'react-icons/fi';
import useTabsStore from '../store/tabs';
import FormView from './FormView';
import ListView from './ListView';
import CalendarView from './CalendarView';
import GraphView from './GraphView';
import BoardView from './BoardView';
import ListFormView from './ListFormView';
import GanttView from './GanttView';

/**
 * Render tab content based on type
 */
function renderTabContent(tab) {
  switch (tab.type) {
    case 'form':
      return (
        <FormView
          modelName={tab.props?.modelName}
          recordId={tab.props?.recordId}
          viewId={tab.props?.viewId}
        />
      );

    case 'list':
    case 'tree':
      return (
        <ListView
          modelName={tab.props?.modelName}
          viewId={tab.props?.viewId}
          domain={tab.props?.domain || []}
          limit={tab.props?.limit || 80}
        />
      );

    case 'calendar':
      return (
        <CalendarView
          modelName={tab.props?.modelName}
          viewId={tab.props?.viewId}
          domain={tab.props?.domain || []}
          limit={tab.props?.limit || 1000}
        />
      );

    case 'graph':
      return (
        <GraphView
          modelName={tab.props?.modelName}
          viewId={tab.props?.viewId}
          domain={tab.props?.domain || []}
          limit={tab.props?.limit || 1000}
        />
      );

    case 'board':
      return (
        <BoardView
          modelName={tab.props?.modelName}
          viewId={tab.props?.viewId}
        />
      );

    case 'list-form':
      return (
        <ListFormView
          modelName={tab.props?.modelName}
          viewId={tab.props?.viewId}
          domain={tab.props?.domain || []}
          limit={tab.props?.limit || 80}
        />
      );

    case 'gantt':
      return (
        <GanttView
          modelName={tab.props?.modelName}
          viewId={tab.props?.viewId}
          domain={tab.props?.domain || []}
          limit={tab.props?.limit || 1000}
        />
      );

    case 'action':
      // Action tabs need to be resolved - show placeholder for now
      return (
        <div className="p-4">
          <h4>{tab.title}</h4>
          <p className="text-muted">
            Loading action...
          </p>
          {tab.props && (
            <pre className="bg-light p-3 rounded">
              {JSON.stringify(tab.props, null, 2)}
            </pre>
          )}
        </div>
      );

    default:
      return (
        <div className="p-4">
          <h4>{tab.title}</h4>
          <p className="text-muted">
            Unknown tab type: {tab.type || 'none'}
          </p>
          {tab.props && (
            <pre className="bg-light p-3 rounded">
              {JSON.stringify(tab.props, null, 2)}
            </pre>
          )}
        </div>
      );
  }
}

/**
 * TabManager Component
 * Manages Multiple Document Interface (MDI) tabs
 */
function TabManager({ children }) {
  const { tabs, activeTabId, setActiveTab, closeTab } = useTabsStore();

  if (tabs.length === 0) {
    return (
      <div className="d-flex align-items-center justify-content-center h-100">
        <div className="text-center text-muted">
          <h4>Welcome to Tryton</h4>
          <p>Select a menu item to get started</p>
        </div>
      </div>
    );
  }

  return (
    <Tab.Container
      activeKey={activeTabId}
      onSelect={(tabId) => setActiveTab(tabId)}
    >
      {/* Tab Navigation Bar */}
      <div className="border-bottom bg-light">
        <Nav variant="tabs" className="flex-nowrap overflow-auto">
          {tabs.map((tab) => (
            <Nav.Item key={tab.id}>
              <Nav.Link
                eventKey={tab.id}
                className="d-flex align-items-center position-relative"
                style={{
                  minWidth: '150px',
                  maxWidth: '250px',
                  whiteSpace: 'nowrap',
                }}
              >
                <span
                  className="text-truncate flex-grow-1"
                  title={tab.title}
                >
                  {tab.title}
                </span>
                <Button
                  variant="link"
                  size="sm"
                  className="p-0 ms-2 text-muted"
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(tab.id);
                  }}
                  style={{
                    width: '20px',
                    height: '20px',
                    lineHeight: '1',
                  }}
                >
                  <FiX size={14} />
                </Button>
              </Nav.Link>
            </Nav.Item>
          ))}
        </Nav>
      </div>

      {/* Tab Content */}
      <Tab.Content className="h-100 overflow-auto">
        {tabs.map((tab) => (
          <Tab.Pane key={tab.id} eventKey={tab.id} className="h-100">
            {children ? children(tab) : renderTabContent(tab)}
          </Tab.Pane>
        ))}
      </Tab.Content>
    </Tab.Container>
  );
}

export default TabManager;
