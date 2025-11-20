import { useMemo } from 'react';
import './ImageComponent.css';

/**
 * ImageComponent - Static image display in forms
 *
 * Displays images from URLs, field values, or color values.
 * Reference: /home/user/tryton/sao/src/view/form.js (Sao.View.Form.Image_)
 */
function ImageComponent({
  name = '',
  src = null,
  size = 48,
  border = null, // 'rounded', 'circle', or null
  type = 'url', // 'url', 'color', or 'icon'
  alt = '',
  record = null,
  fields = {},
  urlSizeParam = null
}) {
  // Get the image source from field if name is provided
  const imageSrc = useMemo(() => {
    if (src) {
      return src;
    }

    if (name && record && fields[name]) {
      const field = fields[name];
      let value = record[name];

      if (type === 'url' && value) {
        // Handle URL type images
        if (urlSizeParam) {
          try {
            const url = new URL(value, window.location.origin);
            url.searchParams.set(urlSizeParam, size);
            return url.href;
          } catch (e) {
            console.warn('Invalid URL for image:', value);
            return value;
          }
        }
        return value;
      } else if (type === 'color' && value) {
        // Return color value for CSS background
        return value;
      }
    }

    return null;
  }, [src, name, record, fields, type, urlSizeParam, size]);

  // Determine CSS classes for border styling
  const borderClass = useMemo(() => {
    if (border === 'rounded') return 'rounded';
    if (border === 'circle') return 'rounded-circle';
    return '';
  }, [border]);

  // Render color-based image
  if (type === 'color' && imageSrc) {
    return (
      <div
        className={`image-component image-color ${borderClass}`}
        style={{
          backgroundColor: imageSrc,
          width: `${size}px`,
          height: `${size}px`
        }}
        title={alt || imageSrc}
      />
    );
  }

  // Render URL-based image
  if (imageSrc) {
    return (
      <img
        src={imageSrc}
        alt={alt || name}
        className={`image-component ${borderClass}`}
        width={size}
        height={size}
        onError={(e) => {
          e.target.style.display = 'none';
          console.warn('Failed to load image:', imageSrc);
        }}
      />
    );
  }

  // No image to display
  return null;
}

export default ImageComponent;
