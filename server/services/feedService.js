import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import { PUBLIC_PROFILE_FIELDS } from '../config/constants.js';

/**
 * Retrieves discoverable profiles for the current user.
 * Excludes any profile the user has already swiped on (liked or passed).
 * Crucially: Profiles that have liked the user remain eligible and in the feed.
 *
 * @param {string} demoUserId - Active demo user ID
 * @returns {Promise<{ profiles: Array<Object>, count: number, hasMore: boolean }>}
 */
export const getDiscoverFeed = async (demoUserId) => {
  // 1. Find all profile IDs that the demo user has already swiped on (outgoing swipes only)
  const swipedTargetIds = await Swipe.find({ actorId: demoUserId }).distinct('targetId');

  // 2. Query profiles whose _id is NOT in the swiped target IDs
  // Sorted deterministically by _id ascending
  const profiles = await Profile.find({
    _id: { $nin: swipedTargetIds }
  })
    .select(PUBLIC_PROFILE_FIELDS)
    .sort({ _id: 1 })
    .lean();

  return {
    profiles,
    count: profiles.length,
    hasMore: false
  };
};

export default {
  getDiscoverFeed
};
