/**
 * Structured logging utility for API routes
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  userId?: string;
  eventId?: string;
  registrationId?: string;
  ip?: string;
  action?: string;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

function createLogEntry(
  level: LogLevel,
  message: string,
  context?: LogContext,
  error?: Error
): LogEntry {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
  
  if (context && Object.keys(context).length > 0) {
    entry.context = context;
  }
  
  if (error) {
    entry.error = {
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    };
  }
  
  return entry;
}

export const logger = {
  debug(message: string, context?: LogContext) {
    if (process.env.NODE_ENV === 'development') {
      console.debug(formatLog(createLogEntry('debug', message, context)));
    }
  },
  
  info(message: string, context?: LogContext) {
    console.info(formatLog(createLogEntry('info', message, context)));
  },
  
  warn(message: string, context?: LogContext) {
    console.warn(formatLog(createLogEntry('warn', message, context)));
  },
  
  error(message: string, error?: Error, context?: LogContext) {
    console.error(formatLog(createLogEntry('error', message, context, error)));
  },
  
  // Convenience method for API request logging
  request(method: string, path: string, context?: LogContext) {
    this.info(`${method} ${path}`, { action: 'request', ...context });
  },
  
  // Convenience method for API response logging
  response(method: string, path: string, statusCode: number, context?: LogContext) {
    const level: LogLevel = statusCode >= 500 ? 'error' : statusCode >= 400 ? 'warn' : 'info';
    const msg = `${method} ${path} -> ${statusCode}`;
    const ctx = { action: 'response', statusCode, ...context };
    if (level === 'error') {
      this.error(msg, undefined, ctx);
    } else if (level === 'warn') {
      this.warn(msg, ctx);
    } else {
      this.info(msg, ctx);
    }
  },
};

/**
 * Create a scoped logger with pre-filled context
 */
export function createLogger(baseContext: LogContext) {
  return {
    debug(message: string, context?: LogContext) {
      logger.debug(message, { ...baseContext, ...context });
    },
    info(message: string, context?: LogContext) {
      logger.info(message, { ...baseContext, ...context });
    },
    warn(message: string, context?: LogContext) {
      logger.warn(message, { ...baseContext, ...context });
    },
    error(message: string, error?: Error, context?: LogContext) {
      logger.error(message, error, { ...baseContext, ...context });
    },
  };
}
