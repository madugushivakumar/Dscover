import React from 'react';

/**
 * Home page placeholder.
 * Intentionally kept as a clean, minimal placeholder per project specifications.
 */
export function HomePage() {
  return (
    <div className="home-placeholder-container" aria-label="Home page">
      <div className="placeholder-content">
        <div className="placeholder-icon" aria-hidden="true">🏠</div>
        <h1 className="placeholder-title">Home</h1>
        <p className="placeholder-text">
          Welcome to Coy Discover. Navigate to Discover to explore profiles and make connections.
        </p>
      </div>
    </div>
  );
}

export default HomePage;
