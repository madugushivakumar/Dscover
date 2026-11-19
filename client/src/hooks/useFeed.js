import { useState, useEffect, useCallback, useRef } from 'react';
import { getFeed } from '../services/feedService.js';
import { swipeProfile } from '../services/swipeService.js';

/**
 * Custom React hook managing the Discover Feed state and swipe interactions.
 *
 * @param {Object} [options]
 * @param {Function} [options.onMatchCreated] - Callback when mutual match is confirmed
 */
export function useFeed({ onMatchCreated } = {}) {
  const [profiles, setProfiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPending, setIsPending] = useState(false);
  const [animatingExit, setAnimatingExit] = useState(null);
  const [activeMatch, setActiveMatch] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadFeed = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getFeed();
      if (isMountedRef.current) {
        setProfiles(data.profiles || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load discover profiles.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadFeed();
  }, [loadFeed]);

  /**
   * Performs an outgoing swipe (like or pass) on the current active profile.
   *
   * @param {'like' | 'pass'} action
   */
  const handleSwipe = useCallback(
    async (action) => {
      if (isPending || profiles.length === 0) return;

      const currentProfile = profiles[0];
      const targetId = currentProfile._id;

      // Lock interaction and trigger visual exit animation
      setIsPending(true);
      setAnimatingExit(action);
      setError(null);

      try {
        const result = await swipeProfile(targetId, action);

        // Small timeout to allow exit animation to complete smoothly
        await new Promise((resolve) => setTimeout(resolve, 300));

        if (!isMountedRef.current) return;

        // Backend confirmed swipe: remove profile from active feed
        setProfiles((prev) => prev.slice(1));
        setAnimatingExit(null);
        setIsPending(false);

        // If backend explicitly confirms a mutual match:
        if (result && result.matched) {
          const matchPayload = result.match || {
            profileId: currentProfile._id,
            name: currentProfile.name,
            photo: currentProfile.photo
          };
          setActiveMatch(matchPayload);
          if (typeof onMatchCreated === 'function') {
            onMatchCreated(matchPayload);
          }
        }
      } catch (err) {
        if (!isMountedRef.current) return;

        // If 409 duplicate swipe, the profile was already swiped on backend: advance safely
        if (err.status === 409 || err.code === 'DUPLICATE_SWIPE') {
          setProfiles((prev) => prev.slice(1));
          setAnimatingExit(null);
          setIsPending(false);
          return;
        }

        // Normal error: snap card back and show error without dropping profile
        setAnimatingExit(null);
        setIsPending(false);
        setError(err.message || 'Failed to record swipe. Please try again.');
      }
    },
    [isPending, profiles, onMatchCreated]
  );

  const dismissMatch = useCallback(() => {
    setActiveMatch(null);
  }, []);

  const activeProfile = profiles.length > 0 ? profiles[0] : null;

  return {
    profiles,
    activeProfile,
    isLoading,
    error,
    isPending,
    animatingExit,
    activeMatch,
    handleSwipe,
    dismissMatch,
    refreshFeed: loadFeed
  };
}

export default useFeed;
