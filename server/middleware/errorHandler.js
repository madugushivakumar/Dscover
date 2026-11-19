import { sendError } from '../utils/apiResponse.js';

/**
 * Centralized application error handling middleware.
 */
export const errorHandler = (err, req, res, next) => {
  // If response headers are already sent, delegate to Express default handler
  if (res.headersSent) {
    return next(err);
  }

  // Handle oversized JSON payload (exceeding body limit)
  if (err.type === 'entity.too.large' || err.status === 413) {
    return sendError(res, {
      status: 413,
      message: 'Payload too large. Request body exceeds maximum allowed size.',
      code: 'PAYLOAD_TOO_LARGE'
    });
  }

  // Handle malformed JSON body
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    return sendError(res, {
      status: 400,
      message: 'Malformed JSON payload in request body.',
      code: 'INVALID_JSON'
    });
  }

  // Handle Mongoose CastError (e.g. malformed ObjectId)
  if (err.name === 'CastError') {
    return sendError(res, {
      status: 400,
      message: `Invalid format for field: ${err.path}`,
      code: 'INVALID_ID'
    });
  }

  // Handle Mongoose ValidationError
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map((e) => e.message);
    return sendError(res, {
      status: 400,
      message: messages.join(', ') || 'Validation error',
      code: 'VALIDATION_ERROR'
    });
  }

  // Handle MongoDB Duplicate Key Error (E11000)
  if (err.code === 11000) {
    return sendError(res, {
      status: 409,
      message: 'Duplicate record exists in database.',
      code: 'DUPLICATE_RECORD'
    });
  }

  // Custom application error
  const status = err.statusCode || err.status || 500;
  const message = err.message || 'Internal server error occurred.';
  const code = err.code || 'INTERNAL_SERVER_ERROR';

  if (status >= 500) {
    console.error(`[Server Error] ${req.method} ${req.originalUrl}:`, err);
  }

  return sendError(res, {
    status,
    message: status === 500 && process.env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : message,
    code,
    details: err.details
  });
};

export default errorHandler;
