const mongoose = require('mongoose');
const { MONGO_URI } = require('./env');

const connectDB = async () => {
  if (!MONGO_URI) {
    throw new Error('MONGO_URI is required in server/config/env.js');
  }

  try {
    const conn = await mongoose.connect(MONGO_URI);
    console.log(`MongoDB connected to host: ${conn.connection.host}`);
  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    throw error;
  }
};

module.exports = connectDB;
