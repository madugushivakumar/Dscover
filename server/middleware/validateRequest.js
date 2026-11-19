import mongoose from 'mongoose';
import { sendError } from '../utils/apiResponse.js';
import { SWIPE_ACTIONS } from '../config/constants.js';

/**
 * Validates request body for POST /api/swipe.
 */
export const validateSwipeRequest = (req, res, next) => {
  if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
    return sendError(res, {
      status: 400,
      message: 'Request body must be a valid JSON object.',
      code: 'INVALID_REQUEST_BODY'
    });
  }

  const { profileId, action } = req.body;

  if (!profileId) {
    return sendError(res, {
      status: 400,
      message: 'profileId is required.',
      code: 'MISSING_PROFILE_ID'
    });
  }

  if (typeof profileId !== 'string' || !mongoose.Types.ObjectId.isValid(profileId)) {
    return sendError(res, {
      status: 400,
      message: 'Invalid profileId format. Must be a valid 24-character hexadecimal ObjectId.',
      code: 'INVALID_PROFILE_ID'
    });
  }

  if (!action || typeof action !== 'string' || !action.trim()) {
    return sendError(res, {
      status: 400,
      message: 'action is required.',
      code: 'MISSING_ACTION'
    });
  }

  const validActions = [SWIPE_ACTIONS.LIKE, SWIPE_ACTIONS.PASS];
  if (!validActions.includes(action)) {
    return sendError(res, {
      status: 400,
      message: `Invalid action "${action}". Action must be either "like" or "pass".`,
      code: 'INVALID_ACTION'
    });
  }

  // Explicitly assign only validated trusted properties to prevent mass assignment
  req.validatedSwipe = {
    profileId: profileId.trim(),
    action
  };

  next();
};
