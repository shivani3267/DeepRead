const mongoose = require('mongoose');

const conversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: 'New Academic Inquiry',
      trim: true,
      maxlength: 150,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    documentScope: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'Document',
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

conversationSchema.index({ userId: 1, lastMessageAt: -1 });

module.exports = mongoose.model('Conversation', conversationSchema);
