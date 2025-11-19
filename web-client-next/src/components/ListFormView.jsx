import { useState, useEffect, useCallback } from 'react';
import { Container, Row, Col, Card, Spinner, Alert, Button } from 'react-bootstrap';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import useTabsStore from '../store/tabs';

/**
 * ListFormView Component
 * Mobile-friendly combination of list and form views
 * Displays records as cards with key information
 */
function ListFormView({ modelName, viewId = null, domain = [], limit = 80 }) {
  const { sessionId, database } = useSessionStore();
  const { openTab } = useTabsStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [fields, setFields] = useState({});
  const [records, setRecords] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRecord, setSelectedRecord] = useState(null);

  /**
   * Load view definition and records
   */
  useEffect(() => {
    const loadViewAndData = async () => {
      if (!modelName || !sessionId || !database) {
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        console.log('[ListFormView] Loading view for model:', modelName);

        // Try to get list-form view, fallback to form view
        let viewType = 'list-form';
        let viewResult;

        try {
          viewResult = await rpc.fieldsViewGet(
            modelName,
            viewId,
            viewType,
            sessionId,
            database
          );
        } catch (err) {
          // Fallback to form view if list-form not available
          console.log('[ListFormView] list-form not available, using form view');
          viewType = 'form';
          viewResult = await rpc.fieldsViewGet(
            modelName,
            viewId,
            viewType,
            sessionId,
            database
          );
        }

        console.log('[ListFormView] View result:', viewResult);

        // Parse the XML architecture
        const parsedView = parseAndNormalizeView(viewResult.arch);
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

        console.log('[ListFormView] Loaded records:', recordData);
        setRecords(recordData || []);

      } catch (err) {
        console.error('[ListFormView] Error loading view:', err);
        setError(err.message || 'Failed to load list-form view');
      } finally {
        setIsLoading(false);
      }
    };

    loadViewAndData();
  }, [modelName, viewId, sessionId, database, domain, limit]);

  /**
   * Handle record click
   */
  const handleRecordClick = useCallback(
    (record) => {
      // Open full form view in new tab
      openTab({
        id: `form-${modelName}-${record.id}-${Date.now()}`,
        title: record.name || record.rec_name || `Record ${record.id}`,
        type: 'form',
        props: {
          modelName,
          recordId: record.id,
        },
      });
    },
    [modelName, openTab]
  );

  /**
   * Render field value
   */
  const renderFieldValue = (record, fieldName) => {
    const value = record[fieldName];
    const field = fields[fieldName];

    if (value === null || value === undefined) {
      return '-';
    }

    // Handle different field types
    if (field?.type === 'many2one' && Array.isArray(value)) {
      return value[1]; // [id, name] tuple
    } else if (field?.type === 'boolean') {
      return value ? 'Yes' : 'No';
    } else if (field?.type === 'selection' && field.selection) {
      const option = field.selection.find(s => s[0] === value);
      return option ? option[1] : value;
    } else if (typeof value === 'object') {
      return JSON.stringify(value);
    }

    return String(value);
  };

  if (isLoading) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading records...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading View</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  // Get key fields to display (first few fields, excluding id)
  const displayFields = Object.keys(fields)
    .filter(f => f !== 'id')
    .slice(0, 4);

  return (
    <Container fluid className="h-100 p-3">
      <h5 className="mb-3">{modelName} List</h5>

      {records.length === 0 ? (
        <Alert variant="info">
          <p>No records found.</p>
        </Alert>
      ) : (
        <Row className="g-3">
          {records.map((record) => (
            <Col key={record.id} xs={12} sm={6} md={4} lg={3}>
              <Card
                className="h-100 cursor-pointer"
                style={{ cursor: 'pointer' }}
                onClick={() => handleRecordClick(record)}
              >
                <Card.Body>
                  <Card.Title className="h6 mb-3">
                    {record.name || record.rec_name || `Record ${record.id}`}
                  </Card.Title>

                  {displayFields.map((fieldName) => (
                    <div key={fieldName} className="mb-2 small">
                      <strong className="text-muted">
                        {fields[fieldName]?.string || fieldName}:
                      </strong>
                      <br />
                      <span>{renderFieldValue(record, fieldName)}</span>
                    </div>
                  ))}
                </Card.Body>
                <Card.Footer className="text-end">
                  <small className="text-muted">ID: {record.id}</small>
                </Card.Footer>
              </Card>
            </Col>
          ))}
        </Row>
      )}

      <div className="mt-3 text-muted small">
        Showing {records.length} record{records.length !== 1 ? 's' : ''}
      </div>

      <Alert variant="info" className="mt-3">
        <Alert.Heading>List-Form View</Alert.Heading>
        <p className="mb-0">
          This view provides a mobile-friendly card layout for browsing records.
          Click any card to open the full form view.
        </p>
      </Alert>
    </Container>
  );
}

export default ListFormView;
