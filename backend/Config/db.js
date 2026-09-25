import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

const connectDB = async () => {
  const primaryUri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/quality_education';
  try {
    const conn = await mongoose.connect(primaryUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.log(`Could not connect to MongoDB at ${primaryUri} (${error.message}). Starting In-Memory MongoDB fallback...`);
    try {
      const mongod = await MongoMemoryServer.create();
      const mongoUri = mongod.getUri();
      const conn = await mongoose.connect(mongoUri);
      console.log(`MongoDB Connected (In-Memory Fallback): ${conn.connection.host}`);
    } catch (memErr) {
      console.error(`MongoDB Connection Error: ${memErr.message}`);
      process.exit(1);
    }
  }
};

export default connectDB;
