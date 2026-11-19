import Match from '../models/Match.js';
import { PUBLIC_PROFILE_FIELDS } from '../config/constants.js';
import { reconcileUserMatches } from './matchReconciliationService.js';

/**
 * Retrieves all mutual matches belonging to the demo user.
 * Self-healing: Automatically reconciles reciprocal likes to repair any partial write failures.
 * Populates only public profile fields and attaches the authentic matchedAt timestamp.
 *
 * @param {string} demoUserId - Fixed demo user identifier
 * @returns {Promise<Array<Object>>} Formatted matches list
 */
export const getUserMatches = async (demoUserId) => {
  // Self-heal any missing matches caused by network or write failures
  await reconcileUserMatches(demoUserId);

  const matchDocs = await Match.find({ demoUserId })
    .populate('profileId', PUBLIC_PROFILE_FIELDS)
    .sort({ createdAt: -1 })
    .lean();

  const formattedMatches = matchDocs
    .filter((doc) => doc.profileId != null)
    .map((doc) => ({
      _id: doc._id,
      profile: doc.profileId,
      matchedAt: doc.createdAt
    }));

  return formattedMatches;
};

export default {
  getUserMatches
};
