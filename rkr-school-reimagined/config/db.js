require('dotenv').config();
const mongoose = require('mongoose');

let isConnected = false;

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  if (isConnected) {
    return;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
    });

    isConnected = !!db.connections[0].readyState;
    console.log('MongoDB connected successfully');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    isConnected = false;
    throw err;
  }
};

module.exports = connectDB;
