import React from 'react';
import { useFeed } from '../hooks/useFeed.js';
import ProfileCard from '../components/discover/ProfileCard.jsx';
import SwipeActions from '../components/discover/SwipeActions.jsx';
import EmptyFeed from '../components/discover/EmptyFeed.jsx';
import MatchModal from '../components/discover/MatchModal.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';

/**
 * Primary Profile Discovery interface.
 * Displays one active profile at a time with touch gestures and desktop action buttons.
 *
 * @param {Object} props
 * @param {Function} props.onNavigateToMatches - Navigation callback to switch view to Matches
 * @param {Function} [props.onMatchSuccess] - Callback when mutual match is confirmed
 */
export function DiscoverPage({ onNavigateToMatches, onMatchSuccess }) {
  const {
    activeProfile,
    isLoading,
    error,
    isPending,
    animatingExit,
    activeMatch,
    handleSwipe,
    dismissMatch,
    refreshFeed
  } = useFeed({ onMatchCreated: onMatchSuccess });

  if (isLoading) {
    return (
      <div className="discover-loading-view">
        <LoadingSpinner message="Finding interesting people nearby..." size="lg" />
      </div>
    );
  }

  if (error && !activeProfile) {
    return (
      <div className="discover-error-view">
        <ErrorMessage
          title="Could not load profiles"
          message={error}
          onRetry={refreshFeed}
        />
      </div>
    );
  }

  if (!activeProfile) {
    return (
      <div className="discover-empty-view">
        <EmptyFeed
          onRefresh={refreshFeed}
          onViewMatches={onNavigateToMatches}
        />
      </div>
    );
  }

  return (
    <div className="discover-page-container">
      {/* Ephemeral swipe error toast (keeps profile card intact) */}
      {error && (
        <div className="swipe-error-toast" role="alert">
          <span>⚠️ {error}</span>
          <button
            type="button"
            className="btn-toast-dismiss"
            onClick={refreshFeed}
            aria-label="Dismiss error"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Single Active Profile Card Stack */}
      <div className="card-stage" aria-live="polite">
        <ProfileCard
          profile={activeProfile}
          onSwipe={handleSwipe}
          disabled={isPending}
          animatingExit={animatingExit}
        />
      </div>

      {/* Prominent Desktop & Mobile Swipe Action Controls */}
      <SwipeActions
        onPass={() => handleSwipe('pass')}
        onLike={() => handleSwipe('like')}
        disabled={isPending}
      />

      {/* Mutual Match Celebration Modal */}
      <MatchModal
        isOpen={Boolean(activeMatch)}
        matchData={activeMatch}
        onClose={dismissMatch}
        onViewMatches={onNavigateToMatches}
      />
    </div>
  );
}

export default DiscoverPage;
