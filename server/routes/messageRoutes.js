const express = require('express');
const router = express.Router();
const { protect } = require('../middlewares/auth');
const { getConversation, getGlobalMessages } = require('../controllers/messageControllers');

router.get('/global', protect, getGlobalMessages);
router.get('/:userId', protect, getConversation);

module.exports = router;
