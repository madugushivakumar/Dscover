import React from 'react';

/**
 * Desktop & mobile action buttons for Pass and Like.
 *
 * @param {Object} props
 * @param {Function} props.onPass - () => void
 * @param {Function} props.onLike - () => void
 * @param {boolean} props.disabled - Disables buttons when swipe is pending
 */
export function SwipeActions({ onPass, onLike, disabled = false }) {
  return (
    <div className="swipe-actions-container" role="group" aria-label="Profile actions">
      <button
        type="button"
        className="action-btn btn-pass"
        onClick={onPass}
        disabled={disabled}
        aria-label="Pass on this profile (or swipe left)"
        title="Pass (Swipe Left)"
      >
        <span className="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </span>
        <span className="btn-label">Pass</span>
      </button>

      <button
        type="button"
        className="action-btn btn-like"
        onClick={onLike}
        disabled={disabled}
        aria-label="Like this profile (or swipe right)"
        title="Like (Swipe Right)"
      >
        <span className="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
        </span>
        <span className="btn-label">Like</span>
      </button>
    </div>
  );
}

export default SwipeActions;
