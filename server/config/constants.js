/**
 * Centralized application constants and identity configuration.
 * Controlled strictly on the backend.
 */
export const getDemoUserId = () => process.env.DEMO_USER_ID || 'demo-user';

export const SWIPE_ACTIONS = Object.freeze({
  LIKE: 'like',
  PASS: 'pass'
});

export const PUBLIC_PROFILE_FIELDS = '_id name age photo bio city interests';
