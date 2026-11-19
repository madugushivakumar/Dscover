import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { connectDB, disconnectDB } from '../config/db.js';
import Profile from '../models/Profile.js';
import Swipe from '../models/Swipe.js';
import { mockProfiles, incomingLikeSeedKeys } from './profileData.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from server or root .env
dotenv.config({ path: path.resolve(__dirname, '.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Idempotently seeds mock profiles and directional incoming likes.
 * Uses upserts based on seedKey to guarantee that rerunning does not create duplicates
 * or delete existing user activity/matches.
 *
 * @param {Object} [options]
 * @param {string} [options.uri] Optional MongoDB URI override
 * @param {string} [options.demoUserId] Optional demo user ID override
 * @param {boolean} [options.quiet] Suppress non-error console output
 * @returns {Promise<{ profilesSeeded: number, incomingLikesSeeded: number }>}
 */
export const seedDatabase = async ({ uri, demoUserId, quiet = false } = {}) => {
  const targetDemoUserId = demoUserId || process.env.DEMO_USER_ID || 'demo-user';

  if (!quiet) {
    console.log('[Seed] Starting idempotent database seed process...');
    console.log(`[Seed] Target Demo User ID: ${targetDemoUserId}`);
  }

  await connectDB(uri);

  // 1. Upsert profiles idempotently using seedKey
  let profilesCreated = 0;
  let profilesUpdated = 0;

  const profileBulkOps = mockProfiles.map((profile) => ({
    updateOne: {
      filter: { seedKey: profile.seedKey },
      update: { $set: profile },
      upsert: true
    }
  }));

  const profileResult = await Profile.bulkWrite(profileBulkOps);
  profilesCreated = profileResult.upsertedCount || 0;
  profilesUpdated = profileResult.modifiedCount || 0;
  const totalProfiles = await Profile.countDocuments();

  if (!quiet) {
    console.log(`[Seed] Profiles processed: ${mockProfiles.length} definitions`);
    console.log(`[Seed] Newly created: ${profilesCreated}, Updated: ${profilesUpdated}, Total in DB: ${totalProfiles}`);
  }

  // 2. Retrieve profiles matching incomingLikeSeedKeys to acquire their MongoDB ObjectIDs
  const targetProfiles = await Profile.find({
    seedKey: { $in: incomingLikeSeedKeys }
  });

  if (targetProfiles.length < incomingLikeSeedKeys.length) {
    throw new Error(
      `[Seed Error] Could not find all incoming-like profiles in database. Expected ${incomingLikeSeedKeys.length}, found ${targetProfiles.length}`
    );
  }

  // 3. Upsert directional incoming likes: actorId = profile._id.toString(), targetId = demoUserId, action = 'like'
  let incomingLikesCreated = 0;
  let incomingLikesExisting = 0;

  for (const p of targetProfiles) {
    const actorId = p._id.toString();
    const swipeFilter = { actorId, targetId: targetDemoUserId };

    const existingSwipe = await Swipe.findOne(swipeFilter);
    if (!existingSwipe) {
      await Swipe.create({
        actorId,
        targetId: targetDemoUserId,
        action: 'like'
      });
      incomingLikesCreated++;
    } else {
      incomingLikesExisting++;
    }
  }

  const totalIncomingLikes = await Swipe.countDocuments({
    targetId: targetDemoUserId,
    action: 'like'
  });

  if (!quiet) {
    console.log(
      `[Seed] Incoming likes processed: ${incomingLikesCreated} created, ${incomingLikesExisting} already present`
    );
    console.log(`[Seed] Total incoming likes for demo user "${targetDemoUserId}": ${totalIncomingLikes}`);
    console.log('[Seed] Database seeding completed successfully.');
  }

  return {
    profilesSeeded: totalProfiles,
    incomingLikesSeeded: totalIncomingLikes,
    profilesCreated,
    profilesUpdated,
    incomingLikesCreated,
    incomingLikesExisting
  };
};

// Execute if run directly via CLI (e.g. "node seed/seed.js")
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  seedDatabase()
    .then(async () => {
      await disconnectDB();
      process.exit(0);
    })
    .catch(async (err) => {
      console.error('[Seed Fatal Error]:', err.message);
      await disconnectDB();
      process.exit(1);
    });
}

export default seedDatabase;
