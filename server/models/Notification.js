const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    type: {
      type: String,
      enum: ['LIKE_POST', 'COMMENT_POST', 'LIKE_CHARACTER', 'COMMENT_CHARACTER', 'FOLLOW'],
      required: true,
    },
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      required: function() {
        return this.type !== 'FOLLOW';
      },
    },
    relatedModel: {
      type: String,
      enum: ['Post', 'Character', 'User'],
      required: function() {
        return this.type !== 'FOLLOW';
      },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    message: {
      type: String,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Notification', notificationSchema);
