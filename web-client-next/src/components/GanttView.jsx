import { useState, useEffect } from 'react';
import { Container, Spinner, Alert } from 'react-bootstrap';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';

/**
 * GanttView Component
 * Timeline visualization for project management
 *
 * Note: This is a placeholder implementation. A full Gantt view requires:
 * - Timeline rendering with tasks as bars
 * - Task dependencies (predecessor/successor relationships)
 * - Drag and drop for scheduling
 * - Zoom levels (day, week, month, year)
 * - Progress indicators
 * - Resource allocation
 *
 * Libraries to consider: frappe-gantt, bryntum-gantt, gantt-schedule-timeline-calendar
 */
function GanttView({ modelName, viewId = null, domain = [], limit = 1000 }) {
  const { sessionId, database } = useSessionStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [fields, setFields] = useState({});
  const [records, setRecords] = useState([]);
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

        console.log('[GanttView] Loading view for model:', modelName);

        // Fetch the view definition
        const viewResult = await rpc.fieldsViewGet(
          modelName,
          viewId,
          'gantt',
          sessionId,
          database
        );

        console.log('[GanttView] View result:', viewResult);

        // Parse the XML architecture
        const parsedView = parseAndNormalizeView(viewResult.arch);
        console.log('[GanttView] Parsed view:', parsedView);

        setViewDefinition(parsedView);
        setFields(viewResult.fields || {});

        // Load records
        const recordData = await rpc.searchRead(
          modelName,
          domain,
          Object.keys(viewResult.fields),
          0,
          limit,
          null,
          sessionId,
          database
        );

        console.log('[GanttView] Loaded records:', recordData);
        setRecords(recordData || []);

      } catch (err) {
        console.error('[GanttView] Error loading view:', err);
        setError(err.message || 'Failed to load gantt view');
      } finally {
        setIsLoading(false);
      }
    };

    loadView();
  }, [modelName, viewId, sessionId, database, domain, limit]);

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading gantt chart...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Gantt View</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="h-100 p-3">
      <h5 className="mb-3">{modelName} Gantt Chart</h5>

      <Alert variant="warning">
        <Alert.Heading>Gantt View - Not Implemented</Alert.Heading>
        <p>
          The Gantt view is a timeline visualization for project management tasks.
        </p>
        <p>
          <strong>Loaded {records.length} record{records.length !== 1 ? 's' : ''}</strong>
        </p>
        <p className="mb-0">
          Full implementation requires:
        </p>
        <ul>
          <li>Timeline rendering with task bars</li>
          <li>Task dependencies (predecessor/successor)</li>
          <li>Drag and drop scheduling</li>
          <li>Zoom levels (day/week/month/year)</li>
          <li>Progress indicators</li>
          <li>Resource allocation</li>
          <li>Critical path highlighting</li>
        </ul>
        <p className="mb-0">
          Recommended libraries:
        </p>
        <ul className="mb-0">
          <li><code>frappe-gantt</code> - Simple and lightweight</li>
          <li><code>@bryntum/gantt</code> - Full-featured (commercial)</li>
          <li><code>gantt-schedule-timeline-calendar</code> - Flexible and customizable</li>
        </ul>
      </Alert>

      {viewDefinition && (
        <Alert variant="info">
          <Alert.Heading>View Definition</Alert.Heading>
          <pre className="mb-0" style={{ maxHeight: '200px', overflow: 'auto' }}>
            {JSON.stringify(viewDefinition, null, 2)}
          </pre>
        </Alert>
      )}
    </Container>
  );
}

export default GanttView;
