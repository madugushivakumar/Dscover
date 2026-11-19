/**
 * Wraps asynchronous route handlers to catch exceptions and forward to next() error middleware.
 * @param {Function} fn Async route handler
 * @returns {Function} Express middleware function
 */
export const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
