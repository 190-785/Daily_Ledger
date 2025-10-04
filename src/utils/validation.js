/**
 * Input Validation Utilities
 * Comprehensive validation functions for form inputs
 */

/**
 * Validate email format
 */
export function validateEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  
  if (!email) {
    return { valid: false, error: 'Email is required' };
  }
  
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }
  
  return { valid: true };
}

/**
 * Validate password strength
 */
export function validatePassword(password) {
  if (!password) {
    return { valid: false, error: 'Password is required' };
  }
  
  if (password.length < 6) {
    return { valid: false, error: 'Password must be at least 6 characters' };
  }
  
  if (password.length > 128) {
    return { valid: false, error: 'Password is too long (max 128 characters)' };
  }
  
  return { valid: true };
}

/**
 * Validate username format
 */
export function validateUsername(username) {
  const usernameRegex = /^[a-z0-9_]{3,20}$/;
  
  if (!username) {
    return { valid: false, error: 'Username is required' };
  }
  
  if (!usernameRegex.test(username)) {
    return { 
      valid: false, 
      error: '3-20 characters, lowercase letters, numbers, and underscores only' 
    };
  }
  
  return { valid: true };
}

/**
 * Validate name (display name, member name)
 */
export function validateName(name, fieldName = 'Name') {
  if (!name) {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 1) {
    return { valid: false, error: `${fieldName} cannot be empty` };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: `${fieldName} is too long (max 100 characters)` };
  }
  
  return { valid: true };
}

/**
 * Validate amount (payment amount, set amount)
 */
export function validateAmount(amount, fieldName = 'Amount') {
  if (amount === null || amount === undefined || amount === '') {
    return { valid: false, error: `${fieldName} is required` };
  }
  
  const numAmount = Number(amount);
  
  if (isNaN(numAmount)) {
    return { valid: false, error: `${fieldName} must be a number` };
  }
  
  if (numAmount < 0) {
    return { valid: false, error: `${fieldName} cannot be negative` };
  }
  
  if (numAmount > 1000000) {
    return { valid: false, error: `${fieldName} is too large (max 1,000,000)` };
  }
  
  return { valid: true };
}

/**
 * Validate date string
 */
export function validateDate(dateString) {
  if (!dateString) {
    return { valid: false, error: 'Date is required' };
  }
  
  const date = new Date(dateString);
  
  if (isNaN(date.getTime())) {
    return { valid: false, error: 'Invalid date format' };
  }
  
  // Check if date is not too far in the past or future
  const now = new Date();
  const minDate = new Date('2020-01-01');
  const maxDate = new Date(now.getFullYear() + 10, 11, 31);
  
  if (date < minDate) {
    return { valid: false, error: 'Date is too far in the past' };
  }
  
  if (date > maxDate) {
    return { valid: false, error: 'Date is too far in the future' };
  }
  
  return { valid: true };
}

/**
 * Validate list name
 */
export function validateListName(name) {
  if (!name) {
    return { valid: false, error: 'List name is required' };
  }
  
  const trimmed = name.trim();
  
  if (trimmed.length < 1) {
    return { valid: false, error: 'List name cannot be empty' };
  }
  
  if (trimmed.length > 100) {
    return { valid: false, error: 'List name is too long (max 100 characters)' };
  }
  
  return { valid: true };
}

/**
 * Sanitize string input (remove potentially harmful characters)
 */
export function sanitizeString(str) {
  if (!str) return '';
  
  return str
    .trim()
    .replace(/[<>]/g, '') // Remove < and >
    .slice(0, 500); // Max length
}

/**
 * Sanitize amount input
 */
export function sanitizeAmount(amount) {
  const num = Number(amount);
  if (isNaN(num)) return 0;
  return Math.max(0, Math.min(1000000, Math.round(num * 100) / 100)); // 2 decimal places
}

/**
 * Validate array of member IDs
 */
export function validateMemberIds(memberIds) {
  if (!Array.isArray(memberIds)) {
    return { valid: false, error: 'Member IDs must be an array' };
  }
  
  if (memberIds.length === 0) {
    return { valid: false, error: 'At least one member must be selected' };
  }
  
  if (memberIds.length > 1000) {
    return { valid: false, error: 'Too many members selected (max 1000)' };
  }
  
  // Check all IDs are strings
  if (!memberIds.every(id => typeof id === 'string')) {
    return { valid: false, error: 'Invalid member ID format' };
  }
  
  return { valid: true };
}

/**
 * Validate share type
 */
export function validateShareType(shareType) {
  const validTypes = ['view-only', 'collection-entry', 'full-access'];
  
  if (!shareType) {
    return { valid: false, error: 'Share type is required' };
  }
  
  if (!validTypes.includes(shareType)) {
    return { valid: false, error: 'Invalid share type' };
  }
  
  return { valid: true };
}

/**
 * Validate permission level
 */
export function validatePermission(permission) {
  const validPermissions = ['summary-only', 'full-details'];
  
  if (!permission) {
    return { valid: false, error: 'Permission level is required' };
  }
  
  if (!validPermissions.includes(permission)) {
    return { valid: false, error: 'Invalid permission level' };
  }
  
  return { valid: true };
}

/**
 * Batch validate multiple fields
 */
export function validateFields(fields) {
  const errors = {};
  let isValid = true;
  
  for (const [fieldName, { value, validator, ...options }] of Object.entries(fields)) {
    const result = validator(value, options.fieldName || fieldName);
    if (!result.valid) {
      errors[fieldName] = result.error;
      isValid = false;
    }
  }
  
  return { valid: isValid, errors };
}
