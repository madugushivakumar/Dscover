import React from 'react';

/**
 * Reusable accessible loading spinner.
 *
 * @param {Object} props
 * @param {string} [props.message='Loading...']
 * @param {'sm' | 'md' | 'lg'} [props.size='md']
 */
export function LoadingSpinner({ message = 'Loading...', size = 'md' }) {
  return (
    <div className={`loading-container size-${size}`} role="status" aria-live="polite">
      <div className="spinner-ring" aria-hidden="true" />
      {message && <p className="loading-message">{message}</p>}
      <span className="sr-only">Loading</span>
    </div>
  );
}

export default LoadingSpinner;
