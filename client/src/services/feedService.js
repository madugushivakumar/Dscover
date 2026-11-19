import { apiRequest } from './api.js';

/**
 * Fetches unswiped discovery profiles for the demo user.
 *
 * @returns {Promise<{ profiles: Array<Object>, count: number }>}
 */
export async function getFeed() {
  const response = await apiRequest('/feed');
  return {
    profiles: response.data || [],
    count: response.meta?.count ?? (response.data?.length || 0),
    message: response.message
  };
}

export default {
  getFeed
};
