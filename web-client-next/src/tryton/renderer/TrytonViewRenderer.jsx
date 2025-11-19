import { Row, Col, Nav, Tab } from 'react-bootstrap';
import { getNodeAttr } from '../parsers/xml';
import { getWidget } from '../registry';

/**
 * Tryton View Renderer
 * Recursively renders Tryton view nodes based on their type
 */

/**
 * Render a group node (layout container)
 */
function renderGroup(node, fields, record, onFieldChange, onButtonClick, readonly, validationProps, depth = 0) {
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
                onFieldChange={onFieldChange}
                onButtonClick={onButtonClick}
                readonly={readonly}
                validationErrors={validationProps?.validationErrors}
                validationWarnings={validationProps?.validationWarnings}
                fieldStates={validationProps?.fieldStates}
                getFieldValidationProps={validationProps?.getFieldValidationProps}
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
function renderNotebook(node, fields, record, onFieldChange, onButtonClick, readonly, validationProps, depth = 0) {
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
              onFieldChange={onFieldChange}
              onButtonClick={onButtonClick}
              readonly={readonly}
              validationErrors={validationProps?.validationErrors}
              validationWarnings={validationProps?.validationWarnings}
              fieldStates={validationProps?.fieldStates}
              getFieldValidationProps={validationProps?.getFieldValidationProps}
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
function renderPage(node, fields, record, onFieldChange, onButtonClick, readonly, validationProps, depth = 0) {
  return (
    <div key={`page-${depth}`}>
      {node.children && node.children.map((child, idx) => (
        <TrytonViewRenderer
          key={idx}
          node={child}
          fields={fields}
          record={record}
          onFieldChange={onFieldChange}
          onButtonClick={onButtonClick}
          readonly={readonly}
          validationErrors={validationProps?.validationErrors}
          validationWarnings={validationProps?.validationWarnings}
          fieldStates={validationProps?.fieldStates}
          getFieldValidationProps={validationProps?.getFieldValidationProps}
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
 * Render a field node using the widget registry
 */
function renderField(node, fields, record, onFieldChange, readonly = false, validationProps, depth = 0) {
  const name = getNodeAttr(node, 'name', '');
  const widgetOverride = getNodeAttr(node, 'widget', null);
  const fieldReadonly = readonly || getNodeAttr(node, 'readonly', false);
  const required = getNodeAttr(node, 'required', false);
  const string = getNodeAttr(node, 'string', null);

  if (!name || !fields[name]) {
    return (
      <div key={`field-${depth}`} className="text-danger small">
        Unknown field: {name}
      </div>
    );
  }

  const field = fields[name];
  const value = record ? record[name] : null;

  // Get validation props for this field
  const fieldValidation = validationProps?.getFieldValidationProps?.(name) || {};
  const error = validationProps?.validationErrors?.[name];
  const warning = validationProps?.validationWarnings?.[name];
  const fieldState = validationProps?.fieldStates?.[name] || {};

  // Get the appropriate widget for this field type
  const widgetType = widgetOverride || field.type;
  const WidgetComponent = getWidget(widgetType);

  // Merge field metadata with any overrides from the node and validation state
  const fieldWithOverrides = {
    ...field,
    required: fieldValidation.required || required || field.required,
    readonly: fieldValidation.readonly || fieldReadonly,
    invisible: fieldValidation.invisible,
    string: string || field.string || name,
  };

  const isRequired = fieldWithOverrides.required;
  const isReadonly = fieldWithOverrides.readonly;
  const isInvisible = fieldWithOverrides.invisible;
  const labelText = fieldWithOverrides.string;

  // Don't render invisible fields
  if (isInvisible) {
    return null;
  }

  return (
    <div key={`field-${depth}-${name}`} className="mb-3">
      {labelText && (
        <label className={`form-label fw-semibold ${isRequired ? 'required' : ''}`}>
          {labelText}
          {isRequired && <span className="text-danger ms-1">*</span>}
        </label>
      )}
      <WidgetComponent
        name={name}
        value={value}
        onChange={onFieldChange}
        readonly={isReadonly}
        field={fieldWithOverrides}
        attributes={node.attributes || {}}
        isInvalid={fieldValidation.isInvalid}
        isValid={fieldValidation.isValid}
        className={fieldValidation.className}
      />
      {error && (
        <div className="invalid-feedback d-block">
          {error}
        </div>
      )}
      {warning && (
        <div className="alert alert-warning mt-2 py-1 px-2 small">
          {warning}
        </div>
      )}
    </div>
  );
}

/**
 * Render a button node
 */
function renderButton(node, onButtonClick = null, depth = 0) {
  const name = getNodeAttr(node, 'name', '');
  const string = getNodeAttr(node, 'string', 'Button');
  const icon = getNodeAttr(node, 'icon', '');
  const confirm = getNodeAttr(node, 'confirm', '');

  const handleClick = () => {
    // If there's a confirm message, show confirmation dialog
    if (confirm) {
      if (!window.confirm(confirm)) {
        return;
      }
    }

    // Call the button click handler if provided
    if (onButtonClick) {
      onButtonClick(name);
    } else {
      console.warn('Button clicked but no handler provided:', name);
    }
  };

  return (
    <button
      key={`button-${depth}`}
      className="btn btn-primary btn-sm"
      onClick={handleClick}
      type="button"
    >
      {string}
    </button>
  );
}

/**
 * Main Recursive Renderer Component
 */
function TrytonViewRenderer({
  node,
  fields = {},
  record = null,
  onFieldChange = null,
  onButtonClick = null,
  readonly = false,
  validationErrors = {},
  validationWarnings = {},
  fieldStates = {},
  getFieldValidationProps = null,
  depth = 0
}) {
  if (!node) {
    return null;
  }

  // Package validation props for passing to child renderers
  const validationProps = {
    validationErrors,
    validationWarnings,
    fieldStates,
    getFieldValidationProps,
  };

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
              onFieldChange={onFieldChange}
              onButtonClick={onButtonClick}
              readonly={readonly}
              validationErrors={validationErrors}
              validationWarnings={validationWarnings}
              fieldStates={fieldStates}
              getFieldValidationProps={getFieldValidationProps}
              depth={depth + 1}
            />
          ))}
        </div>
      );

    case 'group':
      return renderGroup(node, fields, record, onFieldChange, onButtonClick, readonly, validationProps, depth);

    case 'notebook':
      return renderNotebook(node, fields, record, onFieldChange, onButtonClick, readonly, validationProps, depth);

    case 'page':
      return renderPage(node, fields, record, onFieldChange, onButtonClick, readonly, validationProps, depth);

    case 'separator':
      return renderSeparator(node, depth);

    case 'label':
      return renderLabel(node, fields, depth);

    case 'field':
      return renderField(node, fields, record, onFieldChange, readonly, validationProps, depth);

    case 'button':
      return renderButton(node, onButtonClick, depth);

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
