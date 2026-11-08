/**
 * Centralized logging utility
 * Provides structured logging with levels and filtering
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  module: string;
  message: string;
  data?: any;
  error?: Error;
}

class Logger {
  private logs: LogEntry[] = [];
  private maxLogs = 1000; // Keep last 1000 logs in memory
  private minLevel: LogLevel = 'info';

  constructor(minLevel: LogLevel = 'info') {
    this.minLevel = minLevel;
    if (process.env.NODE_ENV === 'development') {
      this.minLevel = 'debug';
    }
  }

  private getLevelPriority(level: LogLevel): number {
    const priorities = { debug: 0, info: 1, warn: 2, error: 3 };
    return priorities[level];
  }

  private shouldLog(level: LogLevel): boolean {
    return this.getLevelPriority(level) >= this.getLevelPriority(this.minLevel);
  }

  private createEntry(level: LogLevel, module: string, message: string, data?: any): LogEntry {
    return {
      level,
      timestamp: new Date().toISOString(),
      module,
      message,
      data,
    };
  }

  private output(entry: LogEntry): void {
    // Add to memory
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Output to console
    const prefix = `[${entry.module}]`;
    const logFn = {
      debug: console.debug,
      info: console.info,
      warn: console.warn,
      error: console.error,
    }[entry.level];

    if (entry.data) {
      logFn(`${prefix} ${entry.message}`, entry.data);
    } else {
      logFn(`${prefix} ${entry.message}`);
    }

    // Send to error tracking service (if configured)
    if (entry.level === 'error') {
      this.sendToErrorTracking(entry);
    }
  }

  private sendToErrorTracking(entry: LogEntry): void {
    // Placeholder for error tracking integration (e.g., Sentry)
    // Example: Sentry.captureMessage(entry.message, 'error');
    if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
      // Send to Sentry or other service
    }
  }

  debug(module: string, message: string, data?: any): void {
    if (this.shouldLog('debug')) {
      this.output(this.createEntry('debug', module, message, data));
    }
  }

  info(module: string, message: string, data?: any): void {
    if (this.shouldLog('info')) {
      this.output(this.createEntry('info', module, message, data));
    }
  }

  warn(module: string, message: string, data?: any): void {
    if (this.shouldLog('warn')) {
      this.output(this.createEntry('warn', module, message, data));
    }
  }

  error(module: string, message: string, error?: Error | any, data?: any): void {
    if (this.shouldLog('error')) {
      const entry = this.createEntry('error', module, message, data);
      if (error instanceof Error) {
        entry.error = error;
      }
      this.output(entry);
    }
  }

  /**
   * Get logs for export/debugging
   */
  getLogs(level?: LogLevel, module?: string): LogEntry[] {
    return this.logs.filter(
      (log) => (!level || log.level === level) && (!module || log.module === module)
    );
  }

  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = [];
  }

  /**
   * Export logs as JSON
   */
  exportJSON(): string {
    return JSON.stringify(this.logs, null, 2);
  }

  /**
   * Set minimum log level
   */
  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }
}

// Singleton instance
export const logger = new Logger((process.env.NEXT_PUBLIC_LOG_LEVEL as LogLevel) || 'info');

/**
 * Create scoped logger for a specific module
 */
export function createLogger(moduleName: string) {
  return {
    debug: (message: string, data?: any) => logger.debug(moduleName, message, data),
    info: (message: string, data?: any) => logger.info(moduleName, message, data),
    warn: (message: string, data?: any) => logger.warn(moduleName, message, data),
    error: (message: string, error?: Error | any, data?: any) =>
      logger.error(moduleName, message, error, data),
  };
}

export default logger;
