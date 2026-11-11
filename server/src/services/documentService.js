const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const IngestionJob = require('../models/IngestionJob');
const aiServiceClient = require('./aiServiceClient');

/**
 * Returns a Mongoose query filter for documents accessible to the given role
 */
const getAccessibleDocumentsFilter = (userRole) => {
  if (userRole === 'admin') {
    // Admin has access to all documents regardless of scope or status
    return {};
  }

  if (userRole === 'faculty') {
    // Faculty can access public, student, and faculty documents that are published
    return {
      accessScope: { $in: ['public', 'student', 'faculty'] },
      publicationStatus: 'published',
    };
  }

  // Student role default: public and student documents that are published
  return {
    accessScope: { $in: ['public', 'student'] },
    publicationStatus: 'published',
  };
};

/**
 * Retrieves the list of document ObjectIds that a user is authorized to read
 */
const getAuthorizedDocumentIds = async (user, requestedDocIds = null) => {
  const filter = getAccessibleDocumentsFilter(user.role);

  if (requestedDocIds && requestedDocIds.length > 0) {
    filter._id = { $in: requestedDocIds };
  }

  const docs = await Document.find(filter).select('_id');
  return docs.map((d) => d._id);
};

/**
 * Safe version activation:
 * Only activates and publishes a new version if its indexing has succeeded.
 * Retires old version vectors from Pinecone.
 */
const activateNewVersion = async (documentId, newVersionId) => {
  const document = await Document.findById(documentId);
  if (!document) throw new Error('Document not found');

  const newVersion = await DocumentVersion.findById(newVersionId);
  if (!newVersion) throw new Error('Target document version not found');

  if (newVersion.status !== 'indexed') {
    throw new Error(`Cannot publish version with status '${newVersion.status}'. Ingestion must be indexed first.`);
  }

  const previousVersionId = document.currentVersionId;

  // Update document to point to new version
  document.currentVersion = newVersion.versionNumber;
  document.currentVersionId = newVersion._id;
  document.publicationStatus = 'published';
  await document.save();

  // If there was an older active version, retire it and clean up its vectors
  if (previousVersionId && previousVersionId.toString() !== newVersionId.toString()) {
    await DocumentVersion.findByIdAndUpdate(previousVersionId, { status: 'retired' });
    try {
      await aiServiceClient.deleteVersionVectors({
        documentId: document._id,
        versionId: previousVersionId,
      });
    } catch (err) {
      console.warn(`[Version Cleanup] Could not delete vectors for retired version ${previousVersionId}:`, err.message);
    }
  }

  return { document, newVersion };
};

module.exports = {
  getAccessibleDocumentsFilter,
  getAuthorizedDocumentIds,
  activateNewVersion,
};
