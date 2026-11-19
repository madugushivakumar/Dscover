import { apiRequest } from './api.js';

/**
 * Records an outgoing swipe (like or pass) on a profile.
 *
 * @param {string} profileId - Target profile ObjectId
 * @param {'like' | 'pass'} action - Swipe action
 * @returns {Promise<Object>} Backend swipe processing result
 */
export async function swipeProfile(profileId, action) {
  if (!profileId) {
    throw new Error('Profile ID is required to swipe.');
  }
  if (action !== 'like' && action !== 'pass') {
    throw new Error('Swipe action must be either "like" or "pass".');
  }

  const response = await apiRequest('/swipe', {
    method: 'POST',
    body: {
      profileId,
      action
    }
  });

  return response.data;
}

export default {
  swipeProfile
};
