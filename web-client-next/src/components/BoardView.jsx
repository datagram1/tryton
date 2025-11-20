import { useState, useEffect } from 'react';
import { Container, Row, Col, Card, Spinner, Alert } from 'react-bootstrap';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * BoardView Component
 * Container for displaying dashboard with multiple action panels in a grid layout
 *
 * Note: This is a simplified implementation. The full SAO board view supports:
 * - Dynamic action execution
 * - PYSON domain evaluation between actions
 * - Resizable panels
 * - Complex widget interactions
 */
function BoardView({ modelName, viewId = null }) {
  const { sessionId, database } = useSessionStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [actions, setActions] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  /**
   * Load view definition
   */
  useEffect(() => {
    const loadView = async () => {
      if (!modelName || !sessionId || !database) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('[BoardView] Loading view for model:', modelName);

        // Fetch the view definition
        const viewResult = await rpc.fieldsViewGet(
          modelName,
          viewId,
          'board',
          sessionId,
          database
        );

        console.log('[BoardView] View result:', viewResult);

        // Parse the XML architecture
        const parsedView = parseAndNormalizeView(viewResult.arch);
        console.log('[BoardView] Parsed view:', parsedView);

        setViewDefinition(parsedView);

        // Extract action widgets from the view
        // Board views have <action> tags that reference ir.action.act_window
        const actionWidgets = [];
        if (parsedView.children) {
          parsedView.children.forEach(child => {
            if (child.tag === 'action') {
              actionWidgets.push({
                name: child.attrs?.name,
                string: child.attrs?.string || child.attrs?.name,
                colspan: parseInt(child.attrs?.colspan || '1', 10),
              });
            }
          });
        }

        console.log('[BoardView] Found actions:', actionWidgets);
        setActions(actionWidgets);

      } catch (err) {
        console.error('[BoardView] Error loading view:', err);
        setError(err.message || 'Failed to load board view');
      } finally {
        setIsLoading(false);
      }
    };

    loadView();
  }, [modelName, viewId, sessionId, database]);

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading dashboard...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Dashboard</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="h-100 p-3">
      <h5 className="mb-3">{modelName} Dashboard</h5>

      {actions.length === 0 ? (
        <Alert variant="info">
          <Alert.Heading>Empty Dashboard</Alert.Heading>
          <p>No actions defined in this board view.</p>
        </Alert>
      ) : (
        <Row className="g-3">
          {actions.map((action, index) => (
            <Col
              key={index}
              xs={12}
              md={action.colspan > 2 ? 12 : 6}
              lg={action.colspan > 2 ? 12 : action.colspan * 3}
            >
              <Card className="h-100">
                <Card.Header>
                  <strong>{action.string}</strong>
                </Card.Header>
                <Card.Body>
                  <div className="text-center text-muted py-4">
                    <p>Action: {action.name}</p>
                    <p className="small">
                      Board view actions require full implementation of action execution system.
                      <br />
                      This would embed a ListView, GraphView, or other view here.
                    </p>
                  </div>
                </Card.Body>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <Alert variant="warning" className="mt-3">
        <Alert.Heading>Board View - Partial Implementation</Alert.Heading>
        <p>
          This is a simplified board/dashboard view. The full implementation requires:
        </p>
        <ul>
          <li>Embedded action execution (displaying actual views in each panel)</li>
          <li>PYSON domain evaluation between related actions</li>
          <li>Resizable and draggable panels (react-grid-layout)</li>
          <li>Active record context sharing between panels</li>
        </ul>
        <p className="mb-0">
          Reference: <code>/home/user/tryton/sao/src/board.js</code>
        </p>
      </Alert>
    </Container>
  );
}

export default BoardView;
