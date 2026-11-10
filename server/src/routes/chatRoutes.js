const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { authenticate } = require('../middleware/auth');
const { queryLimiter } = require('../middleware/rateLimiter');

router.use(authenticate);

// Chat & Query
router.post('/', queryLimiter, chatController.askQuestion);

// Conversations management
router.get('/conversations', chatController.listConversations);
router.get('/conversations/:id', chatController.getConversation);
router.delete('/conversations/:id', chatController.deleteConversation);

module.exports = router;
