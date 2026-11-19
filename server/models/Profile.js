import mongoose from 'mongoose';

const profileSchema = new mongoose.Schema(
  {
    seedKey: {
      type: String,
      required: [true, 'Seed key is required for deterministic profile tracking'],
      trim: true
    },
    name: {
      type: String,
      required: [true, 'Profile name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [50, 'Name cannot exceed 50 characters']
    },
    age: {
      type: Number,
      required: [true, 'Age is required'],
      min: [18, 'Age must be at least 18'],
      max: [100, 'Age cannot exceed 100']
    },
    photo: {
      type: String,
      required: [true, 'Photo URL is required'],
      trim: true
    },
    bio: {
      type: String,
      required: [true, 'Biography is required'],
      trim: true,
      maxlength: [500, 'Biography cannot exceed 500 characters']
    },
    city: {
      type: String,
      required: [true, 'City is required'],
      trim: true
    },
    interests: {
      type: [String],
      required: [true, 'Interests are required'],
      validate: {
        validator: function (val) {
          return (
            Array.isArray(val) &&
            val.length >= 3 &&
            val.every((item) => typeof item === 'string' && item.trim().length > 0)
          );
        },
        message: 'Profile must have at least 3 non-empty interest tags'
      }
    }
  },
  {
    timestamps: true
  }
);

/**
 * Database Indexes:
 * - seedKey: Unique index to guarantee deterministic and idempotent seed operations.
 */
profileSchema.index({ seedKey: 1 }, { unique: true });

const Profile = mongoose.model('Profile', profileSchema);

export default Profile;
