import React, { useState } from 'react';

/**
 * Formats ISO date string to readable match time.
 */
function formatMatchDate(dateString) {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';

    return date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  } catch {
    return '';
  }
}

/**
 * Confirmed mutual match presentation card.
 *
 * @param {Object} props
 * @param {Object} props.match - Match document { _id, profile, matchedAt }
 */
export function MatchCard({ match }) {
  const [imageError, setImageError] = useState(false);

  if (!match || !match.profile) return null;

  const { profile, matchedAt } = match;
  const { name, age, city, bio, interests = [], photo } = profile;
  const formattedDate = formatMatchDate(matchedAt);
  const fallbackPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';

  return (
    <article className="match-card" aria-label={`Match with ${name}`}>
      <div className="match-card-media">
        <img
          src={!imageError && photo ? photo : fallbackPhoto}
          alt={`${name}'s photo`}
          className="match-card-image"
          onError={() => setImageError(true)}
          loading="lazy"
        />
        <div className="match-badge">Mutual Match</div>
      </div>

      <div className="match-card-content">
        <div className="match-card-header">
          <h3 className="match-person-title">
            <span className="match-name">{name}</span>, <span className="match-age">{age}</span>
          </h3>
          {formattedDate && (
            <time className="match-timestamp" dateTime={matchedAt}>
              Matched {formattedDate}
            </time>
          )}
        </div>

        {city && (
          <p className="match-location">
            <span aria-hidden="true">📍</span> {city}
          </p>
        )}

        {bio && <p className="match-bio">{bio}</p>}

        {interests && interests.length > 0 && (
          <div className="match-interests" aria-label="Interests">
            {interests.slice(0, 3).map((item, idx) => (
              <span key={idx} className="match-interest-tag">
                {item}
              </span>
            ))}
            {interests.length > 3 && (
              <span className="match-interest-more">+{interests.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

export default MatchCard;
