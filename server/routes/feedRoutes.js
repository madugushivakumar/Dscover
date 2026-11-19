import express from 'express';
import { getFeed } from '../controllers/feedController.js';

const router = express.Router();

/**
 * @route   GET /api/feed
 * @desc    Get discoverable profiles not yet swiped by demo user
 * @access  Public (single-user demo identity)
 */
router.get('/', getFeed);

export default router;
