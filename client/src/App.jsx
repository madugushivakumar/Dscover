import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [currentPage, setCurrentPage] = useState('home');
  const [backendStatus, setBackendStatus] = useState({
    loading: true,
    connected: false,
    message: 'Checking connection...'
  });

  useEffect(() => {
    // Probe backend health endpoint via Vite proxy (/api/health)
    fetch('/api/health')
      .then((res) => {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}`);
        }
        return res.json();
      })
      .then((data) => {
        setBackendStatus({
          loading: false,
          connected: true,
          message: data.message || 'Connected to Coy Discover API'
        });
      })
      .catch((err) => {
        setBackendStatus({
          loading: false,
          connected: false,
          message: `Connection failed: ${err.message}`
        });
      });
  }, []);

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="brand">
          <span className="brand-icon">🔥</span>
          <span className="brand-title">Coy Discover</span>
        </div>
        <nav className="nav-links">
          <button
            className={`nav-button ${currentPage === 'home' ? 'active' : ''}`}
            onClick={() => setCurrentPage('home')}
          >
            Home
          </button>
          <button
            className={`nav-button ${currentPage === 'discover' ? 'active' : ''}`}
            onClick={() => setCurrentPage('discover')}
          >
            Discover
          </button>
        </nav>
      </header>

      <main className="main-content">
        {currentPage === 'home' ? (
          <section className="page-card">
            <span className="page-badge">Phase 1: Setup</span>
            <h1 className="page-title">Welcome to Coy Discover</h1>
            <p className="page-description">
              A standalone swipe-based profile discovery &amp; mutual matching platform.
              Environment initialization and development proxy verified.
            </p>

            <div className="status-box">
              <div className="status-row">
                <span className="status-label">Backend Health:</span>
                <span className="status-value">
                  <span
                    className={`status-indicator ${
                      backendStatus.loading
                        ? 'pending'
                        : backendStatus.connected
                        ? 'connected'
                        : 'error'
                    }`}
                  />
                  {backendStatus.loading
                    ? 'Checking...'
                    : backendStatus.connected
                    ? 'Online'
                    : 'Offline'}
                </span>
              </div>
              <div className="status-row">
                <span className="status-label">API Response:</span>
                <span className="status-value">{backendStatus.message}</span>
              </div>
            </div>
          </section>
        ) : (
          <section className="page-card">
            <span className="page-badge">Upcoming</span>
            <h1 className="page-title">Discover Mode</h1>
            <p className="page-description">
              Swipe-based profile cards, drag gestures, and mutual matching logic will be implemented in subsequent phases.
            </p>
          </section>
        )}
      </main>

      <footer className="footer">
        <p>Coy SDE Intern Assignment &bull; Phase 1 Environment Setup</p>
      </footer>
    </div>
  );
}

export default App;
