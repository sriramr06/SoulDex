const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const multer = require('multer');
const {
  getConversation,
  getGlobalMessages,
  uploadMessageImage,
  getUnreadCounts,
  deleteMessage,
  getLastMessagePreviews,
} = require('../controllers/messageControllers');
const { validateUserId } = require('../middlewares/validators');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
});

router.get('/global', protect, getGlobalMessages);
router.get('/previews', protect, getLastMessagePreviews);
router.get('/unread', protect, getUnreadCounts);
router.post('/upload', protect, upload.single('image'), uploadMessageImage);
router.delete('/:messageId', protect, deleteMessage);
router.get('/:userId', protect, validateUserId, getConversation);

module.exports = router;
