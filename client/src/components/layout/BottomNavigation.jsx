import React from 'react';

/**
 * Mobile-first bottom navigation bar and desktop responsive nav.
 *
 * @param {Object} props
 * @param {string} props.currentPage - 'home' | 'discover' | 'matches'
 * @param {Function} props.onNavigate - (page: string) => void
 * @param {number} [props.matchCount=0]
 */
export function BottomNavigation({ currentPage, onNavigate, matchCount = 0 }) {
  const navItems = [
    {
      id: 'home',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      )
    },
    {
      id: 'discover',
      label: 'Discover',
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
        </svg>
      )
    },
    {
      id: 'matches',
      label: 'Matches',
      badge: matchCount > 0 ? matchCount : null,
      icon: (
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      )
    }
  ];

  return (
    <nav className="bottom-nav" aria-label="Main Navigation">
      <div className="bottom-nav-inner">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`nav-item ${isActive ? 'active' : ''}`}
              onClick={() => onNavigate(item.id)}
              aria-current={isActive ? 'page' : undefined}
              aria-label={item.label}
            >
              <div className="nav-icon-wrapper">
                {item.icon}
                {item.badge !== null && (
                  <span className="nav-badge" aria-label={`${item.badge} new matches`}>
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </div>
              <span className="nav-label">{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

export default BottomNavigation;
