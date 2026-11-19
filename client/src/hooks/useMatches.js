import { useState, useEffect, useCallback, useRef } from 'react';
import { getMatches } from '../services/matchService.js';

/**
 * Custom React hook managing the Matches page state.
 */
export function useMatches() {
  const [matches, setMatches] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const loadMatches = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await getMatches();
      if (isMountedRef.current) {
        setMatches(data.matches || []);
      }
    } catch (err) {
      if (isMountedRef.current) {
        setError(err.message || 'Failed to load matches.');
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    loadMatches();
  }, [loadMatches]);

  return {
    matches,
    count: matches.length,
    isLoading,
    error,
    refreshMatches: loadMatches
  };
}

export default useMatches;
