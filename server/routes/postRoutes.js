const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const upload = require('../middlewares/upload');
const {
  createPost,
  getFeed,
  getUserPosts,
  toggleLike,
  addComment,
  deleteComment,
  deletePost,
  updatePost,
} = require('../controllers/postControllers');
const {
  validateCreatePost,
  validateAddComment,
  validatePostId,
  validateCommentId,
  validateUserId,
} = require('../middlewares/validators');

router.post(
  '/',
  protect,
  upload.single('image'),
  validateCreatePost,
  createPost,
);
router.get('/feed', protect, getFeed);
router.get('/user/:userId', protect, validateUserId, getUserPosts);
router.post('/:postId/like', protect, validatePostId, toggleLike);
router.post(
  '/:postId/comments',
  protect,
  validateAddComment,
  addComment,
);

router.delete(
  '/:postId/comments/:commentId',
  protect,
  validatePostId,
  validateCommentId,
  deleteComment,
);

router.delete('/:postId', protect, validatePostId, deletePost);
router.put('/:postId', protect, validatePostId, updatePost);

module.exports = router;
