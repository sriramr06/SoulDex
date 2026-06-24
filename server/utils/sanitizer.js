/**
 * Input sanitization utilities to prevent XSS and injection attacks
 */

const sanitizeText = (text) => {
  if (typeof text !== 'string') return text;

  return text
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

const sanitizeEmail = (email) => {
  if (typeof email !== 'string') return email;

  return email.toLowerCase().trim().replace(/[<>]/g, '');
};

const sanitizeUrl = (url) => {
  if (typeof url !== 'string') return url;

  try {
    new URL(url);
    return url;
  } catch {
    return '';
  }
};

/**
 * Deep sanitize object - recursively sanitize all string values
 */
const sanitizeObject = (obj) => {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return sanitizeText(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object') {
    const sanitized = {};
    for (const key in obj) {
      if (Object.prototype.hasOwnProperty.call(obj, key)) {
        sanitized[key] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
};

module.exports = {
  sanitizeText,
  sanitizeEmail,
  sanitizeUrl,
  sanitizeObject,
};
