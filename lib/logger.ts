/**
 * Conditional logger that only logs in development environment
 * In production, logs are no-ops to reduce bundle size and avoid exposing sensitive data
 */

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: isDevelopment ? console.log : () => {},
  warn: isDevelopment ? console.warn : () => {},
  error: isDevelopment ? console.error : () => {},
  debug: isDevelopment ? console.debug : () => {},
  info: isDevelopment ? console.info : () => {},
};

export default logger;
