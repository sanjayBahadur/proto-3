type LogLevel = "info" | "warn" | "error";

interface LogContext {
  userId?: string;
  action?: string;
  propertyId?: string;
  [key: string]: unknown;
}

function formatMessage(level: LogLevel, message: string, context?: LogContext): string {
  const timestamp = new Date().toISOString();
  const contextStr = context ? ` ${JSON.stringify(context)}` : "";
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${contextStr}`;
}

export const logger = {
  info(message: string, context?: LogContext) {
    console.log(formatMessage("info", message, context));
  },

  warn(message: string, context?: LogContext) {
    console.warn(formatMessage("warn", message, context));
  },

  error(message: string, error?: Error | unknown, context?: LogContext) {
    const errorContext = {
      ...context,
      errorMessage: error instanceof Error ? error.message : String(error),
      errorStack: error instanceof Error ? error.stack : undefined,
    };
    console.error(formatMessage("error", message, errorContext));
  },

  /**
   * Log API/database errors with structured context
   */
  apiError(action: string, error: unknown, context?: LogContext) {
    this.error(`API Error: ${action}`, error, { action, ...context });
  },

  /**
   * Log unauthorized access attempts
   */
  unauthorized(action: string, context?: LogContext) {
    this.warn(`Unauthorized access attempt: ${action}`, { action, ...context });
  },
};

