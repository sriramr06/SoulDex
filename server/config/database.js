const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

// Use in-memory MongoDB for development when MONGO_URI is not provided.
const connectDB = async () => {
  let uri = MONGO_URI;

  if (!uri && process.env.NODE_ENV !== 'production') {
    // Lazily require to avoid pulling this into production bundles.
    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mongod = await MongoMemoryServer.create();
    uri = mongod.getUri();
    if (process.env.NODE_ENV !== 'production') {
      console.log('Using in-memory MongoDB for development');
    }
  }

  if (!uri) {
    throw new Error(
      'MONGO_URI is required in production (server/config/env.js)',
    );
  }

  try {
    const conn = await mongoose.connect(uri);
    if (process.env.NODE_ENV !== 'production') {
      console.log(`MongoDB connected to host: ${conn.connection.host}`);
    }
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('MongoDB connection error:', error.message);
    }
    throw error;
  }
};

module.exports = connectDB;
