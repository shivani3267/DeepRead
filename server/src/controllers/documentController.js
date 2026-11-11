const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const IngestionJob = require('../models/IngestionJob');
const documentService = require('../services/documentService');
const aiServiceClient = require('../services/aiServiceClient');
const auditService = require('../services/auditService');

/**
 * Upload initial PDF document and start ingestion
 */
const uploadDocument = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file was uploaded.',
      });
    }

    const { title, description, category, subject, accessScope } = req.body;

    if (!title) {
      // Remove uploaded file if validation fails
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(400).json({
        success: false,
        message: 'Document title is required.',
      });
    }

    // 1. Create Document
    const document = await Document.create({
      title,
      description: description || '',
      category: category || 'General',
      subject: subject || 'Academic Literature',
      originalFilename: req.file.originalname,
      uploadedBy: req.user._id,
      accessScope: accessScope || 'public',
      currentVersion: 1,
      publicationStatus: 'draft',
    });

    // 2. Create DocumentVersion v1
    const version = await DocumentVersion.create({
      documentId: document._id,
      versionNumber: 1,
      storagePath: req.file.path,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing',
      uploadedBy: req.user._id,
    });

    document.currentVersionId = version._id;
    await document.save();

    // 3. Create Ingestion Job
    const jobId = uuidv4();
    const job = await IngestionJob.create({
      jobId,
      documentId: document._id,
      versionId: version._id,
      status: 'processing',
      startedAt: new Date(),
    });

    // 4. Trigger AI ingestion in background
    aiServiceClient
      .triggerIngestion({
        documentId: document._id,
        versionId: version._id,
        filePath: req.file.path,
        metadata: {
          title: document.title,
          category: document.category,
          accessScope: document.accessScope,
        },
      })
      .then(async (result) => {
        job.status = 'completed';
        job.progress = 100;
        job.extractedPages = result.extracted_pages || 0;
        job.generatedChunks = result.generated_chunks || 0;
        job.indexedVectors = result.indexed_vectors || 0;
        job.completedAt = new Date();
        await job.save();

        version.status = 'indexed';
        version.pageCount = result.extracted_pages || 0;
        version.chunkCount = result.generated_chunks || 0;
        await version.save();

        // Auto-publish v1 upon initial successful ingestion
        document.publicationStatus = 'published';
        await document.save();
      })
      .catch(async (err) => {
        console.error(`[Ingestion Pipeline Failed for Doc ${document._id}]:`, err.message);
        job.status = 'failed';
        job.errorMessage = err.message;
        job.completedAt = new Date();
        await job.save();

        version.status = 'failed';
        version.errorMessage = err.message;
        await version.save();
      });

    await auditService.logAction({
      userId: req.user._id,
      action: 'DOCUMENT_UPLOADED',
      details: { documentId: document._id, title: document.title, scope: document.accessScope },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully. Background processing started.',
      document,
      version,
      jobId,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error('Failed to clean up temp file:', e);
      }
    }
    next(error);
  }
};

/**
 * List documents accessible to the current authenticated user
 */
const listDocuments = async (req, res, next) => {
  try {
    const { category, subject, search, scope, status } = req.query;

    const filter = documentService.getAccessibleDocumentsFilter(req.user.role);

    if (category) filter.category = category;
    if (subject) filter.subject = subject;
    if (scope && (req.user.role === 'admin' || scope === 'public' || (req.user.role === 'faculty' && ['student', 'faculty'].includes(scope)))) {
      filter.accessScope = scope;
    }
    if (status && req.user.role === 'admin') {
      filter.publicationStatus = status;
    }
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { subject: { $regex: search, $options: 'i' } },
      ];
    }

    const documents = await Document.find(filter)
      .populate('uploadedBy', 'name email role')
      .populate('currentVersionId', 'versionNumber status pageCount chunkCount updatedAt')
      .sort({ updatedAt: -1 });

    return res.status(200).json({
      success: true,
      count: documents.length,
      documents,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get single document details with authorization check
 */
const getDocumentById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id)
      .populate('uploadedBy', 'name email')
      .populate('currentVersionId');

    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
      });
    }

    // Authorization check
    if (req.user.role !== 'admin') {
      if (document.publicationStatus !== 'published') {
        return res.status(403).json({
          success: false,
          message: 'This document is not currently published.',
        });
      }
      if (document.accessScope === 'faculty' && req.user.role !== 'faculty') {
        return res.status(403).json({
          success: false,
          message: 'Access restricted: Faculty permission required to view this document.',
        });
      }
      if (document.accessScope === 'admin') {
        return res.status(403).json({
          success: false,
          message: 'Access restricted: Administrator permission required.',
        });
      }
    }

    return res.status(200).json({
      success: true,
      document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all versions of a document (Admin only)
 */
const listDocumentVersions = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
      });
    }

    const versions = await DocumentVersion.find({ documentId: id })
      .populate('uploadedBy', 'name email')
      .sort({ versionNumber: -1 });

    return res.status(200).json({
      success: true,
      documentTitle: document.title,
      versions,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload an updated version of an existing document.
 * Crucial: Old published version remains active until new version finishes indexing!
 */
const uploadNewVersion = async (req, res, next) => {
  try {
    const { id } = req.params;

    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No PDF file was provided for the updated version.',
      });
    }

    const document = await Document.findById(id);
    if (!document) {
      if (fs.existsSync(req.file.path)) fs.unlinkSync(req.file.path);
      return res.status(404).json({
        success: false,
        message: 'Document not found.',
      });
    }

    // Determine next version number
    const highestVersion = await DocumentVersion.findOne({ documentId: id })
      .sort({ versionNumber: -1 })
      .select('versionNumber');

    const nextVersionNumber = (highestVersion ? highestVersion.versionNumber : document.currentVersion) + 1;

    // Create new version in 'processing' status
    const newVersion = await DocumentVersion.create({
      documentId: document._id,
      versionNumber: nextVersionNumber,
      storagePath: req.file.path,
      originalFilename: req.file.originalname,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      status: 'processing',
      uploadedBy: req.user._id,
    });

    const jobId = uuidv4();
    const job = await IngestionJob.create({
      jobId,
      documentId: document._id,
      versionId: newVersion._id,
      status: 'processing',
      startedAt: new Date(),
    });

    // Run ingestion asynchronously
    aiServiceClient
      .triggerIngestion({
        documentId: document._id,
        versionId: newVersion._id,
        filePath: req.file.path,
        metadata: {
          title: document.title,
          category: document.category,
          accessScope: document.accessScope,
          version: nextVersionNumber,
        },
      })
      .then(async (result) => {
        job.status = 'completed';
        job.progress = 100;
        job.extractedPages = result.extracted_pages || 0;
        job.generatedChunks = result.generated_chunks || 0;
        job.indexedVectors = result.indexed_vectors || 0;
        job.completedAt = new Date();
        await job.save();

        newVersion.status = 'indexed';
        newVersion.pageCount = result.extracted_pages || 0;
        newVersion.chunkCount = result.generated_chunks || 0;
        await newVersion.save();

        // Safe automatic replacement after successful indexing
        await documentService.activateNewVersion(document._id, newVersion._id);
        console.log(`[Version Replacement] Successfully activated version ${nextVersionNumber} for doc ${document._id}`);
      })
      .catch(async (err) => {
        console.error(`[New Version Ingestion Failed for Doc ${document._id}]:`, err.message);
        job.status = 'failed';
        job.errorMessage = err.message;
        job.completedAt = new Date();
        await job.save();

        newVersion.status = 'failed';
        newVersion.errorMessage = err.message;
        await newVersion.save();
        // Notice: previous version is NOT retired, remaining active as per requirements!
      });

    await auditService.logAction({
      userId: req.user._id,
      action: 'DOCUMENT_NEW_VERSION_UPLOADED',
      details: { documentId: document._id, version: nextVersionNumber },
      req,
    });

    return res.status(201).json({
      success: true,
      message: `Version ${nextVersionNumber} uploaded. Ingestion running. Existing version remains active until new version is indexed.`,
      newVersion,
      jobId,
    });
  } catch (error) {
    if (req.file && fs.existsSync(req.file.path)) {
      try {
        fs.unlinkSync(req.file.path);
      } catch (e) {
        console.error(e);
      }
    }
    next(error);
  }
};

/**
 * Publish document or specific version (Admin only)
 */
const publishDocument = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { versionId } = req.body;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    const targetVersionId = versionId || document.currentVersionId;
    const { document: updatedDoc } = await documentService.activateNewVersion(document._id, targetVersionId);

    await auditService.logAction({
      userId: req.user._id,
      action: 'DOCUMENT_PUBLISHED',
      details: { documentId: id, versionId: targetVersionId },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Document published successfully.',
      document: updatedDoc,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retire document and purge vectors from Pinecone (Admin only)
 */
const retireDocument = async (req, res, next) => {
  try {
    const { id } = req.params;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    document.publicationStatus = 'retired';
    await document.save();

    if (document.currentVersionId) {
      await DocumentVersion.findByIdAndUpdate(document.currentVersionId, { status: 'retired' });
      await aiServiceClient.deleteVersionVectors({
        documentId: document._id,
        versionId: document.currentVersionId,
      });
    }

    await auditService.logAction({
      userId: req.user._id,
      action: 'DOCUMENT_RETIRED',
      details: { documentId: id },
      req,
    });

    return res.status(200).json({
      success: true,
      message: 'Document retired successfully. Vectors deactivated from retrieval.',
      document,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Stream private PDF file with authorized access control and page navigation
 */
const streamDocumentFile = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { versionId } = req.query;

    const document = await Document.findById(id);
    if (!document) {
      return res.status(404).json({ success: false, message: 'Document not found.' });
    }

    // Authorization check
    if (req.user.role !== 'admin') {
      if (document.publicationStatus !== 'published') {
        return res.status(403).json({ success: false, message: 'Document is not currently published.' });
      }
      if (document.accessScope === 'faculty' && req.user.role !== 'faculty') {
        return res.status(403).json({ success: false, message: 'Access denied: Faculty permission required.' });
      }
      if (document.accessScope === 'admin') {
        return res.status(403).json({ success: false, message: 'Access denied: Admin permission required.' });
      }
    }

    // Determine target version
    let version;
    if (versionId && req.user.role === 'admin') {
      version = await DocumentVersion.findById(versionId);
    } else {
      version = await DocumentVersion.findById(document.currentVersionId);
    }

    if (!version || !fs.existsSync(version.storagePath)) {
      return res.status(404).json({
        success: false,
        message: 'The requested PDF file is not found on storage.',
      });
    }

    const stat = fs.statSync(version.storagePath);
    const fileSize = stat.size;
    const range = req.headers.range;

    // Handle HTTP Range requests for fast PDF viewing
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunksize = end - start + 1;
      const file = fs.createReadStream(version.storagePath, { start, end });

      const head = {
        'Content-Range': `bytes ${start}-${end}/${fileSize}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': chunksize,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.originalFilename)}"`,
      };
      res.writeHead(206, head);
      file.pipe(res);
    } else {
      const head = {
        'Content-Length': fileSize,
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${encodeURIComponent(document.originalFilename)}"`,
      };
      res.writeHead(200, head);
      fs.createReadStream(version.storagePath).pipe(res);
    }
  } catch (error) {
    next(error);
  }
};

module.exports = {
  uploadDocument,
  listDocuments,
  getDocumentById,
  listDocumentVersions,
  uploadNewVersion,
  publishDocument,
  retireDocument,
  streamDocumentFile,
};
