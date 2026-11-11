const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { authenticate, authorize } = require('../middleware/auth');

// All routes here strictly require admin role
router.use(authenticate, authorize('admin'));

router.post('/faculty', adminController.createFaculty);
router.get('/users', adminController.listUsers);
router.patch('/users/:id/status', adminController.updateUserStatus);
router.get('/analytics', adminController.getAnalytics);

module.exports = router;
