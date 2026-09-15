// Logger untuk error handling dan debugging
// Mode: development = log ke console, production = bisa diintegrasikan dengan service monitoring

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

export interface LogEntry {
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

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Format log entry ke JSON string
 */
function formatLog(entry: LogEntry): string {
  return JSON.stringify(entry);
}

/**
 * Log fungsi utama - digunakan di seluruh aplikasi
 */
export function log(
  level: LogLevel,
  message: string,
  context?: Record<string, unknown>,
  error?: Error
): void {
  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(error && {
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }),
  };

  // Development: log ke console dengan warna
  if (isDevelopment) {
    const logFn = console[level] || console.log;
    logFn(`[${level.toUpperCase()}] ${message}`, context || '', error || '');
  }

  // Production: output JSON untuk diparsing oleh log aggregator
  // Di Netlify, ini akan muncul di Functions logs
  if (!isDevelopment) {
    console.log(formatLog(entry));
  }
}

// Helper functions untuk berbagai level log
export const debug = (message: string, context?: Record<string, unknown>) =>
  log('debug', message, context);

export const info = (message: string, context?: Record<string, unknown>) =>
  log('info', message, context);

export const warn = (message: string, context?: Record<string, unknown>) =>
  log('warn', message, context);

export const error = (
  message: string,
  error?: Error,
  context?: Record<string, unknown>
) => log('error', message, context, error);

/**
 * Error Handler wrapper untuk API routes
 * Menangkap error, log, dan return response yang aman
 */
export async function handleApiError<T>(
  fn: () => Promise<T>,
  errorMessage: string
): Promise<{ success: boolean; data?: T; error?: string }> {
  try {
    const data = await fn();
    return { success: true, data };
  } catch (err) {
    const errObj = err instanceof Error ? err : new Error(String(err));
    error(errorMessage, errObj, { stack: errObj.stack });
    
    // Return error message yang aman (tidak expose detail internal ke client)
    return {
      success: false,
      error: isDevelopment ? errObj.message : 'Terjadi kesalahan pada server',
    };
  }
}

/**
 * Middleware logging untuk API requests
 */
export function logRequest(
  method: string,
  path: string,
  statusCode: number,
  durationMs: number
): void {
  info('API Request', {
    method,
    path,
    statusCode,
    durationMs,
  });
}

/**
 * Track business events penting
 */
export function trackEvent(
  eventName: string,
  metadata?: Record<string, unknown>
): void {
  info(`Event: ${eventName}`, metadata);
}
