/**
 * Email verification and password reset token utilities
 */

const crypto = require('crypto');

/**
 * Generate a secure verification token
 * @returns {string} 32-character hex token
 */
const generateVerificationToken = () => {
  return crypto.randomBytes(16).toString('hex');
};

/**
 * Generate token hash for storage (more secure than storing plain token)
 * @param {string} token - The token to hash
 * @returns {string} SHA256 hash of the token
 */
const hashToken = (token) => {
  return crypto.createHash('sha256').update(token).digest('hex');
};

/**
 * Calculate token expiry time (24 hours from now)
 * @returns {Date} Expiry date
 */
const getTokenExpiry = (hoursFromNow = 24) => {
  const now = new Date();
  now.setHours(now.getHours() + hoursFromNow);
  return now;
};

/**
 * Check if token is expired
 * @param {Date} expiryDate - Token expiry date
 * @returns {boolean} True if token is expired
 */
const isTokenExpired = (expiryDate) => {
  return new Date() > expiryDate;
};

module.exports = {
  generateVerificationToken,
  hashToken,
  getTokenExpiry,
  isTokenExpired,
};
