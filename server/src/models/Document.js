const mongoose = require('mongoose');

const documentSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Document title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      default: 'General',
      index: true,
    },
    subject: {
      type: String,
      trim: true,
      default: 'Academic Literature',
      index: true,
    },
    originalFilename: {
      type: String,
      required: [true, 'Original filename is required'],
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    accessScope: {
      type: String,
      enum: {
        values: ['public', 'student', 'faculty', 'admin'],
        message: '{VALUE} is not a valid access scope',
      },
      default: 'public',
      index: true,
    },
    currentVersion: {
      type: Number,
      default: 1,
    },
    currentVersionId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DocumentVersion',
      default: null,
    },
    publicationStatus: {
      type: String,
      enum: ['draft', 'published', 'retired'],
      default: 'draft',
      index: true,
    },
    metadata: {
      type: Map,
      of: String,
      default: {},
    },
  },
  {
    timestamps: true,
  }
);

documentSchema.index({ accessScope: 1, publicationStatus: 1 });
documentSchema.index({ title: 'text', description: 'text', subject: 'text' });

module.exports = mongoose.model('Document', documentSchema);
