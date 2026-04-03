import logger from '../utils/logger.js';

export const errorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', { error: err.message, stack: err.stack, path: req.path });

  if (err.name === 'ValidationError' || err.isZodError) {
    return res.status(400).json({ error: 'Validation failed', details: err.errors || err.message });
  }

  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 20}MB` });
  }

  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({ error: 'Unexpected file field' });
  }

  const status = err.status || err.statusCode || 500;
  const message = status < 500 ? err.message : 'Internal server error';

  res.status(status).json({ error: message, ...(process.env.NODE_ENV === 'development' && { stack: err.stack }) });
};
