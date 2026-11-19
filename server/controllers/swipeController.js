import { processSwipe } from '../services/swipeService.js';
import { getDemoUserId, SWIPE_ACTIONS } from '../config/constants.js';
import { sendSuccess } from '../utils/apiResponse.js';
import asyncHandler from '../utils/asyncHandler.js';

/**
 * POST /api/swipe
 * Records an outgoing like or pass and detects mutual matches.
 */
export const postSwipe = asyncHandler(async (req, res) => {
  const demoUserId = getDemoUserId();
  const { profileId, action } = req.validatedSwipe;

  const result = await processSwipe({
    demoUserId,
    profileId,
    action
  });

  if (result.matched) {
    return sendSuccess(res, {
      status: 200,
      message: "It's a match!",
      data: result
    });
  }

  if (action === SWIPE_ACTIONS.PASS) {
    return sendSuccess(res, {
      status: 200,
      message: 'Profile passed successfully.',
      data: result
    });
  }

  return sendSuccess(res, {
    status: 200,
    message: 'Like recorded successfully.',
    data: result
  });
});

export default {
  postSwipe
};
