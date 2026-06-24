const Notification = require('../models/Notification');

//@desc     Get user notifications
//@route    GET /api/notifications
//@access   Private
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ recipient: req.user.userId })
      .sort({ createdAt: -1 })
      .limit(50)
      .populate('sender', 'username displayName profilePicture');

    res.json({ success: true, notifications });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('getNotifications error:', error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc     Mark notification as read
//@route    PUT /api/notifications/:id/read
//@access   Private
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);

    if (!notification) {
      return res.status(404).json({ message: 'Notification not found' });
    }

    if (notification.recipient.toString() !== req.user.userId) {
      return res.status(403).json({ message: 'Not authorized' });
    }

    notification.isRead = true;
    await notification.save();

    res.json({ success: true, notification });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('markAsRead error:', error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

//@desc     Mark all notifications as read
//@route    PUT /api/notifications/read-all
//@access   Private
const markAllAsRead = async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user.userId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ success: true });
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.error('markAllAsRead error:', error);
    }
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = {
  getNotifications,
  markAsRead,
  markAllAsRead,
};
