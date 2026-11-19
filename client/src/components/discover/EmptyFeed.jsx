import React from 'react';

/**
 * Empty feed presentation when all profiles have been discovered.
 *
 * @param {Object} props
 * @param {Function} [props.onRefresh]
 * @param {Function} [props.onViewMatches]
 */
export function EmptyFeed({ onRefresh, onViewMatches }) {
  return (
    <div className="empty-feed-card" role="region" aria-label="No more profiles">
      <div className="empty-icon-pulse" aria-hidden="true">
        <span className="empty-symbol">✨</span>
      </div>
      <h2 className="empty-title">You're all caught up!</h2>
      <p className="empty-description">
        There are no more profiles to discover right now. Check back soon for new profiles or view your mutual matches!
      </p>

      <div className="empty-actions">
        {onRefresh && (
          <button
            type="button"
            className="btn-refresh-feed"
            onClick={onRefresh}
            aria-label="Check for new profiles"
          >
            Check Again
          </button>
        )}
        {onViewMatches && (
          <button
            type="button"
            className="btn-view-matches"
            onClick={onViewMatches}
            aria-label="View your mutual matches"
          >
            View Matches
          </button>
        )}
      </div>
    </div>
  );
}

export default EmptyFeed;
