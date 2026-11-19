import React, { useState, useEffect, useCallback } from 'react';
import AppLayout from './components/layout/AppLayout.jsx';
import HomePage from './pages/HomePage.jsx';
import DiscoverPage from './pages/DiscoverPage.jsx';
import MatchesPage from './pages/MatchesPage.jsx';
import { getMatches } from './services/matchService.js';
import './App.css';

export function App() {
  const [currentPage, setCurrentPage] = useState('discover');
  const [matchCount, setMatchCount] = useState(0);

  // Sync match count badge quietly on mount and view switches
  const syncMatchCount = useCallback(async () => {
    try {
      const data = await getMatches();
      setMatchCount(data.count || 0);
    } catch {
      // Background count sync error is non-blocking
    }
  }, []);

  useEffect(() => {
    syncMatchCount();
  }, [syncMatchCount, currentPage]);

  const handleMatchSuccess = useCallback(() => {
    setMatchCount((prev) => prev + 1);
  }, []);

  return (
    <AppLayout
      currentPage={currentPage}
      onNavigate={setCurrentPage}
      matchCount={matchCount}
    >
      {currentPage === 'home' && <HomePage />}
      {currentPage === 'discover' && (
        <DiscoverPage
          onNavigateToMatches={() => setCurrentPage('matches')}
          onMatchSuccess={handleMatchSuccess}
        />
      )}
      {currentPage === 'matches' && (
        <MatchesPage onGoDiscover={() => setCurrentPage('discover')} />
      )}
    </AppLayout>
  );
}

export default App;
