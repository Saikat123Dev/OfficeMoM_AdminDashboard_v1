// Enhanced error handler middleware
function errorHandler(err, req, res, next) {
  console.error('Error Details:', {
    message: err.message,
    stack: err.stack,
    url: req.url,
    method: req.method,
    body: req.body,
    query: req.query,
    params: req.params
  });

  // MySQL errors
  if (err.code) {
    switch (err.code) {
      case 'ER_DUP_ENTRY':
        return res.status(409).json({
          success: false,
          error: 'Duplicate entry found',
          details: 'This record already exists in the database'
        });
      
      case 'ER_NO_REFERENCED_ROW':
      case 'ER_ROW_IS_REFERENCED':
        return res.status(409).json({
          success: false,
          error: 'Database constraint error',
          details: 'This operation would violate database constraints'
        });
      
      case 'ER_BAD_FIELD_ERROR':
        return res.status(400).json({
          success: false,
          error: 'Invalid field name',
          details: 'One or more field names are invalid'
        });
      
      case 'ER_PARSE_ERROR':
        return res.status(400).json({
          success: false,
          error: 'Database query error',
          details: 'There was an error in the database query'
        });
    }
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      error: 'Invalid authentication token'
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      error: 'Authentication token expired'
    });
  }

  // Validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.details || err.message
    });
  }

  if (err.type === 'entity.too.large' || err.name === 'PayloadTooLargeError') {
    return res.status(413).json({
      success: false,
      error: 'Request payload too large',
      details: 'Please reduce content size (for example, use uploaded image URLs instead of embedded base64 images)'
    });
  }

  // Default to 500 server error
  const errorResponse = {
    success: false,
    error: 'Internal server error'
  };

  // Include error details in development
  if (process.env.NODE_ENV !== 'production') {
    errorResponse.details = err.message;
    errorResponse.stack = err.stack;
  }

  res.status(err.status || 500).json(errorResponse);
}

module.exports = errorHandler;
