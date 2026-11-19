import React, { useEffect, useRef } from 'react';

/**
 * Mutual Match Celebration Modal / Overlay.
 *
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is visible
 * @param {Object} props.matchData - Match details from backend (name, photo)
 * @param {Function} props.onClose - Dismiss modal
 * @param {Function} [props.onViewMatches] - Navigate to matches view
 */
export function MatchModal({ isOpen, matchData, onClose, onViewMatches }) {
  const dismissBtnRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // Focus dismiss button for keyboard accessibility
      dismissBtnRef.current?.focus();

      // Close on Escape key
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
          onClose();
        }
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, onClose]);

  if (!isOpen || !matchData) return null;

  const { name, photo } = matchData;
  const fallbackPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';

  return (
    <div
      className="match-modal-backdrop"
      role="dialog"
      aria-modal="true"
      aria-labelledby="match-modal-title"
      onClick={onClose}
    >
      <div
        className="match-modal-content"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="match-confetti" aria-hidden="true">🎉</div>
        <h2 id="match-modal-title" className="match-title">
          It's a match!
        </h2>
        <p className="match-subtitle">
          You and <span className="matched-person-name">{name}</span> liked each other!
        </p>

        <div className="match-avatar-wrapper">
          <div className="avatar-ring">
            <img
              src={photo || fallbackPhoto}
              alt={name}
              className="matched-avatar"
            />
          </div>
          <span className="heart-badge" aria-hidden="true">💖</span>
        </div>

        <div className="match-modal-actions">
          {onViewMatches && (
            <button
              type="button"
              className="btn-modal-matches"
              onClick={() => {
                onClose();
                onViewMatches();
              }}
              aria-label="Go to Matches view"
            >
              View in Matches
            </button>
          )}
          <button
            ref={dismissBtnRef}
            type="button"
            className="btn-modal-dismiss"
            onClick={onClose}
            aria-label="Keep swiping"
          >
            Keep Swiping
          </button>
        </div>
      </div>
    </div>
  );
}

export default MatchModal;
