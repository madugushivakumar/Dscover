import React from 'react';

/**
 * Privacy-safe empty state for Matches page.
 *
 * @param {Object} props
 * @param {Function} [props.onGoDiscover]
 */
export function EmptyMatches({ onGoDiscover }) {
  return (
    <div className="empty-matches-container" role="region" aria-label="No matches">
      <div className="empty-heart-ring" aria-hidden="true">
        <span className="heart-icon">💫</span>
      </div>
      <h2 className="empty-matches-title">No matches yet</h2>
      <p className="empty-matches-desc">
        Keep discovering profiles to find a mutual connection. When you and someone else both like each other, they'll appear here!
      </p>

      {onGoDiscover && (
        <button
          type="button"
          className="btn-start-discovering"
          onClick={onGoDiscover}
          aria-label="Start discovering profiles"
        >
          Start Discovering
        </button>
      )}
    </div>
  );
}

export default EmptyMatches;
