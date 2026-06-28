const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const {
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
} = require('../controllers/userControllers');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  validateRegister,
  validateLogin,
  validateUpdateProfile,
  validateVerifyEmail,
  validateRequestPasswordReset,
  validateResetPassword,
  validateObjectId,
  validateCharacterId,
  validateUserId,
} = require('../middlewares/validators');

// Strict rate limiting for authentication endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === 'production' ? 5 : 100, // 5 in prod, 100 in dev
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: 'Too many authentication attempts, please try again later.',
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // 3 registration attempts per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: 'Too many registration attempts, please try again in an hour.',
});

router.post('/register', registerLimiter, validateRegister, registerUser);
router.post('/login', authLimiter, validateLogin, loginUser);
router.post('/refresh', authLimiter, refreshToken);
router.post('/logout', authLimiter, logoutUser);
router.get('/verify-email', validateVerifyEmail, verifyEmail);
router.post(
  '/request-password-reset',
  authLimiter,
  validateRequestPasswordReset,
  requestPasswordReset,
);
router.post(
  '/reset-password',
  authLimiter,
  validateResetPassword,
  resetPassword,
);

router.post('/resend-verification', resendVerificationEmail);

// Profile and Favorites (Protected)
router.get('/profile', protect, getUserProfile);
router.put(
  '/profile',
  protect,
  upload.single('profilePicture'),
  validateUpdateProfile,
  updateUserProfile,
);
router.post(
  '/favorites/:characterId',
  protect,
  validateCharacterId,
  toggleFavorite,
);

// Social (Protected)
router.get('/search', protect, searchUsers);
router.get('/user/:userId', protect, validateUserId, getPublicProfile);
router.post('/follow/:id', protect, toggleFollow);

// Settings (Protected)
router.put('/settings/password', protect, changePassword);
router.delete('/settings/account', protect, deleteAccount);

module.exports = router;

