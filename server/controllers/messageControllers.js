const Message = require('../models/Message');

const getConversation = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.userId;

    const messages = await Message.find({
      $or: [
        { sender: currentUserId, recipient: userId },
        { sender: userId, recipient: currentUserId },
      ],
    })
      .sort({ createdAt: 1 })
      .populate('sender', 'displayName username profilePicture race');

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

const getGlobalMessages = async (req, res) => {
  try {
    // recipient = null means global
    const messages = await Message.find({ recipient: null })
      .sort({ createdAt: 1 })
      .limit(100) // limit to recent 100 for performance
      .populate('sender', 'displayName username profilePicture race');

    res.json(messages);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getConversation,
  getGlobalMessages,
};
