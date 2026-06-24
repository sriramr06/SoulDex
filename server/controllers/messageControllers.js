const Message = require('../models/Message');
const { sanitizeText } = require('../utils/sanitizer');

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
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
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
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

const cloudinary = require('../config/cloudinary');

const uploadMessageImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const result = await cloudinary.uploadStream(
      req.file.buffer,
      'souldex/messages',
    );
    
    res.json({ imageUrl: result.secure_url });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error uploading image' });
  }
};

const getUnreadCounts = async (req, res) => {
  try {
    const currentUserId = req.user.userId;
    
    // Group unread messages by sender for the current user
    const unreadCounts = await Message.aggregate([
      { 
        $match: { 
          recipient: new (require('mongoose').Types.ObjectId)(currentUserId), 
          read: false 
        } 
      },
      { 
        $group: { 
          _id: '$sender', 
          count: { $sum: 1 } 
        } 
      }
    ]);

    const formattedCounts = {};
    unreadCounts.forEach(item => {
      formattedCounts[item._id] = item.count;
    });

    res.json(formattedCounts);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error getting unread counts' });
  }
};

const getLastMessagePreviews = async (req, res) => {
  try {
    const currentUserId = req.user.userId;

    // Find all direct messages for the user, sort by latest
    const messages = await Message.find({
      $or: [
        { sender: currentUserId },
        { recipient: currentUserId }
      ],
      recipient: { $ne: null }
    }).sort({ createdAt: -1 }).lean();

    const previews = {};
    for (const m of messages) {
      const otherId = m.sender.toString() === currentUserId ? m.recipient.toString() : m.sender.toString();
      if (!previews[otherId]) {
        previews[otherId] = {
          text: m.imageUrl ? '📷 Image' : m.text,
          createdAt: m.createdAt,
          isMe: m.sender.toString() === currentUserId
        };
      }
    }

    res.json(previews);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error getting message previews' });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const currentUserId = req.user.userId;

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    if (message.sender.toString() !== currentUserId) {
      return res.status(403).json({ message: 'Not authorized to delete this message' });
    }

    await Message.findByIdAndDelete(messageId);
    res.json({ message: 'Message deleted' });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error(error);
    }
    res.status(500).json({ message: 'Server Error deleting message' });
  }
};

module.exports = {
  getConversation,
  getGlobalMessages,
  uploadMessageImage,
  getUnreadCounts,
  deleteMessage,
  getLastMessagePreviews,
};
