/**
 * Validates email format
 * @param email - Email address to validate
 * @returns true if valid, false otherwise
 */
export const isValidEmail = (email: string): boolean => {
  if (!email || !email.trim()) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
};

/**
 * Validates required field
 * @param value - Field value to validate
 * @returns true if field has value, false otherwise
 */
export const isRequired = (value: string): boolean => {
  return !!value && value.trim().length > 0;
};

/**
 * Validates email and returns error message if invalid
 * @param email - Email address to validate
 * @returns Error message or undefined if valid
 */
export const validateEmail = (email: string): string | undefined => {
  if (!isRequired(email)) {
    return 'Email is required';
  }
  if (!isValidEmail(email)) {
    return 'Please enter a valid email address';
  }
  return undefined;
};

/**
 * Validates required field and returns error message if invalid
 * @param value - Field value to validate
 * @param fieldName - Name of the field for error message
 * @returns Error message or undefined if valid
 */
export const validateRequired = (value: string, fieldName: string): string | undefined => {
  if (!isRequired(value)) {
    return `${fieldName} is required`;
  }
  return undefined;
};

/**
 * Checks if role indicates disqualified lead
 * @param roleTitle - Role/title to check
 * @returns true if disqualified, false otherwise
 */
export const isDisqualifiedRole = (roleTitle: string): boolean => {
  const disqualifyingRoles = ['student', 'unemployed', 'job seeker', 'looking for work'];
  const role = roleTitle.toLowerCase();
  return disqualifyingRoles.some(term => role.includes(term));
};
