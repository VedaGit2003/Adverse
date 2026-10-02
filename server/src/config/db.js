const mongoose = require('mongoose');
const { MONGO_URI, USE_MEMORY_DB } = require('./env');

let memoryServerInstance = null;

const connectDB = async () => {
  try {
    if (USE_MEMORY_DB) {
      console.log('🔄 USE_MEMORY_DB is set to true. Initializing in-memory MongoDB server...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const memoryUri = memoryServerInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log(`✅ Connected to In-Memory MongoDB at: ${memoryUri}`);
      return;
    }

    // Attempt direct connection to standard URI
    console.log(`Connecting to MongoDB at: ${MONGO_URI}...`);
    await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 3000
    });
    console.log(`✅ MongoDB Connected successfully to: ${mongoose.connection.host}`);
  } catch (err) {
    console.warn(`⚠️ Could not connect to local MongoDB at ${MONGO_URI}: ${err.message}`);
    console.log('🔄 Falling back to embedded MongoMemoryServer for development...');
    try {
      const { MongoMemoryServer } = require('mongodb-memory-server');
      memoryServerInstance = await MongoMemoryServer.create();
      const memoryUri = memoryServerInstance.getUri();
      await mongoose.connect(memoryUri);
      console.log(`✅ Connected to fallback In-Memory MongoDB at: ${memoryUri}`);
    } catch (memErr) {
      console.error('❌ Failed to start In-Memory MongoDB:', memErr);
      process.exit(1);
    }
  }
};

const disconnectDB = async () => {
  try {
    await mongoose.disconnect();
    if (memoryServerInstance) {
      await memoryServerInstance.stop();
    }
  } catch (err) {
    console.error('Error disconnecting MongoDB:', err);
  }
};

module.exports = { connectDB, disconnectDB };
