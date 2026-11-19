/**
 * Standardized API response format utilities.
 */

export const sendSuccess = (res, { status = 200, message, data, meta } = {}) => {
  const payload = {
    success: true
  };

  if (message) payload.message = message;
  if (data !== undefined) payload.data = data;
  if (meta !== undefined) payload.meta = meta;

  return res.status(status).json(payload);
};

export const sendError = (res, { status = 400, message = 'An error occurred', code = 'ERROR', details } = {}) => {
  const payload = {
    success: false,
    message,
    error: {
      code
    }
  };

  if (details && process.env.NODE_ENV !== 'production') {
    payload.error.details = details;
  }

  return res.status(status).json(payload);
};
