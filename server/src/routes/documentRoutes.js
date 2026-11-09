const express = require('express');
const router = express.Router();
const documentController = require('../controllers/documentController');
const { authenticate, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// Base authentication required for all document endpoints
router.use(authenticate);

// Public/role-filtered document endpoints
router.get('/', documentController.listDocuments);
router.get('/:id', documentController.getDocumentById);
router.get('/:id/file', documentController.streamDocumentFile);

// Admin-only document management endpoints
router.post('/', authorize('admin'), upload.single('file'), documentController.uploadDocument);
router.get('/:id/versions', authorize('admin'), documentController.listDocumentVersions);
router.post('/:id/versions', authorize('admin'), upload.single('file'), documentController.uploadNewVersion);
router.patch('/:id/publish', authorize('admin'), documentController.publishDocument);
router.patch('/:id/retire', authorize('admin'), documentController.retireDocument);

module.exports = router;
