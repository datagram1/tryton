import { XMLParser } from 'fast-xml-parser';

/**
 * XML Parser for Tryton view definitions
 * Converts XML arch string to JSON structure
 */

// Parser configuration
const parserOptions = {
  ignoreAttributes: false,
  attributeNamePrefix: '',
  textNodeName: '_text',
  parseAttributeValue: true,
  parseTagValue: true,
  trimValues: true,
  cdataPropName: '_cdata',
  parseTrueNumberOnly: true,
  arrayMode: false,
  alwaysCreateTextNode: false,
  isArray: (tagName, jPath, isLeafNode, isAttribute) => {
    // Always treat certain tags as arrays even if there's only one
    const arrayTags = ['field', 'label', 'button', 'page', 'separator', 'group'];
    return arrayTags.includes(tagName);
  },
};

const parser = new XMLParser(parserOptions);

/**
 * Parse XML arch string into JSON structure
 * @param {string} archXml - XML architecture string
 * @returns {Object} - Parsed JSON structure
 */
export function parseViewXml(archXml) {
  if (!archXml) {
    return null;
  }

  try {
    const result = parser.parse(archXml);
    return result;
  } catch (error) {
    console.error('Failed to parse XML:', error);
    throw new Error(`XML parsing failed: ${error.message}`);
  }
}

/**
 * Normalize parsed XML to a consistent structure
 * Ensures all nodes have tag, attrs, and children properties
 * @param {Object} node - Parsed XML node
 * @param {string} tagName - Tag name for this node
 * @returns {Object} - Normalized node
 */
export function normalizeNode(node, tagName = null) {
  if (!node || typeof node !== 'object') {
    return null;
  }

  const normalized = {
    tag: tagName,
    attrs: {},
    children: [],
  };

  // Extract attributes and children
  Object.keys(node).forEach((key) => {
    if (key === '_text') {
      // Text content
      normalized.text = node[key];
    } else if (typeof node[key] === 'object' && !Array.isArray(node[key])) {
      // Nested object - it's a child node
      const childNode = normalizeNode(node[key], key);
      if (childNode) {
        normalized.children.push(childNode);
      }
    } else if (Array.isArray(node[key])) {
      // Array of child nodes
      node[key].forEach((item) => {
        const childNode = normalizeNode(item, key);
        if (childNode) {
          normalized.children.push(childNode);
        }
      });
    } else {
      // Primitive value - it's an attribute
      normalized.attrs[key] = node[key];
    }
  });

  return normalized;
}

/**
 * Extract the root view node from parsed XML
 * @param {Object} parsedXml - Parsed XML object
 * @returns {Object} - Root view node
 */
export function extractRootNode(parsedXml) {
  if (!parsedXml) {
    return null;
  }

  // The root is typically 'form', 'tree', 'graph', etc.
  const rootKeys = Object.keys(parsedXml);
  if (rootKeys.length === 0) {
    return null;
  }

  const rootKey = rootKeys[0];
  return normalizeNode(parsedXml[rootKey], rootKey);
}

/**
 * Parse and normalize a view XML architecture
 * @param {string} archXml - XML architecture string
 * @returns {Object} - Normalized view tree
 */
export function parseAndNormalizeView(archXml) {
  const parsed = parseViewXml(archXml);
  return extractRootNode(parsed);
}

/**
 * Helper to get attribute value from node
 * @param {Object} node - Normalized node
 * @param {string} attrName - Attribute name
 * @param {any} defaultValue - Default value if attribute not found
 * @returns {any} - Attribute value
 */
export function getNodeAttr(node, attrName, defaultValue = null) {
  if (!node || !node.attrs) {
    return defaultValue;
  }
  return node.attrs[attrName] !== undefined ? node.attrs[attrName] : defaultValue;
}

/**
 * Check if node has a specific attribute
 * @param {Object} node - Normalized node
 * @param {string} attrName - Attribute name
 * @returns {boolean}
 */
export function hasNodeAttr(node, attrName) {
  return node && node.attrs && node.attrs[attrName] !== undefined;
}

/**
 * Filter child nodes by tag name
 * @param {Object} node - Normalized node
 * @param {string} tagName - Tag name to filter by
 * @returns {Array} - Filtered children
 */
export function getChildrenByTag(node, tagName) {
  if (!node || !node.children) {
    return [];
  }
  return node.children.filter((child) => child.tag === tagName);
}

export default {
  parseViewXml,
  normalizeNode,
  extractRootNode,
  parseAndNormalizeView,
  getNodeAttr,
  hasNodeAttr,
  getChildrenByTag,
};
