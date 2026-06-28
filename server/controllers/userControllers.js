const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { sanitizeEmail, sanitizeText } = require('../utils/sanitizer');
const {
  generateVerificationToken,
  hashToken,
  getTokenExpiry,
} = require('../utils/tokenUtils');
const {
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require('../utils/emailService');

//@desc Register Users
//@route /api/register
//@access Public
const registerUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const sanitizedEmail = sanitizeEmail(email);

    // Check if user exists
    const existingUser = await User.findOne({ email: sanitizedEmail });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenHash = hashToken(verificationToken);
    const verificationExpiry = getTokenExpiry(24);

    // Hash password
    const salt = 12;
    const hashedPassword = await bcrypt.hash(password, salt);

    // Create user
    const newUser = await User.create({
      email: sanitizedEmail,
      password: hashedPassword,
      isEmailVerified: false,
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpiry: verificationExpiry,
    });

    // Dev auto-verify is now opt-in via DEV_AUTO_VERIFY=true in .env
    // Enabled in production as well for easy portfolio deployments without email setup.
    if (
      process.env.DEV_AUTO_VERIFY === 'true' ||
      process.env.DEV_AUTO_VERIFY === '1'
    ) {
      newUser.isEmailVerified = true;
      newUser.emailVerificationToken = null;
      newUser.emailVerificationExpiry = null;
      await newUser.save();
      return res.status(201).json({
        message: 'User created and auto-verified (DEV_AUTO_VERIFY enabled).',
        userId: newUser._id,
      });
    }

    const clientBaseUrl =
      process.env.EMAIL_BASE_URL ||
      req.headers.origin ||
      process.env.CLIENT_URL ||
      'http://localhost:5173';
    const serverBaseUrl =
      process.env.SERVER_URL ||
      `${req.protocol}://${req.get('host')}` ||
      `http://localhost:${process.env.PORT || 3000}`;

    console.log(
      'Sending verification email to',
      sanitizedEmail,
      'using serverBaseUrl',
      serverBaseUrl,
    );
    await sendVerificationEmail(
      sanitizedEmail,
      verificationToken,
      serverBaseUrl,
    );

    res.status(201).json({
      message:
        'User created successfully. Please check your email to verify your account.',
      userId: newUser._id,
    });
  } catch (error) {
    // Handle Validation Errors
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: error.message });
    }

    // Handle Duplicate Error
    if (error.code === 11000) {
      return res.status(409).json({ message: 'Email already exists' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc Login Users
//@route /api/login
//@access Public
const loginUser = async (req, res) => {
  const { email, password } = req.body;
  try {
    //Validation
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: 'Email and password are required' });
    }

    const sanitizedEmail = sanitizeEmail(email);

    // Find user with case-insensitive email lookup
    const user = await User.findOne({ email: sanitizedEmail }).collation({
      locale: 'en',
      strength: 2,
    });

    if (!user) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('Login failed: user not found', sanitizedEmail);
      }
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    if (process.env.NODE_ENV !== 'production') {
      console.debug(
        'Login attempt for',
        sanitizedEmail,
        'verified=',
        user.isEmailVerified,
      );
    }

    if (!user.isEmailVerified) {
      return res.status(403).json({
        message:
          'Email not verified. Please verify your email before logging in.',
      });
    }

    //Compare password and stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      if (process.env.NODE_ENV !== 'production') {
        console.debug('Login failed: invalid password for', sanitizedEmail);
      }
      return res.status(401).json({ message: 'Invalid Credentials' });
    }

    const token = jwt.sign(
      {
        userId: user._id,
        email: user.email,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: '7d',
      },
    );

    // Generate a refresh token (simple opaque token stored on the user record)
    const crypto = require('crypto');
    const refreshToken = crypto.randomBytes(48).toString('hex');

    // Hash the refresh token before storing for security
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    // Save hashed refresh token
    user.refreshTokens = user.refreshTokens || [];
    user.refreshTokens.push(hashedRefreshToken);
    await user.save();

    res.json({
      message: 'Login successful',
      token: token,
      refreshToken,
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

// @desc Refresh access token using refresh token
// @route POST /api/refresh
// @access Public (requires refresh token)
const refreshToken = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res.status(400).json({ message: 'Refresh token required' });

    const users = await User.find({
      refreshTokens: { $exists: true, $ne: [] },
    });

    let matchedUser = null;
    for (const user of users) {
      for (const hashedToken of user.refreshTokens || []) {
        if (await bcrypt.compare(refreshToken, hashedToken)) {
          matchedUser = user;
          break;
        }
      }
      if (matchedUser) break;
    }

    if (!matchedUser)
      return res.status(401).json({ message: 'Invalid refresh token' });

    // Issue new access token
    const newToken = jwt.sign(
      {
        userId: matchedUser._id,
        email: matchedUser.email,
        role: matchedUser.role,
      },
      process.env.JWT_SECRET,
      { expiresIn: '7d' },
    );

    return res.json({ token: newToken });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('refreshToken error:', error);
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

// @desc Logout (invalidate a refresh token)
// @route POST /api/logout
// @access Public
const logoutUser = async (req, res) => {
  try {
    const { refreshToken } = req.body || {};
    if (!refreshToken)
      return res.status(400).json({ message: 'Refresh token required' });

    const users = await User.find({
      refreshTokens: { $exists: true, $ne: [] },
    });

    let matchedUser = null;
    let matchedIndex = -1;

    for (const user of users) {
      for (let i = 0; i < (user.refreshTokens || []).length; i++) {
        if (await bcrypt.compare(refreshToken, user.refreshTokens[i])) {
          matchedUser = user;
          matchedIndex = i;
          break;
        }
      }
      if (matchedUser) break;
    }

    if (!matchedUser)
      return res.status(200).json({ message: 'Already logged out' });

    if (matchedIndex >= 0) {
      await User.updateOne(
        { _id: matchedUser._id },
        { $pull: { refreshTokens: matchedUser.refreshTokens[matchedIndex] } },
      );
    }
    return res.json({ message: 'Logged out' });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('logoutUser error:', error);
    }
    return res.status(500).json({ message: 'Server error' });
  }
};

const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select('-password')
      .populate('favorites')
      .populate('following', 'displayName username profilePicture race')
      .populate('followers', 'displayName username profilePicture race');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    // include a posts count for UI convenience
    const Post = require('../models/Post');
    const postsCount = await Post.countDocuments({ author: user._id });
    const userObj = user.toObject();
    userObj.postsCount = postsCount;
    res.json(userObj);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const verifyEmail = async (req, res) => {
  try {
    const { token } = req.query;
    const acceptsHtml =
      req.headers.accept && req.headers.accept.includes('text/html');
    const wantsJson = req.xhr || !acceptsHtml;

    if (!token) {
      if (wantsJson) {
        return res
          .status(400)
          .json({ message: 'Verification token is required' });
      }
      const clientUrl = process.env.EMAIL_BASE_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/login?error=Verification+token+is+required`,
      );
    }

    const verificationTokenHash = hashToken(token);
    const user = await User.findOne({
      emailVerificationToken: verificationTokenHash,
      emailVerificationExpiry: { $gt: new Date() },
    });

    if (!user) {
      if (wantsJson) {
        return res
          .status(400)
          .json({ message: 'Invalid or expired email verification token' });
      }
      const clientUrl = process.env.EMAIL_BASE_URL || 'http://localhost:5173';
      return res.redirect(
        `${clientUrl}/login?error=Invalid+or+expired+verification+token`,
      );
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpiry = null;
    await user.save();

    if (wantsJson) {
      return res.json({ message: 'Email verified successfully' });
    }

    const clientUrl = process.env.EMAIL_BASE_URL || 'http://localhost:5173';
    return res.redirect(`${clientUrl}/login?verified=true`);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    const acceptsHtml =
      req.headers.accept && req.headers.accept.includes('text/html');
    const wantsJson = req.xhr || !acceptsHtml;
    if (wantsJson) {
      return res
        .status(500)
        .json({ message: 'Server error during verification' });
    }
    const clientUrl = process.env.EMAIL_BASE_URL || 'http://localhost:5173';
    return res.redirect(
      `${clientUrl}/login?error=Server+error+during+verification`,
    );
  }
};

// @desc Resend verification email
// @route POST /api/resend-verification
// @access Public
const resendVerificationEmail = async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ message: 'Email is required' });

    const sanitizedEmail = sanitizeEmail(email);
    const user = await User.findOne({ email: sanitizedEmail });
    if (!user) return res.status(404).json({ message: 'User not found' });
    if (user.isEmailVerified)
      return res.status(400).json({ message: 'Email already verified' });

    const verificationToken = generateVerificationToken();
    user.emailVerificationToken = hashToken(verificationToken);
    user.emailVerificationExpiry = getTokenExpiry(24);
    await user.save();

    const clientBaseUrl =
      process.env.EMAIL_BASE_URL ||
      req.headers.origin ||
      process.env.CLIENT_URL ||
      'http://localhost:5173';
    const serverBaseUrl =
      process.env.SERVER_URL ||
      `${req.protocol}://${req.get('host')}` ||
      `http://localhost:${process.env.PORT || 3000}`;

    console.log(
      'Resending verification email to',
      sanitizedEmail,
      'using serverBaseUrl',
      serverBaseUrl,
    );
    await sendVerificationEmail(
      sanitizedEmail,
      verificationToken,
      serverBaseUrl,
    );

    res.json({
      message: 'Verification email resent. Please check your inbox.',
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('resendVerificationEmail error:', error);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const requestPasswordReset = async (req, res) => {
  const { email } = req.body;

  try {
    const sanitizedEmail = sanitizeEmail(email);
    const user = await User.findOne({ email: sanitizedEmail });

    if (user) {
      const resetToken = generateVerificationToken();
      const resetTokenHash = hashToken(resetToken);
      const expiry = getTokenExpiry(1);

      user.passwordResetToken = resetTokenHash;
      user.passwordResetExpiry = expiry;
      await user.save();

      const clientBaseUrl =
        process.env.EMAIL_BASE_URL ||
        req.headers.origin ||
        process.env.CLIENT_URL ||
        'http://localhost:5173';

      await sendPasswordResetEmail(sanitizedEmail, resetToken, clientBaseUrl);
    }

    res.json({
      message:
        'If that email address is registered, a password reset link has been sent.',
    });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  try {
    if (!token || !password) {
      return res
        .status(400)
        .json({ message: 'Reset token and new password are required' });
    }

    const resetTokenHash = hashToken(token);
    const user = await User.findOne({
      passwordResetToken: resetTokenHash,
      passwordResetExpiry: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({
        message: 'Invalid or expired password reset token',
      });
    }

    const salt = 12;
    user.password = await bcrypt.hash(password, salt);
    user.passwordResetToken = null;
    user.passwordResetExpiry = null;
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password has been reset successfully.' });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const { displayName, bio, username, race, email, isPrivate } = req.body;
    if (displayName !== undefined) user.displayName = sanitizeText(displayName);
    if (bio !== undefined) user.bio = sanitizeText(bio);
    if (username !== undefined) {
      const trimmedUsername = sanitizeText(username);
      if (!trimmedUsername) {
        return res.status(400).json({ message: 'Username cannot be empty.' });
      }
      user.username = trimmedUsername;
    }
    if (race !== undefined) user.race = sanitizeText(race);
    if (email !== undefined) {
      const { sanitizeEmail } = require('../utils/sanitizer');
      const cleanEmail = sanitizeEmail(email);
      if (!cleanEmail) {
        return res.status(400).json({ message: 'Email cannot be empty or invalid.' });
      }
      user.email = cleanEmail;
    }
    if (isPrivate !== undefined) {
      user.isPrivate = isPrivate === 'true' || isPrivate === true;
    }

    const cloudinary = require('../config/cloudinary');
    if (req.file) {
      const result = await cloudinary.uploadStream(
        req.file.buffer,
        'souldex/profiles',
      );
      user.profilePicture = result.secure_url;
    }

    await user.save();
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('favorites')
      .populate('following', 'displayName username profilePicture race')
      .populate('followers', 'displayName username profilePicture race');
    res.json(updatedUser);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    if (error.name === 'MongoServerError' && error.code === 11000) {
      return res.status(409).json({
        message: 'That username is already taken. Please choose another.',
      });
    }

    if (error.name === 'MulterError') {
      return res
        .status(400)
        .json({ message: error.message || 'File upload error' });
    }

    if (
      error.message &&
      error.message.includes('Missing required parameter: file')
    ) {
      return res.status(500).json({
        message:
          'Image upload failed. Check Cloudinary credentials or try again without a new avatar.',
      });
    }

    res.status(500).json({ message: 'Server error' });
  }
};

const toggleFavorite = async (req, res) => {
  const { characterId } = req.params;
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(characterId)) {
    return res.status(400).json({ message: 'Invalid Character ID' });
  }

  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const normalizedId = characterId.toString();
    const isFavorite = user.favorites.some(
      (favorite) => favorite.toString() === normalizedId,
    );

    if (isFavorite) {
      user.favorites = user.favorites.filter(
        (favorite) => favorite.toString() !== normalizedId,
      );
    } else {
      user.favorites.push(new mongoose.Types.ObjectId(normalizedId));
    }

    await user.save();
    const updatedUser = await User.findById(user._id)
      .select('-password')
      .populate('favorites');
    res.json({
      message: 'Favorites updated successfully',
      favorites: updatedUser.favorites,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const searchUsers = async (req, res) => {
  const { query } = req.query;
  try {
    if (!query) {
      return res.json([]);
    }
    const users = await User.find({
      $or: [
        { displayName: { $regex: query, $options: 'i' } },
        { username: { $regex: query, $options: 'i' } },
      ],
    })
      .select('_id displayName username profilePicture bio race')
      .limit(20);

    res.json(users);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getPublicProfile = async (req, res) => {
  try {
    const { userId } = req.params;
    const mongoose = require('mongoose');

    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }

    const user = await User.findById(userId)
      .select('displayName username profilePicture bio race createdAt followers following')
      .populate('followers', 'displayName username profilePicture race')
      .populate('following', 'displayName username profilePicture race');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const Post = require('../models/Post');
    const postsCount = await Post.countDocuments({ author: user._id });

    const userObj = user.toObject();
    userObj.postsCount = postsCount;

    res.json(userObj);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server error' });
  }
};

const toggleFollow = async (req, res) => {
  const { id } = req.params;
  const currentUserId = req.user.userId;
  const mongoose = require('mongoose');

  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({ message: 'Invalid user ID' });
  }

  if (id === currentUserId) {
    return res.status(400).json({ message: 'You cannot follow yourself' });
  }

  try {
    const targetUser = await User.findById(id);
    const currentUser = await User.findById(currentUserId);

    if (!targetUser || !currentUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    const normalizedId = id.toString();
    const isFollowing = currentUser.following.some(
      (followed) => followed.toString() === normalizedId,
    );

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(
        (followed) => followed.toString() !== normalizedId,
      );
      targetUser.followers = targetUser.followers.filter(
        (follower) => follower.toString() !== currentUserId,
      );
    } else {
      currentUser.following.push(new mongoose.Types.ObjectId(normalizedId));
      targetUser.followers.push(new mongoose.Types.ObjectId(currentUserId));
      
      const Notification = require('../models/Notification');
      await Notification.create({
        recipient: targetUser._id,
        sender: currentUserId,
        type: 'FOLLOW',
        message: 'started following you.',
      });
      
      const io = req.app.get('io');
      if (io) {
        io.to(targetUser._id.toString()).emit('newNotification', {
          type: 'FOLLOW',
          senderId: currentUserId
        });
      }
    }

    await currentUser.save();
    await targetUser.save();

    res.json({
      message: isFollowing
        ? 'Unfollowed successfully'
        : 'Followed successfully',
      following: currentUser.following,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server error' });
  }
};

const changePassword = async (req, res) => {
  const { currentPassword, newPassword } = req.body;
  try {
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: 'Current and new password are required.' });
    }
    if (newPassword.length < 8) {
      return res.status(400).json({ message: 'New password must be at least 8 characters.' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Current password is incorrect.' });
    }

    user.password = await bcrypt.hash(newPassword, 12);
    // Invalidate all other sessions
    user.refreshTokens = [];
    await user.save();

    res.json({ message: 'Password changed successfully. Please log in again on other devices.' });
  } catch (error) {
    console.error('changePassword error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

const deleteAccount = async (req, res) => {
  const { password } = req.body;
  try {
    if (!password) {
      return res.status(400).json({ message: 'Password is required to delete your account.' });
    }
    const user = await User.findById(req.user.userId);
    if (!user) return res.status(404).json({ message: 'User not found.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Incorrect password.' });
    }

    const Post = require('../models/Post');
    const Message = require('../models/Message');
    const Notification = require('../models/Notification');

    await Post.deleteMany({ author: user._id });
    await Message.deleteMany({ $or: [{ sender: user._id }, { recipient: user._id }] });
    await Notification.deleteMany({ $or: [{ recipient: user._id }, { sender: user._id }] });

    // Remove from other users' followers/following lists
    await User.updateMany(
      { $or: [{ followers: user._id }, { following: user._id }] },
      { $pull: { followers: user._id, following: user._id } },
    );

    await User.findByIdAndDelete(user._id);

    res.json({ message: 'Account deleted successfully.' });
  } catch (error) {
    console.error('deleteAccount error:', error);
    res.status(500).json({ message: 'Server error.' });
  }
};

module.exports = {
  registerUser,
  loginUser,
  refreshToken,
  logoutUser,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
  getUserProfile,
  getPublicProfile,
  updateUserProfile,
  toggleFavorite,
  searchUsers,
  toggleFollow,
  changePassword,
  deleteAccount,
};
