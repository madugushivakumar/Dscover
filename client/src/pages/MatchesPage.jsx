import React from 'react';
import { useMatches } from '../hooks/useMatches.js';
import MatchCard from '../components/matches/MatchCard.jsx';
import EmptyMatches from '../components/matches/EmptyMatches.jsx';
import LoadingSpinner from '../components/common/LoadingSpinner.jsx';
import ErrorMessage from '../components/common/ErrorMessage.jsx';

/**
 * Confirmed Mutual Matches View.
 * Displays only confirmed mutual connections.
 *
 * @param {Object} props
 * @param {Function} props.onGoDiscover - Navigation callback to switch view to Discover
 */
export function MatchesPage({ onGoDiscover }) {
  const { matches, count, isLoading, error, refreshMatches } = useMatches();

  if (isLoading) {
    return (
      <div className="matches-loading-view">
        <LoadingSpinner message="Loading your mutual matches..." size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="matches-error-view">
        <ErrorMessage
          title="Could not load matches"
          message={error}
          onRetry={refreshMatches}
        />
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="matches-empty-view">
        <EmptyMatches onGoDiscover={onGoDiscover} />
      </div>
    );
  }

  return (
    <div className="matches-page-container">
      <header className="matches-header-bar">
        <h2 className="matches-subtitle">
          Mutual Connections <span className="matches-count-badge">({count})</span>
        </h2>
        <button
          type="button"
          className="btn-refresh-matches"
          onClick={refreshMatches}
          aria-label="Refresh matches list"
          title="Refresh matches"
        >
          🔄 Refresh
        </button>
      </header>

      <div className="matches-grid" role="feed" aria-label="Confirmed matches">
        {matches.map((match) => (
          <MatchCard key={match._id || match.profile._id} match={match} />
        ))}
      </div>
    </div>
  );
}

export default MatchesPage;
