const Feedback = require('../models/Feedback');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

/**
 * Submit feedback on an AI assistant answer
 */
const submitFeedback = async (req, res, next) => {
  try {
    const { messageId, conversationId, rating, comment, tags } = req.body;

    if (!messageId || !conversationId || !rating) {
      return res.status(400).json({
        success: false,
        message: 'messageId, conversationId, and rating (helpful/unhelpful) are required.',
      });
    }

    if (!['helpful', 'unhelpful'].includes(rating)) {
      return res.status(400).json({
        success: false,
        message: "Rating must be either 'helpful' or 'unhelpful'.",
      });
    }

    // Verify conversation ownership
    const conversation = await Conversation.findOne({
      _id: conversationId,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(403).json({
        success: false,
        message: 'You can only submit feedback on your own conversation messages.',
      });
    }

    // Verify message exists and is an assistant message
    const message = await Message.findOne({
      _id: messageId,
      conversationId,
      sender: 'assistant',
    });

    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Assistant message not found in this conversation.',
      });
    }

    // Upsert feedback
    let feedback = await Feedback.findOne({ messageId });

    if (feedback) {
      feedback.rating = rating;
      feedback.comment = comment || '';
      feedback.tags = tags || [];
      await feedback.save();
    } else {
      feedback = await Feedback.create({
        userId: req.user._id,
        messageId,
        conversationId,
        rating,
        comment: comment || '',
        tags: tags || [],
      });
      message.feedback = feedback._id;
      await message.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Feedback submitted successfully.',
      feedback,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitFeedback,
};
