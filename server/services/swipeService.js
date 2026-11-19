import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { SWIPE_ACTIONS } from '../config/constants.js';

/**
 * Custom application error with HTTP status code and custom error code.
 */
class AppError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
  }
}

/**
 * Processes an outgoing swipe from the demo user.
 * Records the swipe and checks for reciprocal mutual like.
 *
 * @param {Object} params
 * @param {string} params.demoUserId - The fixed demo user identifier
 * @param {string} params.profileId - The target profile MongoDB ObjectId (string)
 * @param {string} params.action - 'like' or 'pass'
 * @returns {Promise<Object>} Swipe processing result
 */
export const processSwipe = async ({ demoUserId, profileId, action }) => {
  // 1. Verify target profile exists in database
  const targetProfile = await Profile.findById(profileId).select('_id name photo').lean();
  if (!targetProfile) {
    throw new AppError('Profile not found.', 404, 'PROFILE_NOT_FOUND');
  }

  // 2. Pre-check for duplicate outgoing swipe
  const existingSwipe = await Swipe.findOne({
    actorId: demoUserId,
    targetId: profileId
  }).lean();

  if (existingSwipe) {
    throw new AppError('You have already swiped on this profile.', 409, 'DUPLICATE_SWIPE');
  }

  // 3. Persist the outgoing swipe record
  try {
    await Swipe.create({
      actorId: demoUserId,
      targetId: profileId,
      action
    });
  } catch (err) {
    // Gracefully catch concurrent duplicate write on compound index (actorId, targetId)
    if (err.code === 11000) {
      throw new AppError('You have already swiped on this profile.', 409, 'DUPLICATE_SWIPE');
    }
    throw err;
  }

  // 4. Handle "pass" action (never creates a match)
  if (action === SWIPE_ACTIONS.PASS) {
    return {
      action: SWIPE_ACTIONS.PASS,
      matched: false
    };
  }

  // 5. Handle "like" action: Check for reciprocal incoming like from profile to demo user
  const incomingLike = await Swipe.findOne({
    actorId: profileId,
    targetId: demoUserId,
    action: SWIPE_ACTIONS.LIKE
  }).lean();

  // If no reciprocal like exists, it is a one-sided like (no match)
  if (!incomingLike) {
    return {
      action: SWIPE_ACTIONS.LIKE,
      matched: false,
      profile: {
        _id: targetProfile._id,
        name: targetProfile.name
      }
    };
  }

  // 6. Reciprocal like exists! Safely persist the mutual Match record
  // Only reported as matched after database persistence succeeds
  await Match.findOneAndUpdate(
    {
      demoUserId,
      profileId: targetProfile._id
    },
    {
      $setOnInsert: {
        demoUserId,
        profileId: targetProfile._id
      }
    },
    {
      upsert: true,
      returnDocument: 'after',
      runValidators: true
    }
  );

  return {
    action: SWIPE_ACTIONS.LIKE,
    matched: true,
    match: {
      profileId: targetProfile._id,
      name: targetProfile.name,
      photo: targetProfile.photo
    }
  };
};

export default {
  processSwipe
};
