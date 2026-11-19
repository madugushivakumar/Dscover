import express from 'express';
import { postSwipe } from '../controllers/swipeController.js';
import { validateSwipeRequest } from '../middleware/validateRequest.js';

const router = express.Router();

/**
 * @route   POST /api/swipe
 * @desc    Record a swipe decision (like/pass) and detect mutual matches
 * @access  Public (single-user demo identity)
 */
router.post('/', validateSwipeRequest, postSwipe);

export default router;
