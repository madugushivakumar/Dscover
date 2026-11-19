import React from 'react';
import Header from './Header.jsx';
import BottomNavigation from './BottomNavigation.jsx';

/**
 * Main application shell layout.
 *
 * @param {Object} props
 * @param {string} props.currentPage
 * @param {Function} props.onNavigate
 * @param {number} [props.matchCount=0]
 * @param {React.ReactNode} props.children
 */
export function AppLayout({ currentPage, onNavigate, matchCount = 0, children }) {
  return (
    <div className="app-shell">
      <Header currentPage={currentPage} matchCount={matchCount} />
      <main className="app-main" id="main-content">
        {children}
      </main>
      <BottomNavigation
        currentPage={currentPage}
        onNavigate={onNavigate}
        matchCount={matchCount}
      />
    </div>
  );
}

export default AppLayout;
