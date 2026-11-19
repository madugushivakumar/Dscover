import { getDiscoverFeed } from '../services/feedService.js';
import { getDemoUserId } from '../config/constants.js';
import { sendSuccess } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/feed
 * Fetches unswiped discovery profiles for the demo user.
 */
export const getFeed = asyncHandler(async (req, res) => {
  const demoUserId = getDemoUserId();
  const { profiles, count, hasMore } = await getDiscoverFeed(demoUserId);

  if (count === 0) {
    return sendSuccess(res, {
      status: 200,
      data: [],
      meta: {
        count: 0,
        hasMore: false
      },
      message: "You've discovered everyone for now."
    });
  }

  return sendSuccess(res, {
    status: 200,
    data: profiles,
    meta: {
      count,
      hasMore
    }
  });
});

export default {
  getFeed
};
