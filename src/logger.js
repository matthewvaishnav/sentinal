/**
 * Structured Logging Module
 * 
 * Provides production-grade logging with Winston:
 * - Structured JSON logs for machine parsing
 * - Multiple log levels (error, warn, info, debug)
 * - File rotation and console output
 * - Integration with log aggregation systems (ELK, Splunk)
 */

const winston = require('winston');
const path = require('path');

// Log levels: error (0), warn (1), info (2), debug (3)
const LOG_LEVEL = process.env.LOG_LEVEL || 'info';

// Create logs directory if it doesn't exist
const fs = require('fs');
const logsDir = path.join(__dirname, '..', 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

// Custom format for console output (human-readable)
const consoleFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.colorize(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let msg = `${timestamp} [${level}] ${message}`;
    
    // Add metadata if present
    if (Object.keys(meta).length > 0) {
      msg += ` ${JSON.stringify(meta)}`;
    }
    
    return msg;
  })
);

// JSON format for file output (machine-readable)
const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create Winston logger
const logger = winston.createLogger({
  level: LOG_LEVEL,
  defaultMeta: { service: 'sentinel' },
  transports: [
    // Error logs (only errors)
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // Combined logs (all levels)
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 5
    }),
    
    // Console output (human-readable)
    new winston.transports.Console({
      format: consoleFormat
    })
  ]
});

// Convenience methods for common log patterns
const log = {
  // General logging
  error: (message, meta = {}) => logger.error(message, meta),
  warn: (message, meta = {}) => logger.warn(message, meta),
  info: (message, meta = {}) => logger.info(message, meta),
  debug: (message, meta = {}) => logger.debug(message, meta),
  
  // Security events
  block: (ip, reason, durationMs, meta = {}) => {
    logger.warn('IP blocked', {
      event: 'block',
      ip,
      reason,
      durationMs,
      durationSecs: Math.round(durationMs / 1000),
      ...meta
    });
  },
  
  honeypot: (ip, path, meta = {}) => {
    logger.warn('Honeypot triggered', {
      event: 'honeypot',
      ip,
      path,
      ...meta
    });
  },
  
  threat: (ip, severity, reason, meta = {}) => {
    const level = severity === 'critical' ? 'error' : 'warn';
    logger[level]('Threat detected', {
      event: 'threat',
      ip,
      severity,
      reason,
      ...meta
    });
  },
  
  // API events
  apiRequest: (method, path, ip, apiKey, meta = {}) => {
    logger.info('API request', {
      event: 'api_request',
      method,
      path,
      ip,
      apiKeyHash: apiKey ? apiKey.substring(0, 8) : null,
      ...meta
    });
  },
  
  apiRateLimit: (ip, apiKey, retryAfter, meta = {}) => {
    logger.warn('API rate limit exceeded', {
      event: 'api_rate_limit',
      ip,
      apiKeyHash: apiKey ? apiKey.substring(0, 8) : null,
      retryAfter,
      ...meta
    });
  },
  
  // System events
  startup: (config) => {
    logger.info('SENTINEL starting', {
      event: 'startup',
      port: config.port,
      logLevel: LOG_LEVEL,
      layers: config.layers || 12
    });
  },
  
  shutdown: (reason = 'unknown') => {
    logger.info('SENTINEL shutting down', {
      event: 'shutdown',
      reason
    });
  },
  
  // Performance metrics
  performance: (component, metric, value, meta = {}) => {
    logger.debug('Performance metric', {
      event: 'performance',
      component,
      metric,
      value,
      ...meta
    });
  },
  
  // CSRF events
  csrfValidation: (valid, ip, reason = null, meta = {}) => {
    if (!valid) {
      logger.warn('CSRF validation failed', {
        event: 'csrf_validation_failed',
        ip,
        reason,
        ...meta
      });
    } else {
      logger.debug('CSRF validation passed', {
        event: 'csrf_validation_passed',
        ip,
        ...meta
      });
    }
  }
};

module.exports = log;
