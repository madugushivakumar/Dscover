import React from 'react';

/**
 * Reusable user-friendly error display component.
 *
 * @param {Object} props
 * @param {string} [props.title='Something went wrong']
 * @param {string} props.message
 * @param {Function} [props.onRetry]
 */
export function ErrorMessage({
  title = 'Something went wrong',
  message,
  onRetry
}) {
  return (
    <div className="error-card" role="alert">
      <div className="error-icon" aria-hidden="true">⚠️</div>
      <h3 className="error-title">{title}</h3>
      <p className="error-message">{message || 'An unexpected error occurred. Please try again.'}</p>
      {onRetry && (
        <button
          type="button"
          className="btn-retry"
          onClick={onRetry}
          aria-label="Retry action"
        >
          Try Again
        </button>
      )}
    </div>
  );
}

export default ErrorMessage;
