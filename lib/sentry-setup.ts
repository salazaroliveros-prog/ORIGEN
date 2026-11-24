// lib/sentry-setup.ts
// Sentry error tracking and monitoring

import * as Sentry from "@sentry/nextjs";

export function initSentry() {
  Sentry.init({
    // Sentry DSN (from environment)
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

    // Environment
    environment: process.env.NODE_ENV || "development",

    // Release version
    release: process.env.NEXT_PUBLIC_APP_VERSION || "1.0.0",

    // Tracing
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Performance monitoring
    integrations: [
      new Sentry.Replay({
        maskAllText: true,
        blockAllMedia: true,
      }),
      new Sentry.CaptureConsole({
        levels: ["error", "warn"],
      }),
    ],

    // Replay configuration
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Before sending
    beforeSend(event, hint) {
      // Filter out certain errors
      if (event.exception) {
        const error = hint.originalException;

        // Ignore network errors in development
        if (process.env.NODE_ENV === "development") {
          if (error instanceof Error && error.message.includes("Network")) {
            return null;
          }
        }

        // Ignore specific console errors
        if (error instanceof Error) {
          if (
            error.message.includes("ResizeObserver") ||
            error.message.includes("Non-Error promise rejection")
          ) {
            return null;
          }
        }
      }

      return event;
    },

    // Ignore certain URLs
    ignoreErrors: [
      "Network request failed",
      "NetworkError",
      "TimeoutError",
      "Non-Error promise rejection captured",
    ],

    // Server-side options
    serverName: "origen-erp-app",

    // Attach stack traces
    attachStacktrace: true,

    // Max breadcrumbs
    maxBreadcrumbs: 50,

    // Request filtering
    sendDefaultPii: false,

    // Source maps
    sourceMaps: {
      enable: true,
      stripCommonPrefix: true,
    },
  });
}

// Enhanced error logging
export function logError(
  error: Error | string,
  context: Record<string, any> = {},
  level: Sentry.SeverityLevel = "error"
) {
  if (typeof error === "string") {
    Sentry.captureMessage(error, level);
  } else {
    Sentry.captureException(error, {
      level,
      contexts: {
        custom: context,
      },
    });
  }
}

// Log warnings
export function logWarning(message: string, context: Record<string, any> = {}) {
  Sentry.captureMessage(message, "warning");
  Sentry.setContext("warning_context", context);
}

// Log info messages
export function logInfo(message: string, context: Record<string, any> = {}) {
  Sentry.captureMessage(message, "info");
  Sentry.setContext("info_context", context);
}

// API call monitoring
export function monitorApiCall(
  endpoint: string,
  method: string,
  startTime: number,
  statusCode: number,
  success: boolean
) {
  const duration = Date.now() - startTime;

  Sentry.addBreadcrumb({
    category: "api",
    message: `${method} ${endpoint}`,
    level: success ? "info" : "error",
    data: {
      status_code: statusCode,
      duration_ms: duration,
      success: success,
    },
  });

  if (!success) {
    logError(`API Error: ${method} ${endpoint} - Status ${statusCode}`, {
      endpoint,
      method,
      status_code: statusCode,
      duration_ms: duration,
    });
  }
}

// User action tracking
export function trackUserAction(
  action: string,
  details: Record<string, any> = {}
) {
  Sentry.addBreadcrumb({
    category: "user-action",
    message: action,
    level: "info",
    data: details,
  });
}

// Performance transaction tracking
export function startTransaction(name: string) {
  const transaction = Sentry.startTransaction({
    name: name,
    op: "http.request",
  });

  return {
    end: () => transaction.finish(),
    setData: (key: string, value: any) => transaction.setData(key, value),
    addEvent: (message: string, data?: Record<string, any>) =>
      transaction.addEvent(message, data),
  };
}

// CRUD operations monitoring
export const CRUDMonitoring = {
  projectCreated: (projectId: string, duration: number) => {
    Sentry.addBreadcrumb({
      category: "crud",
      message: "Project created",
      level: "info",
      data: {
        project_id: projectId,
        duration_ms: duration,
      },
    });
  },

  projectUpdated: (projectId: string, fieldsChanged: number, duration: number) => {
    Sentry.addBreadcrumb({
      category: "crud",
      message: "Project updated",
      level: "info",
      data: {
        project_id: projectId,
        fields_changed: fieldsChanged,
        duration_ms: duration,
      },
    });
  },

  projectDeleted: (projectId: string) => {
    Sentry.addBreadcrumb({
      category: "crud",
      message: "Project deleted",
      level: "info",
      data: {
        project_id: projectId,
      },
    });
  },
};

// Database monitoring
export const DatabaseMonitoring = {
  queryExecuted: (operation: string, duration: number, success: boolean) => {
    Sentry.addBreadcrumb({
      category: "database",
      message: `${operation} query`,
      level: success ? "info" : "error",
      data: {
        operation,
        duration_ms: duration,
        success,
      },
    });
  },

  connectionError: (error: Error, attemptNumber: number) => {
    logError(`Database connection error (attempt ${attemptNumber})`, {
      error: error.message,
      attempt: attemptNumber,
    });
  },
};

// Authentication monitoring
export const AuthMonitoring = {
  loginAttempted: (userId?: string, success: boolean = true) => {
    Sentry.addBreadcrumb({
      category: "auth",
      message: success ? "Login successful" : "Login failed",
      level: success ? "info" : "warning",
      data: {
        user_id: userId,
      },
    });
  },

  logoutCompleted: (userId: string) => {
    Sentry.addBreadcrumb({
      category: "auth",
      message: "Logout completed",
      level: "info",
      data: {
        user_id: userId,
      },
    });
  },

  sessionCreated: (sessionId: string) => {
    Sentry.setUser({
      id: sessionId,
    });
  },

  sessionExpired: () => {
    Sentry.captureMessage("Session expired", "warning");
  },
};

// Set user context (call after login)
export function setUserContext(userId: string, email?: string, name?: string) {
  Sentry.setUser({
    id: userId,
    email: email,
    username: name,
  });
}

// Clear user context (call on logout)
export function clearUserContext() {
  Sentry.setUser(null);
}

// Set custom context
export function setContext(contextName: string, context: Record<string, any>) {
  Sentry.setContext(contextName, context);
}

// Set tags for filtering
export function setTag(key: string, value: string) {
  Sentry.setTag(key, value);
}

// Set level for all future events
export function setLevel(level: Sentry.SeverityLevel) {
  // Individual level setting per event
}
