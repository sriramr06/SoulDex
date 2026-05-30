const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserProfile,
  toggleFavorite,
  searchUsers,
  toggleFollow
} = require('../controllers/userControllers');
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

router.post('/register', registerUser);
router.post('/login', loginUser);

// Profile and Favorites (Protected)
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, upload.single('profilePicture'), updateUserProfile);
router.post('/favorites/:characterId', protect, toggleFavorite);

// Social (Protected)
router.get('/search', protect, searchUsers);
router.post('/follow/:id', protect, toggleFollow);

module.exports = router;