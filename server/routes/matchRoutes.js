import express from 'express';
import { getMatches } from '../controllers/matchController.js';

const router = express.Router();

/**
 * @route   GET /api/matches
 * @desc    Get all mutual matches for demo user
 * @access  Public (single-user demo identity)
 */
router.get('/', getMatches);

export default router;
