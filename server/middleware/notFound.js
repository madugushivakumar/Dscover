import { sendError } from '../utils/apiResponse.js';

/**
 * Middleware handling unmapped routes (404 Not Found).
 */
export const notFound = (req, res) => {
  return sendError(res, {
    status: 404,
    message: `Resource not found: ${req.method} ${req.originalUrl}`,
    code: 'NOT_FOUND'
  });
};

export default notFound;
