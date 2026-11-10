const express = require('express');
const router = express.Router();
const feedbackController = require('../controllers/feedbackController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);

router.post('/', feedbackController.submitFeedback);

module.exports = router;
