import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import { logSafeError, logSafeEvent } from '../utils/safeLogger.js';

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quality_education';
  try {
    const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 3000 });
    logSafeEvent('database_connected', { outcome: 'primary' });
  } catch (error) {
    logSafeError('primary_database_connection_failed', error, { statusCode: 500 });
    try {
      const mongod = await MongoMemoryServer.create();
      const mongoUri = mongod.getUri();
      await mongoose.connect(mongoUri);
      logSafeEvent('database_connected', { outcome: 'memory_fallback' });
    } catch (memErr) {
      logSafeError('database_connection_failed', memErr, { statusCode: 500 });
      process.exit(1);
    }
  }
};

export default connectDB;
