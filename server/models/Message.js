const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      // If recipient is null, it's a global message
      default: null,
    },
    text: {
      type: String,
      default: '',
    },
    imageUrl: {
      type: String,
      default: '',
    },
    read: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  },
);

messageSchema.pre('validate', function(next) {
  if (!this.text && !this.imageUrl) {
    this.invalidate('text', 'Message must contain either text or an image.');
  }
  if (typeof next === 'function') next();
});

// Indexes for improved query performance
messageSchema.index({ sender: 1, recipient: 1 });
messageSchema.index({ recipient: 1 });
messageSchema.index({ createdAt: -1 });

module.exports = mongoose.model('Message', messageSchema);
