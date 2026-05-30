const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  createPost,
  getFeed,
  getUserPosts,
  toggleLike,
  addComment
} = require('../controllers/postControllers');

router.post('/', protect, upload.single('image'), createPost);
router.get('/feed', protect, getFeed);
router.get('/user/:userId', protect, getUserPosts);
router.post('/:postId/like', protect, toggleLike);
router.post('/:postId/comments', protect, addComment);

module.exports = router;
