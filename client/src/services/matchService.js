import { apiRequest } from './api.js';

/**
 * Retrieves all confirmed mutual matches for the demo user.
 *
 * @returns {Promise<{ matches: Array<Object>, count: number }>}
 */
export async function getMatches() {
  const response = await apiRequest('/matches');
  return {
    matches: response.data || [],
    count: response.meta?.count ?? (response.data?.length || 0),
    message: response.message
  };
}

export default {
  getMatches
};
