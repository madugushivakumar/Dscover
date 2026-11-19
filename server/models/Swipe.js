import mongoose from 'mongoose';

const swipeSchema = new mongoose.Schema(
  {
    actorId: {
      type: String,
      required: [true, 'Actor ID is required'],
      trim: true
    },
    targetId: {
      type: String,
      required: [true, 'Target ID is required'],
      trim: true,
      validate: {
        validator: function (val) {
          return this.actorId !== val;
        },
        message: 'Actor ID and Target ID cannot be identical (self-swiping is disallowed)'
      }
    },
    action: {
      type: String,
      required: [true, 'Swipe action is required'],
      enum: {
        values: ['like', 'pass'],
        message: 'Action must be either "like" or "pass"'
      }
    }
  },
  {
    timestamps: true
  }
);

/**
 * Database Indexes:
 * 1. Compound unique index on (actorId, targetId):
 *    Ensures a single actor can only swipe once per target (enforces directional idempotency).
 * 2. Index on actorId:
 *    Accelerates querying outgoing swipes (e.g., retrieving all profiles swiped by the demo user).
 * 3. Index on targetId:
 *    Accelerates querying incoming swipes (e.g., checking if target profile has already liked the demo user).
 */
swipeSchema.index({ actorId: 1, targetId: 1 }, { unique: true });
swipeSchema.index({ actorId: 1 });
swipeSchema.index({ targetId: 1 });

const Swipe = mongoose.model('Swipe', swipeSchema);

export default Swipe;
