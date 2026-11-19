import mongoose from 'mongoose';

/**
 * Sanitizes a MongoDB connection URI to mask credentials in console output.
 * @param {string} uri
 * @returns {string} Sanitized URI
 */
const sanitizeMongoUri = (uri) => {
  if (!uri) return '';
  return uri.replace(/\/\/[^:]+:[^@]+@/, '//***:***@');
};

/**
 * Establishes a connection to MongoDB using Mongoose.
 * @param {string} [uri] Optional URI override for testing environments
 * @returns {Promise<typeof mongoose>}
 */
export const connectDB = async (uri) => {
  const connectionUri = uri || process.env.MONGODB_URI;

  if (!connectionUri) {
    const errorMsg = 'MONGODB_URI is not defined in environment variables.';
    console.error(`[Database Error] ${errorMsg}`);
    throw new Error(errorMsg);
  }

  // If already connected, reuse existing connection
  if (mongoose.connection.readyState === 1) {
    return mongoose;
  }

  try {
    const conn = await mongoose.connect(connectionUri, {
      serverSelectionTimeoutMS: 5000
    });
    const sanitized = sanitizeMongoUri(connectionUri);
    console.log(`[Database] MongoDB connected successfully to host: ${conn.connection.host || 'local'} (${sanitized})`);
    return conn;
  } catch (error) {
    console.error(`[Database Error] Failed to connect to MongoDB: ${error.message}`);
    throw error;
  }
};

/**
 * Closes the active MongoDB connection.
 * @returns {Promise<void>}
 */
export const disconnectDB = async () => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[Database] MongoDB disconnected.');
  }
};

export default connectDB;
