import mongoose from 'mongoose';

const matchSchema = new mongoose.Schema(
  {
    demoUserId: {
      type: String,
      required: [true, 'Demo user ID is required'],
      trim: true
    },
    profileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Profile',
      required: [true, 'Profile ID reference is required']
    }
  },
  {
    timestamps: true
  }
);

/**
 * Database Indexes:
 * - Compound unique index on (demoUserId, profileId):
 *   Ensures that only one mutual match record exists between the demo user and any given profile.
 */
matchSchema.index({ demoUserId: 1, profileId: 1 }, { unique: true });

const Match = mongoose.model('Match', matchSchema);

export default Match;
