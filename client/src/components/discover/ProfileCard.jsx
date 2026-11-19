import React, { useState, useRef, useEffect } from 'react';
import SwipeFeedback from './SwipeFeedback.jsx';

const SWIPE_THRESHOLD = 90; // Pixels required to trigger swipe
const ROTATION_FACTOR = 0.08; // Degrees of rotation per pixel dragged

/**
 * Interactive Profile Card with mobile touch/pointer gesture support.
 *
 * @param {Object} props
 * @param {Object} props.profile - Profile object
 * @param {Function} props.onSwipe - (direction: 'like' | 'pass') => void
 * @param {boolean} props.disabled - Disables dragging while an action is pending
 * @param {'like' | 'pass' | null} [props.animatingExit=null] - Direction for programmatically triggered exit
 */
export function ProfileCard({ profile, onSwipe, disabled, animatingExit = null }) {
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [imageError, setImageError] = useState(false);

  const startPosRef = useRef({ x: 0, y: 0 });
  const currentOffsetRef = useRef({ x: 0, y: 0 });
  const cardRef = useRef(null);
  const isHorizontalDragRef = useRef(false);

  // Reset image error when profile changes
  useEffect(() => {
    setImageError(false);
    setDragOffset({ x: 0, y: 0 });
    setIsDragging(false);
  }, [profile?._id]);

  if (!profile) return null;

  const { name, age, city, bio, interests = [], photo } = profile;

  // Calculate drag progress (-1 for full pass, +1 for full like)
  const dragRatio = Math.max(-1, Math.min(1, dragOffset.x / SWIPE_THRESHOLD));

  const handlePointerDown = (e) => {
    if (disabled || animatingExit) return;
    // Only primary button (left click or touch)
    if (e.button !== 0) return;

    startPosRef.current = { x: e.clientX, y: e.clientY };
    currentOffsetRef.current = { x: 0, y: 0 };
    isHorizontalDragRef.current = false;
    setIsDragging(true);

    if (cardRef.current) {
      cardRef.current.setPointerCapture(e.pointerId);
    }
  };

  const handlePointerMove = (e) => {
    if (!isDragging || disabled || animatingExit) return;

    const dx = e.clientX - startPosRef.current.x;
    const dy = e.clientY - startPosRef.current.y;

    // Detect primary direction
    if (!isHorizontalDragRef.current) {
      if (Math.abs(dx) > 8 && Math.abs(dx) > Math.abs(dy)) {
        isHorizontalDragRef.current = true;
      } else if (Math.abs(dy) > 12) {
        // Vertical scroll intent detected; release drag
        setIsDragging(false);
        setDragOffset({ x: 0, y: 0 });
        return;
      }
    }

    if (isHorizontalDragRef.current) {
      currentOffsetRef.current = { x: dx, y: dy * 0.3 };
      setDragOffset({ x: dx, y: dy * 0.3 });
    }
  };

  const finishDrag = (pointerId) => {
    if (!isDragging) return;
    setIsDragging(false);

    if (cardRef.current && pointerId !== undefined) {
      try {
        cardRef.current.releasePointerCapture(pointerId);
      } catch {
        // Ignored if already released
      }
    }

    const { x } = currentOffsetRef.current;
    if (x > SWIPE_THRESHOLD) {
      // Swiped right -> LIKE
      onSwipe('like');
    } else if (x < -SWIPE_THRESHOLD) {
      // Swiped left -> PASS
      onSwipe('pass');
    } else {
      // Below threshold -> Snap back to center
      setDragOffset({ x: 0, y: 0 });
    }
  };

  const handlePointerUp = (e) => finishDrag(e.pointerId);
  const handlePointerCancel = (e) => finishDrag(e.pointerId);

  // Compute transform
  let transformStyle = '';
  let transitionStyle = isDragging ? 'none' : 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)';

  if (animatingExit === 'like') {
    transformStyle = 'translate3d(140%, 20px, 0) rotate(22deg)';
    transitionStyle = 'transform 0.4s ease-in, opacity 0.35s ease-in';
  } else if (animatingExit === 'pass') {
    transformStyle = 'translate3d(-140%, 20px, 0) rotate(-22deg)';
    transitionStyle = 'transform 0.4s ease-in, opacity 0.35s ease-in';
  } else if (isDragging || dragOffset.x !== 0) {
    const rotate = dragOffset.x * ROTATION_FACTOR;
    transformStyle = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotate}deg)`;
  }

  const fallbackPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';

  return (
    <div
      ref={cardRef}
      className={`profile-card ${isDragging ? 'is-dragging' : ''} ${animatingExit ? 'animating-exit' : ''}`}
      style={{
        transform: transformStyle,
        transition: transitionStyle,
        touchAction: 'pan-y'
      }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerCancel}
      role="region"
      aria-label={`Profile of ${name}, age ${age}`}
    >
      {/* Visual Swipe Stamp Overlays */}
      <SwipeFeedback dragRatio={dragRatio} forcedAction={animatingExit} />

      {/* Profile Image & Gradient Shadow */}
      <div className="card-media">
        <img
          src={!imageError && photo ? photo : fallbackPhoto}
          alt={`${name}'s photo`}
          className="profile-photo"
          loading="eager"
          onError={() => setImageError(true)}
          draggable="false"
        />
        <div className="card-gradient-overlay" />
      </div>

      {/* Profile Details Container */}
      <div className="card-details">
        <div className="details-header">
          <h2 className="profile-name-age">
            <span className="profile-name">{name}</span>
            <span className="profile-age">{age}</span>
          </h2>
          {city && (
            <p className="profile-location">
              <span className="location-icon" aria-hidden="true">📍</span> {city}
            </p>
          )}
        </div>

        {bio && <p className="profile-bio">{bio}</p>}

        {interests && interests.length > 0 && (
          <div className="profile-interests" aria-label="Interests">
            {interests.map((interest, idx) => (
              <span key={idx} className="interest-tag">
                {interest}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default ProfileCard;
