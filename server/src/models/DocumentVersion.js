const mongoose = require('mongoose');

const documentVersionSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Document',
      required: true,
      index: true,
    },
    versionNumber: {
      type: Number,
      required: true,
    },
    storagePath: {
      type: String,
      required: true,
    },
    originalFilename: {
      type: String,
      required: true,
    },
    fileSize: {
      type: Number,
      required: true,
    },
    mimeType: {
      type: String,
      default: 'application/pdf',
    },
    pageCount: {
      type: Number,
      default: 0,
    },
    chunkCount: {
      type: Number,
      default: 0,
    },
    status: {
      type: String,
      enum: ['uploaded', 'processing', 'indexed', 'failed', 'retired'],
      default: 'uploaded',
      index: true,
    },
    errorMessage: {
      type: String,
      default: null,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

documentVersionSchema.index({ documentId: 1, versionNumber: 1 }, { unique: true });

module.exports = mongoose.model('DocumentVersion', documentVersionSchema);
