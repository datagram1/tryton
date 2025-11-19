import { Row, Col, Nav, Tab } from 'react-bootstrap';
import { getNodeAttr } from '../parsers/xml';

/**
 * Tryton View Renderer
 * Recursively renders Tryton view nodes based on their type
 */

/**
 * Render a group node (layout container)
 */
function renderGroup(node, fields, record, depth = 0) {
  const col = getNodeAttr(node, 'col', 4);
  const colspan = getNodeAttr(node, 'colspan', 1);
  const string = getNodeAttr(node, 'string', '');

  return (
    <div key={`group-${depth}`} className="mb-3">
      {string && <h6 className="fw-bold mb-2">{string}</h6>}
      <Row>
        {node.children && node.children.map((child, idx) => {
          const childColspan = getNodeAttr(child, 'colspan', 1);
          const colWidth = Math.floor((childColspan / col) * 12);

          return (
            <Col key={idx} xs={12} md={colWidth || 6} className="mb-2">
              <TrytonViewRenderer
                node={child}
                fields={fields}
                record={record}
                depth={depth + 1}
              />
            </Col>
          );
        })}
      </Row>
    </div>
  );
}

/**
 * Render a notebook node (tabs container)
 */
function renderNotebook(node, fields, record, depth = 0) {
  const pages = node.children.filter((child) => child.tag === 'page');

  if (pages.length === 0) {
    return null;
  }

  return (
    <Tab.Container key={`notebook-${depth}`} defaultActiveKey={`page-0`}>
      <Nav variant="tabs" className="mb-3">
        {pages.map((page, idx) => {
          const pageString = getNodeAttr(page, 'string', `Page ${idx + 1}`);
          return (
            <Nav.Item key={idx}>
              <Nav.Link eventKey={`page-${idx}`}>{pageString}</Nav.Link>
            </Nav.Item>
          );
        })}
      </Nav>
      <Tab.Content>
        {pages.map((page, idx) => (
          <Tab.Pane key={idx} eventKey={`page-${idx}`}>
            <TrytonViewRenderer
              node={page}
              fields={fields}
              record={record}
              depth={depth + 1}
            />
          </Tab.Pane>
        ))}
      </Tab.Content>
    </Tab.Container>
  );
}

/**
 * Render a page node (tab page content)
 */
function renderPage(node, fields, record, depth = 0) {
  return (
    <div key={`page-${depth}`}>
      {node.children && node.children.map((child, idx) => (
        <TrytonViewRenderer
          key={idx}
          node={child}
          fields={fields}
          record={record}
          depth={depth + 1}
        />
      ))}
    </div>
  );
}

/**
 * Render a separator node (horizontal rule or section header)
 */
function renderSeparator(node, depth = 0) {
  const string = getNodeAttr(node, 'string', '');

  if (string) {
    return (
      <div key={`separator-${depth}`} className="my-3">
        <h6 className="text-muted text-uppercase small">{string}</h6>
        <hr className="mt-1" />
      </div>
    );
  }

  return <hr key={`separator-${depth}`} className="my-3" />;
}

/**
 * Render a label node
 */
function renderLabel(node, fields, depth = 0) {
  const name = getNodeAttr(node, 'name', '');
  const string = getNodeAttr(node, 'string', '');

  let labelText = string;

  // If no string provided, get it from field definition
  if (!labelText && name && fields[name]) {
    labelText = fields[name].string || name;
  }

  return (
    <label key={`label-${depth}`} className="form-label fw-semibold">
      {labelText}
    </label>
  );
}

/**
 * Render a field node (placeholder - will be enhanced in Phase 5)
 */
function renderField(node, fields, record, depth = 0) {
  const name = getNodeAttr(node, 'name', '');
  const readonly = getNodeAttr(node, 'readonly', false);
  const required = getNodeAttr(node, 'required', false);

  if (!name || !fields[name]) {
    return (
      <div key={`field-${depth}`} className="text-danger small">
        Unknown field: {name}
      </div>
    );
  }

  const field = fields[name];
  const value = record ? record[name] : null;

  return (
    <div key={`field-${depth}-${name}`} className="mb-2">
      <label className="form-label">
        {field.string || name}
        {required && <span className="text-danger ms-1">*</span>}
      </label>
      <div className="border rounded p-2 bg-light">
        <small className="text-muted">
          Type: {field.type} | Value: {JSON.stringify(value) || '(empty)'}
        </small>
      </div>
    </div>
  );
}

/**
 * Render a button node
 */
function renderButton(node, depth = 0) {
  const name = getNodeAttr(node, 'name', '');
  const string = getNodeAttr(node, 'string', 'Button');
  const icon = getNodeAttr(node, 'icon', '');

  return (
    <button
      key={`button-${depth}`}
      className="btn btn-primary btn-sm"
      onClick={() => console.log('Button clicked:', name)}
    >
      {string}
    </button>
  );
}

/**
 * Main Recursive Renderer Component
 */
function TrytonViewRenderer({ node, fields = {}, record = null, depth = 0 }) {
  if (!node) {
    return null;
  }

  // Render based on node type
  switch (node.tag) {
    case 'form':
    case 'tree':
      // Root nodes - render children
      return (
        <div className="p-3">
          {node.children && node.children.map((child, idx) => (
            <TrytonViewRenderer
              key={idx}
              node={child}
              fields={fields}
              record={record}
              depth={depth + 1}
            />
          ))}
        </div>
      );

    case 'group':
      return renderGroup(node, fields, record, depth);

    case 'notebook':
      return renderNotebook(node, fields, record, depth);

    case 'page':
      return renderPage(node, fields, record, depth);

    case 'separator':
      return renderSeparator(node, depth);

    case 'label':
      return renderLabel(node, fields, depth);

    case 'field':
      return renderField(node, fields, record, depth);

    case 'button':
      return renderButton(node, depth);

    default:
      // Unknown node type
      return (
        <div key={`unknown-${depth}`} className="text-warning small">
          Unknown node: {node.tag}
        </div>
      );
  }
}

export default TrytonViewRenderer;
