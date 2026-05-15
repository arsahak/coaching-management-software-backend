/**
 * Validates Bangladesh phone number format
 * Format: 01XXXXXXXXX (11 digits)
 */
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false;
  const cleanPhone = phone.replace(/\s+/g, "").replace(/[()-]/g, "");
  return /^01[0-9]{9}$/.test(cleanPhone);
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

/** Escape HTML special characters (XSS mitigation) */
export function escapeHtml(input: string): string {
  if (!input) return "";
  return input
    .trim()
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

/**
 * Sanitizes string input to prevent XSS attacks
 */
export const sanitizeString = (input: string): string => {
  if (!input) return "";
  return escapeHtml(input);
};

/**
 * Sanitizes an array of strings
 */
export const sanitizeStringArray = (inputs: string[]): string[] => {
  if (!Array.isArray(inputs)) return [];
  return inputs.map((input) => sanitizeString(input)).filter(Boolean);
};

/**
 * Validates email format
 */
export const validateEmail = (email: string): boolean => {
  if (!email) return false;
  return EMAIL_REGEX.test(email.trim());
};

/**
 * Validates if a number is positive
 */
export const isPositiveNumber = (num: unknown): boolean => {
  const parsed = Number(num);
  return !isNaN(parsed) && parsed > 0;
};

/**
 * Formats phone number for display
 * Example: 01712345678 -> 01712-345678
 */
export const formatPhoneNumber = (phone: string): string => {
  const cleanPhone = phone.replace(/\s+/g, "").replace(/[()-]/g, "");
  if (cleanPhone.length === 11) {
    return `${cleanPhone.substring(0, 5)}-${cleanPhone.substring(5)}`;
  }
  return cleanPhone;
};

/**
 * Validates date is not in the future
 */
export const isValidPastDate = (date: Date | string): boolean => {
  const dateObj = new Date(date);
  return dateObj <= new Date();
};
