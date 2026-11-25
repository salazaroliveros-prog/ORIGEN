/**
 * Conditional logger that sends errors to Sentry in production
 * and logs to console in development. Never suppresses errors in production.
 */

import * as Sentry from '@sentry/nextjs';

const isDevelopment = process.env.NODE_ENV === 'development';

const logger = {
  log: (...args: unknown[]) => {
    if (isDevelopment) {
      console.log(...args);
    } else {
      Sentry.captureMessage(args.map(String).join(' '), 'info');
    }
  },
  warn: (...args: unknown[]) => {
    if (isDevelopment) {
      console.warn(...args);
    } else {
      Sentry.captureMessage(args.map(String).join(' '), 'warning');
    }
  },
  error: (...args: unknown[]) => {
    const message = args.map(String).join(' ');
    if (isDevelopment) {
      console.error(...args);
    } else {
      const last = args[args.length - 1];
      if (last instanceof Error) {
        Sentry.captureException(last);
      } else {
        Sentry.captureMessage(message, 'error');
      }
    }
  },
  debug: (...args: unknown[]) => {
    if (isDevelopment) {
      console.debug(...args);
    }
    // Sentry does not have a debug level; skip in production
  },
  info: (...args: unknown[]) => {
    if (isDevelopment) {
      console.info(...args);
    } else {
      Sentry.captureMessage(args.map(String).join(' '), 'info');
    }
  },
};

export default logger;
