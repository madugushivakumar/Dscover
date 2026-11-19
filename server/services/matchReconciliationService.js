import Swipe from '../models/Swipe.js';
import Match from '../models/Match.js';
import { SWIPE_ACTIONS } from '../config/constants.js';

/**
 * Reconciles mutual likes for a user to repair any missing Match documents
 * caused by partial network/database write failures during swipe processing.
 *
 * Idempotent: Can be safely run repeatedly without creating duplicates.
 *
 * @param {string} demoUserId - Active demo user ID
 * @returns {Promise<{ missingMatchesCreated: number, totalMutualLikes: number }>}
 */
export const reconcileUserMatches = async (demoUserId) => {
  // 1. Find all outgoing likes submitted by the user
  const outgoingLikes = await Swipe.find({
    actorId: demoUserId,
    action: SWIPE_ACTIONS.LIKE
  })
    .select('targetId')
    .lean();

  if (!outgoingLikes.length) {
    return { missingMatchesCreated: 0, totalMutualLikes: 0 };
  }

  const outgoingTargetIds = outgoingLikes.map((s) => s.targetId);

  // 2. Find reciprocal incoming likes where targetId is demoUserId and actorId is in outgoingTargetIds
  const reciprocalIncomingLikes = await Swipe.find({
    actorId: { $in: outgoingTargetIds },
    targetId: demoUserId,
    action: SWIPE_ACTIONS.LIKE
  })
    .select('actorId')
    .lean();

  if (!reciprocalIncomingLikes.length) {
    return { missingMatchesCreated: 0, totalMutualLikes: 0 };
  }

  let missingMatchesCreated = 0;

  // 3. For every reciprocal like pair, ensure an atomic Match document exists
  for (const incoming of reciprocalIncomingLikes) {
    const profileObjectId = incoming.actorId;

    const result = await Match.updateOne(
      {
        demoUserId,
        profileId: profileObjectId
      },
      {
        $setOnInsert: {
          demoUserId,
          profileId: profileObjectId
        }
      },
      {
        upsert: true
      }
    );

    if (result.upsertedCount > 0) {
      missingMatchesCreated++;
    }
  }

  return {
    missingMatchesCreated,
    totalMutualLikes: reciprocalIncomingLikes.length
  };
};

export default {
  reconcileUserMatches
};
