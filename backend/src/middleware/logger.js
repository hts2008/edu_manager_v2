/**
 * Request logger middleware
 */
export function requestLogger(req, res, next) {
  const start = Date.now();
  
  // Log on response finish
  res.on('finish', () => {
    const duration = Date.now() - start;
    const { method, originalUrl } = req;
    const { statusCode } = res;
    
    // Color based on status
    let statusColor = '\x1b[32m'; // Green for 2xx
    if (statusCode >= 400) statusColor = '\x1b[33m'; // Yellow for 4xx
    if (statusCode >= 500) statusColor = '\x1b[31m'; // Red for 5xx
    
    console.log(
      `${statusColor}${method}\x1b[0m ${originalUrl} - ${statusCode} (${duration}ms)`
    );
  });
  
  next();
}
