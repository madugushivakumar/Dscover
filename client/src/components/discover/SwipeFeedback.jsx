import React from 'react';

/**
 * Visual indicator badges overlaid on the card when dragging or animating.
 *
 * @param {Object} props
 * @param {number} props.dragRatio - Between -1.0 (full pass) and +1.0 (full like)
 * @param {'like' | 'pass' | null} [props.forcedAction]
 */
export function SwipeFeedback({ dragRatio = 0, forcedAction = null }) {
  let likeOpacity = 0;
  let passOpacity = 0;

  if (forcedAction === 'like') {
    likeOpacity = 1;
  } else if (forcedAction === 'pass') {
    passOpacity = 1;
  } else if (dragRatio > 0.1) {
    likeOpacity = Math.min(1, (dragRatio - 0.1) / 0.6);
  } else if (dragRatio < -0.1) {
    passOpacity = Math.min(1, (Math.abs(dragRatio) - 0.1) / 0.6);
  }

  return (
    <div className="swipe-feedback-container" aria-hidden="true">
      <div
        className="swipe-stamp stamp-like"
        style={{ opacity: likeOpacity, transform: `scale(${0.8 + likeOpacity * 0.2})` }}
      >
        LIKE
      </div>
      <div
        className="swipe-stamp stamp-pass"
        style={{ opacity: passOpacity, transform: `scale(${0.8 + passOpacity * 0.2})` }}
      >
        PASS
      </div>
    </div>
  );
}

export default SwipeFeedback;
