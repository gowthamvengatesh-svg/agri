export function errorHandler(err, req, res, next) {
  console.error('Error:', err);

  if (err.name === 'ValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.message
    });
  }

  if (err.code === 'PERMISSION_DENIED') {
    return res.status(403).json({
      error: 'Permission denied'
    });
  }

  if (err.code === 'NOT_FOUND') {
    return res.status(404).json({
      error: 'Resource not found'
    });
  }

  res.status(err.status || 500).json({
    error: err.message || 'Internal server error'
  });
}

export function asyncHandler(fn) {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
