/**
 * Parse JSON data into a structured format for display
 * @param {any} data - The data to parse
 * @param {number} depth - Current depth level
 * @returns {Array} Array of parsed items for rendering
 */
export const parseJsonToList = (data, depth = 0) => {
  const items = [];
  
  if (data === null || data === undefined) {
    return [{ type: 'value', value: 'null', depth }];
  }
  
  if (typeof data !== 'object') {
    return [{ type: 'value', value: String(data), depth }];
  }
  
  if (Array.isArray(data)) {
    data.forEach((item, index) => {
      if (typeof item === 'object' && item !== null) {
        items.push({ type: 'array-item', index, depth });
        items.push(...parseJsonToList(item, depth + 1));
      } else {
        items.push({ type: 'array-value', index, value: String(item), depth });
      }
    });
    return items;
  }
  
  Object.entries(data).forEach(([key, value]) => {
    if (typeof value === 'object' && value !== null) {
      items.push({ type: 'object-key', key, depth, hasChildren: true });
      items.push(...parseJsonToList(value, depth + 1));
    } else {
      items.push({ type: 'key-value', key, value: formatValue(value), depth });
    }
  });
  
  return items;
};

/**
 * Format a value for display
 */
const formatValue = (value) => {
  if (value === null) return 'null';
  if (value === undefined) return 'undefined';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString();
  return String(value);
};

/**
 * Format a key name to be more readable
 */
export const formatKeyName = (key) => {
  return key
    .replace(/_/g, ' ')
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

/**
 * Get color class based on value type or content
 */
export const getValueColor = (value, key = '') => {
  const lowerKey = key.toLowerCase();
  const strValue = String(value).toLowerCase();
  
  // Status colors
  if (lowerKey.includes('status') || lowerKey.includes('state')) {
    if (strValue === 'running' || strValue === 'online' || strValue === 'active') {
      return 'text-green-400';
    }
    if (strValue === 'stopped' || strValue === 'offline' || strValue === 'exited') {
      return 'text-red-400';
    }
    if (strValue === 'pending' || strValue === 'starting') {
      return 'text-yellow-400';
    }
  }
  
  // Boolean colors
  if (value === true || strValue === 'yes') return 'text-green-400';
  if (value === false || strValue === 'no') return 'text-red-400';
  
  // Number colors
  if (typeof value === 'number') return 'text-blue-400';
  
  return 'text-gray-300';
};
