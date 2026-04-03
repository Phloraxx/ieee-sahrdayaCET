// ============================================================================
// Logger Module
// ============================================================================

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
    timestamp: string;
    level: LogLevel;
    message: string;
    context?: Record<string, unknown>;
    error?: {
        name: string;
        message: string;
        stack?: string;
    };
}

const LOG_LEVELS: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    warn: 2,
    error: 3,
};

// Get minimum log level from environment
const getMinLogLevel = (): LogLevel => {
    const envLevel = process.env.LOG_LEVEL?.toLowerCase() as LogLevel;
    if (envLevel && LOG_LEVELS[envLevel] !== undefined) {
        return envLevel;
    }
    return process.env.NODE_ENV === 'production' ? 'info' : 'debug';
};

const minLogLevel = getMinLogLevel();

const shouldLog = (level: LogLevel): boolean => {
    return LOG_LEVELS[level] >= LOG_LEVELS[minLogLevel];
};

const formatLogEntry = (entry: LogEntry): string => {
    if (process.env.NODE_ENV === 'production') {
        // Structured JSON logging for production
        return JSON.stringify(entry);
    }

    // Human-readable format for development
    const parts = [
        `[${entry.timestamp}]`,
        `[${entry.level.toUpperCase()}]`,
        entry.message,
    ];

    if (entry.context && Object.keys(entry.context).length > 0) {
        parts.push(JSON.stringify(entry.context));
    }

    if (entry.error) {
        parts.push(`\n  Error: ${entry.error.name}: ${entry.error.message}`);
        if (entry.error.stack) {
            parts.push(`\n  Stack: ${entry.error.stack.split('\n').slice(1, 4).join('\n    ')}`);
        }
    }

    return parts.join(' ');
};

const createLogEntry = (
    level: LogLevel,
    message: string,
    error?: Error,
    context?: Record<string, unknown>
): LogEntry => {
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
            stack: error.stack,
        };
    }

    return entry;
};

const log = (level: LogLevel, message: string, error?: Error, context?: Record<string, unknown>): void => {
    if (!shouldLog(level)) return;

    const entry = createLogEntry(level, message, error, context);
    const formattedLog = formatLogEntry(entry);

    switch (level) {
        case 'debug':
        case 'info':
            console.log(formattedLog);
            break;
        case 'warn':
            console.warn(formattedLog);
            break;
        case 'error':
            console.error(formattedLog);
            break;
    }
};

export const logger = {
    debug: (message: string, context?: Record<string, unknown>) => {
        log('debug', message, undefined, context);
    },

    info: (message: string, context?: Record<string, unknown>) => {
        log('info', message, undefined, context);
    },

    warn: (message: string, context?: Record<string, unknown>) => {
        log('warn', message, undefined, context);
    },

    error: (message: string, error?: Error, context?: Record<string, unknown>) => {
        log('error', message, error, context);
    },

    // Helper to create a child logger with preset context
    child: (defaultContext: Record<string, unknown>) => ({
        debug: (message: string, context?: Record<string, unknown>) => {
            log('debug', message, undefined, { ...defaultContext, ...context });
        },
        info: (message: string, context?: Record<string, unknown>) => {
            log('info', message, undefined, { ...defaultContext, ...context });
        },
        warn: (message: string, context?: Record<string, unknown>) => {
            log('warn', message, undefined, { ...defaultContext, ...context });
        },
        error: (message: string, error?: Error, context?: Record<string, unknown>) => {
            log('error', message, error, { ...defaultContext, ...context });
        },
    }),
};

export default logger;
