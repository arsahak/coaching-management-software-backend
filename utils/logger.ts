/**
 * Simple logger utility
 * Can be extended to use Winston or other logging libraries
 */

const isDevelopment = process.env.NODE_ENV === "development";

export const logger = {
  info: (message: string, ...args: any[]) => {
    console.log(`[INFO] ${message}`, ...args);
  },

  error: (message: string, error?: any) => {
    console.error(`[ERROR] ${message}`, error);
    // In production, you might want to send this to a logging service
    // like Sentry, LogRocket, etc.
  },

  warn: (message: string, ...args: any[]) => {
    console.warn(`[WARN] ${message}`, ...args);
  },

  debug: (message: string, ...args: any[]) => {
    if (isDevelopment) {
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  },

  /**
   * Sanitizes error for client response
   */
  sanitizeError: (error: any): string => {
    if (isDevelopment) {
      return error instanceof Error ? error.message : String(error);
    }
    // In production, return generic message
    return "An error occurred. Please try again later.";
  },
};
