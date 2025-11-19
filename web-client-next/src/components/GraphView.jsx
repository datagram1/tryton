import { useState, useEffect, useCallback } from 'react';
import { Container, Spinner, Alert, ButtonGroup, Button } from 'react-bootstrap';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import { parseAndNormalizeView } from '../tryton/parsers/xml';
import rpc from '../api/rpc';
import useSessionStore from '../store/session';
import useTabsStore from '../store/tabs';

/**
 * Generate a color palette for chart data
 */
const generateColors = (count) => {
  const baseColors = [
    '#3174ad', '#51a351', '#f89406', '#ee5f5b', '#049cdb',
    '#bd10e0', '#9013fe', '#50e3c2', '#b8e986', '#f5a623'
  ];

  const colors = [];
  for (let i = 0; i < count; i++) {
    colors.push(baseColors[i % baseColors.length]);
  }
  return colors;
};

/**
 * GraphView Component
 * Container for displaying Tryton records as charts/graphs
 */
function GraphView({ modelName, viewId = null, domain = [], limit = 1000 }) {
  const { sessionId, database } = useSessionStore();
  const { openTab } = useTabsStore();

  // State
  const [viewDefinition, setViewDefinition] = useState(null);
  const [fields, setFields] = useState({});
  const [records, setRecords] = useState([]);
  const [chartData, setChartData] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [chartType, setChartType] = useState('bar');

  // Graph attributes from view definition
  const [graphAttrs, setGraphAttrs] = useState({
    type: 'vbar', // vbar, hbar, line, pie
    xField: null,
    yFields: [],
    color: null,
  });

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

        console.log('[GraphView] Loading view for model:', modelName);

        // Fetch the view definition
        const viewResult = await rpc.fieldsViewGet(
          modelName,
          viewId,
          'graph',
          sessionId,
          database
        );

        console.log('[GraphView] View result:', viewResult);

        // Parse the XML architecture
        const parsedView = parseAndNormalizeView(viewResult.arch);
        console.log('[GraphView] Parsed view:', parsedView);

        setViewDefinition(parsedView);
        setFields(viewResult.fields || {});

        // Extract graph-specific attributes from the view
        // The view structure typically has:
        // <graph type="bar">
        //   <x><field name="date"/></x>
        //   <y><field name="amount"/><field name="quantity"/></y>
        // </graph>

        const type = parsedView.attrs?.type || 'vbar';
        let xField = null;
        const yFields = [];

        // Find x and y field definitions in children
        if (parsedView.children) {
          parsedView.children.forEach(child => {
            if (child.tag === 'x' && child.children && child.children.length > 0) {
              const fieldNode = child.children[0];
              xField = {
                name: fieldNode.attrs?.name,
                string: fieldNode.attrs?.string || viewResult.fields[fieldNode.attrs?.name]?.string || fieldNode.attrs?.name
              };
            } else if (child.tag === 'y' && child.children) {
              child.children.forEach(fieldNode => {
                if (fieldNode.tag === 'field') {
                  yFields.push({
                    name: fieldNode.attrs?.name,
                    string: fieldNode.attrs?.string || viewResult.fields[fieldNode.attrs?.name]?.string || fieldNode.attrs?.name,
                    color: fieldNode.attrs?.color,
                    key: fieldNode.attrs?.key
                  });
                }
              });
            }
          });
        }

        const attrs = {
          type,
          xField,
          yFields,
          color: parsedView.attrs?.color || null,
        };

        console.log('[GraphView] Graph attributes:', attrs);
        setGraphAttrs(attrs);

        // Set initial chart type based on view type
        if (type === 'hbar') {
          setChartType('hbar');
        } else if (type === 'line') {
          setChartType('line');
        } else if (type === 'pie') {
          setChartType('pie');
        } else {
          setChartType('bar');
        }

      } catch (err) {
        console.error('[GraphView] Error loading view:', err);
        setError(err.message || 'Failed to load graph view');
      } finally {
        setIsLoading(false);
      }
    };

    loadView();
  }, [modelName, viewId, sessionId, database]);

  /**
   * Load records for the graph
   */
  const loadRecords = useCallback(async () => {
    if (!modelName || !sessionId || !database || !graphAttrs.xField) {
      return;
    }

    try {
      setIsLoading(true);

      console.log('[GraphView] Loading records...');

      // Determine which fields to fetch
      const fieldsToFetch = [graphAttrs.xField.name];
      graphAttrs.yFields.forEach(yf => {
        if (yf.name !== '#') { // '#' is a special field for counting
          fieldsToFetch.push(yf.name);
        }
      });

      // Search for records
      const recordData = await rpc.searchRead(
        modelName,
        domain,
        fieldsToFetch,
        0,
        limit,
        null,
        sessionId,
        database
      );

      console.log('[GraphView] Loaded records:', recordData);
      setRecords(recordData || []);

    } catch (err) {
      console.error('[GraphView] Error loading records:', err);
      setError(err.message || 'Failed to load graph data');
    } finally {
      setIsLoading(false);
    }
  }, [modelName, sessionId, database, domain, limit, graphAttrs]);

  /**
   * Load records when view is ready
   */
  useEffect(() => {
    if (graphAttrs.xField && graphAttrs.yFields.length > 0) {
      loadRecords();
    }
  }, [loadRecords, graphAttrs]);

  /**
   * Aggregate and prepare chart data
   */
  useEffect(() => {
    if (!graphAttrs.xField || records.length === 0) {
      setChartData([]);
      return;
    }

    // Group records by X field value and aggregate Y field values
    const dataMap = new Map();

    records.forEach(record => {
      const xValue = record[graphAttrs.xField.name];
      const xKey = xValue !== null && xValue !== undefined ? String(xValue) : 'null';

      if (!dataMap.has(xKey)) {
        dataMap.set(xKey, {
          [graphAttrs.xField.name]: xValue,
          label: xKey,
          recordIds: []
        });
      }

      const dataPoint = dataMap.get(xKey);
      dataPoint.recordIds.push(record.id);

      // Aggregate Y field values
      graphAttrs.yFields.forEach(yField => {
        const key = yField.key || yField.name;

        if (!dataPoint[key]) {
          dataPoint[key] = 0;
        }

        if (yField.name === '#') {
          // Count records
          dataPoint[key] += 1;
        } else {
          // Sum field values
          const value = record[yField.name];
          if (typeof value === 'number') {
            dataPoint[key] += value;
          } else if (value) {
            dataPoint[key] += 1; // Fallback to counting if not a number
          }
        }
      });
    });

    // Convert map to array and sort by X value
    const aggregatedData = Array.from(dataMap.values());

    console.log('[GraphView] Aggregated data:', aggregatedData);
    setChartData(aggregatedData);
  }, [records, graphAttrs]);

  /**
   * Handle chart click - drill down to records
   */
  const handleChartClick = useCallback(
    (data) => {
      if (!data || !data.activePayload || !data.activePayload[0]) {
        return;
      }

      const payload = data.activePayload[0].payload;
      const recordIds = payload.recordIds;

      console.log('[GraphView] Chart clicked:', { data, recordIds });

      if (recordIds && recordIds.length > 0) {
        // Open list view filtered to these records
        openTab({
          id: `list-${modelName}-${Date.now()}`,
          title: `${modelName} (${recordIds.length})`,
          type: 'list',
          props: {
            modelName,
            domain: [['id', 'in', recordIds]],
          },
        });
      }
    },
    [modelName, openTab]
  );

  /**
   * Render chart based on type
   */
  const renderChart = () => {
    if (chartData.length === 0) {
      return (
        <div className="text-center text-muted p-5">
          <p>No data available to display</p>
        </div>
      );
    }

    const colors = generateColors(graphAttrs.yFields.length);
    const height = 400;

    switch (chartType) {
      case 'bar':
      case 'vbar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              {graphAttrs.yFields.map((yField, index) => (
                <Bar
                  key={yField.key || yField.name}
                  dataKey={yField.key || yField.name}
                  name={yField.string}
                  fill={yField.color || colors[index]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'hbar':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <BarChart data={chartData} layout="vertical" onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis dataKey="label" type="category" width={100} />
              <Tooltip />
              <Legend />
              {graphAttrs.yFields.map((yField, index) => (
                <Bar
                  key={yField.key || yField.name}
                  dataKey={yField.key || yField.name}
                  name={yField.string}
                  fill={yField.color || colors[index]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        );

      case 'line':
        return (
          <ResponsiveContainer width="100%" height={height}>
            <LineChart data={chartData} onClick={handleChartClick}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip />
              <Legend />
              {graphAttrs.yFields.map((yField, index) => (
                <Line
                  key={yField.key || yField.name}
                  type="monotone"
                  dataKey={yField.key || yField.name}
                  name={yField.string}
                  stroke={yField.color || colors[index]}
                  strokeWidth={2}
                  dot={{ r: 4 }}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        );

      case 'pie':
        // For pie chart, use the first Y field
        const yField = graphAttrs.yFields[0];
        const pieData = chartData.map((item, index) => ({
          name: item.label,
          value: item[yField.key || yField.name],
          recordIds: item.recordIds,
          fill: colors[index % colors.length]
        }));

        return (
          <ResponsiveContainer width="100%" height={height}>
            <PieChart onClick={handleChartClick}>
              <Pie
                data={pieData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={120}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              >
                {pieData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        );

      default:
        return <div className="text-center text-muted p-5">Unknown chart type: {chartType}</div>;
    }
  };

  if (isLoading && chartData.length === 0) {
    return (
      <Container className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <div className="text-center">
          <Spinner animation="border" variant="primary" />
          <p className="mt-3 text-muted">Loading graph...</p>
        </div>
      </Container>
    );
  }

  if (error) {
    return (
      <Container className="mt-4">
        <Alert variant="danger">
          <Alert.Heading>Error Loading Graph</Alert.Heading>
          <p>{error}</p>
        </Alert>
      </Container>
    );
  }

  if (!graphAttrs.xField || graphAttrs.yFields.length === 0) {
    return (
      <Container className="mt-4">
        <Alert variant="warning">
          <Alert.Heading>Invalid Graph View</Alert.Heading>
          <p>Graph view must define both X and Y fields.</p>
        </Alert>
      </Container>
    );
  }

  return (
    <Container fluid className="h-100 d-flex flex-column p-3">
      {/* Chart Type Selector */}
      <div className="mb-3 d-flex justify-content-between align-items-center">
        <h5 className="mb-0">
          {modelName} Graph
        </h5>
        <ButtonGroup size="sm">
          <Button
            variant={chartType === 'bar' ? 'primary' : 'outline-primary'}
            onClick={() => setChartType('bar')}
          >
            Vertical Bar
          </Button>
          <Button
            variant={chartType === 'hbar' ? 'primary' : 'outline-primary'}
            onClick={() => setChartType('hbar')}
          >
            Horizontal Bar
          </Button>
          <Button
            variant={chartType === 'line' ? 'primary' : 'outline-primary'}
            onClick={() => setChartType('line')}
          >
            Line
          </Button>
          <Button
            variant={chartType === 'pie' ? 'primary' : 'outline-primary'}
            onClick={() => setChartType('pie')}
          >
            Pie
          </Button>
        </ButtonGroup>
      </div>

      {/* Chart */}
      <div className="flex-grow-1">
        {renderChart()}
      </div>

      {/* Status bar */}
      {chartData.length > 0 && (
        <div className="mt-2 text-muted small">
          Showing {chartData.length} data point{chartData.length !== 1 ? 's' : ''} from {records.length} record{records.length !== 1 ? 's' : ''}
          {' • '}
          X: {graphAttrs.xField.string}
          {' • '}
          Y: {graphAttrs.yFields.map(yf => yf.string).join(', ')}
        </div>
      )}
    </Container>
  );
}

export default GraphView;
