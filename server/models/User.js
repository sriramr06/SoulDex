const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
    },
    username: {
      type: String,
      unique: true,
      sparse: true,
    },
    displayName: {
      type: String,
    },
    bio: {
      type: String,
      maxLength: 300,
    },
    race: {
      type: String,
      default: 'Human',
    },
    profilePicture: {
      type: String,
      default:
        'https://res.cloudinary.com/dcsxejxia/image/upload/v1778496101/329b54d07444f009b0634f438db9a449_cpbmxi.jpg',
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isPrivate: {
      type: Boolean,
      default: false,
    },
    favorites: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Character',
      },
    ],
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    // Refresh tokens for silent authentication (simple implementation)
    refreshTokens: [
      {
        type: String,
      },
    ],
    // Email verification
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    emailVerificationToken: {
      type: String,
      default: null,
    },
    emailVerificationExpiry: {
      type: Date,
      default: null,
    },
    passwordResetToken: {
      type: String,
      default: null,
    },
    passwordResetExpiry: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Automatically adds createdAt and updatedAt fields
  },
);

// Indexes for improved query performance
userSchema.index({ createdAt: -1 });

module.exports = mongoose.model('User', userSchema);
