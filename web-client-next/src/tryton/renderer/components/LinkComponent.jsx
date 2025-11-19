import { Button } from 'react-bootstrap';
import './LinkComponent.css';

/**
 * LinkComponent - Clickable hyperlinks in forms
 *
 * Renders a clickable link button that can execute actions or navigate to URLs.
 * Reference: /home/user/tryton/sao/src/view/form.js (Sao.View.Form.Link)
 */
function LinkComponent({
  name = '',
  label = '',
  icon = null,
  url = null,
  onClick = null,
  record = null,
  attributes = {}
}) {
  const handleClick = (e) => {
    e.preventDefault();

    if (url) {
      // Open URL in new tab
      window.open(url, '_blank', 'noopener,noreferrer');
    } else if (onClick) {
      // Execute custom click handler
      onClick(name, record);
    } else {
      console.warn('Link clicked but no URL or handler provided:', name);
    }
  };

  // Don't render if no record and action-based
  if (!url && !record) {
    return null;
  }

  return (
    <Button
      variant="link"
      className="link-component"
      onClick={handleClick}
      title={label}
    >
      {icon && (
        <img
          src={icon}
          alt=""
          className="link-icon"
          width="16"
          height="16"
        />
      )}
      <span className="link-label">{label}</span>
    </Button>
  );
}

export default LinkComponent;
