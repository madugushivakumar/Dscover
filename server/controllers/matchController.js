import { getUserMatches } from '../services/matchService.js';
import { getDemoUserId } from '../config/constants.js';
import { sendSuccess } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * GET /api/matches
 * Fetches all mutual matches established with the demo user.
 */
export const getMatches = asyncHandler(async (req, res) => {
  const demoUserId = getDemoUserId();
  const matches = await getUserMatches(demoUserId);

  if (matches.length === 0) {
    return sendSuccess(res, {
      status: 200,
      data: [],
      meta: {
        count: 0
      },
      message: 'No matches yet. Keep discovering!'
    });
  }

  return sendSuccess(res, {
    status: 200,
    data: matches,
    meta: {
      count: matches.length
    }
  });
});

export default {
  getMatches
};
