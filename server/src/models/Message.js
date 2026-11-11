const mongoose = require('mongoose');

const citationSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
    },
    documentTitle: {
      type: String,
      required: true,
    },
    versionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentVersion',
    },
    pageNumber: {
      type: Number,
      required: true,
    },
    snippet: {
      type: String,
      default: '',
    },
    similarityScore: {
      type: Number,
      default: 0,
    },
    isValidated: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    conversationId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: String,
      enum: ['user', 'assistant'],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    citations: {
      type: [citationSchema],
      default: [],
    },
    isAbstention: {
      type: Boolean,
      default: false,
    },
    confidence: {
      type: Number,
      default: 1.0,
    },
    retrievalFeatures: {
      type: Map,
      of: mongoose.Schema.Types.Mixed,
      default: {},
    },
    feedback: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Feedback',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

messageSchema.index({ conversationId: 1, createdAt: 1 });

module.exports = mongoose.model('Message', messageSchema);
