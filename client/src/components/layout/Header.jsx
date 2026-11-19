import React from 'react';

const PAGE_TITLES = {
  home: 'Home',
  discover: 'Discover Profiles',
  matches: 'Your Matches'
};

/**
 * Reusable application header.
 *
 * @param {Object} props
 * @param {string} props.currentPage - 'home' | 'discover' | 'matches'
 * @param {number} [props.matchCount=0]
 */
export function Header({ currentPage, matchCount = 0 }) {
  return (
    <header className="app-header">
      <div className="brand">
        <span className="brand-icon" role="img" aria-label="Flame logo">🔥</span>
        <span className="brand-title">Coy Discover</span>
      </div>
      <div className="header-page-title" aria-live="polite">
        <span className="current-view-name">{PAGE_TITLES[currentPage] || 'Discover'}</span>
        {currentPage === 'matches' && matchCount > 0 && (
          <span className="match-pill" aria-label={`${matchCount} matches`}>{matchCount}</span>
        )}
      </div>
    </header>
  );
}

export default Header;
