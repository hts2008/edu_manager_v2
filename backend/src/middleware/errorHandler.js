/**
 * Error handler middleware
 */
export function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  console.error(err.stack);
  
  // Default error
  let statusCode = err.statusCode || 500;
  let errorCode = err.code || 'INTERNAL_ERROR';
  let message = err.message || 'Internal server error';
  
  // Validation errors
  if (err.name === 'ValidationError') {
    statusCode = 400;
    errorCode = 'VALIDATION_ERROR';
  }
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    errorCode = 'INVALID_TOKEN';
    message = 'Invalid authentication token';
  }
  
  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    errorCode = 'TOKEN_EXPIRED';
    message = 'Authentication token has expired';
  }
  
  // SQLite errors
  if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    statusCode = 409;
    errorCode = 'DUPLICATE_ENTRY';
    message = 'A record with this value already exists';
  }
  
  res.status(statusCode).json({
    success: false,
    error: {
      code: errorCode,
      message: message,
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
}

/**
 * Not found handler
 */
export function notFoundHandler(req, res) {
  res.status(404).json({
    success: false,
    error: {
      code: 'NOT_FOUND',
      message: `Route ${req.method} ${req.path} not found`
    }
  });
}

/**
 * Create custom error
 */
export class AppError extends Error {
  constructor(message, statusCode = 400, code = 'APP_ERROR') {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    Error.captureStackTrace(this, this.constructor);
  }
}
