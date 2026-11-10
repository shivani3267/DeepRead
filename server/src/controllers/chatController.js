const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const Document = require('../models/Document');
const documentService = require('../services/documentService');
const aiServiceClient = require('../services/aiServiceClient');

/**
 * Handle user question with RAG pipeline and strict authorization filtering
 */
const askQuestion = async (req, res, next) => {
  try {
    const { query, conversationId, documentIds } = req.body;

    if (!query || typeof query !== 'string' || !query.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid question query string is required.',
      });
    }

    // 1. Determine authorized document IDs for this user
    const authorizedDocumentIds = await documentService.getAuthorizedDocumentIds(
      req.user,
      documentIds && documentIds.length > 0 ? documentIds : null
    );

    // 2. Find or create conversation
    let conversation;
    if (conversationId) {
      conversation = await Conversation.findOne({
        _id: conversationId,
        userId: req.user._id,
      });

      if (!conversation) {
        return res.status(404).json({
          success: false,
          message: 'Conversation not found or access denied.',
        });
      }
    } else {
      conversation = await Conversation.create({
        userId: req.user._id,
        title: query.trim().slice(0, 80) + (query.length > 80 ? '...' : ''),
        documentScope: authorizedDocumentIds,
      });
    }

    // Save user question to database
    const userMessage = await Message.create({
      conversationId: conversation._id,
      sender: 'user',
      content: query.trim(),
    });

    // If user has access to 0 documents, abstain immediately without wasting LLM calls
    if (authorizedDocumentIds.length === 0) {
      const abstentionText =
        'There are currently no published academic documents accessible to your account for this inquiry.';

      const assistantMessage = await Message.create({
        conversationId: conversation._id,
        sender: 'assistant',
        content: abstentionText,
        citations: [],
        isAbstention: true,
        confidence: 0,
      });

      return res.status(200).json({
        success: true,
        conversationId: conversation._id,
        userMessageId: userMessage._id,
        messageId: assistantMessage._id,
        answer: abstentionText,
        citations: [],
        isAbstention: true,
        confidence: 0,
      });
    }

    // 3. Call AI Service with authorized document IDs
    const aiResult = await aiServiceClient.queryRAG({
      query: query.trim(),
      authorizedDocumentIds,
      userId: req.user._id,
      conversationId: conversation._id,
      topK: 5,
    });

    // 4. Enrich citations with document titles from MongoDB
    const citations = [];
    if (aiResult.citations && Array.isArray(aiResult.citations)) {
      for (const cit of aiResult.citations) {
        let docTitle = cit.document_title;
        if ((!docTitle || docTitle === 'Academic Document') && cit.document_id) {
          const doc = await Document.findById(cit.document_id).select('title');
          if (doc && doc.title) {
            docTitle = doc.title;
          }
        }

        citations.push({
          documentId: cit.document_id,
          documentTitle: docTitle || 'Academic Document',
          versionId: cit.version_id || null,
          pageNumber: cit.page_number || 1,
          snippet: cit.snippet || '',
          similarityScore: cit.similarity_score || 0,
          isValidated: cit.is_validated !== false,
        });
      }
    }

    // 5. Store assistant message in MongoDB
    const assistantMessage = await Message.create({
      conversationId: conversation._id,
      sender: 'assistant',
      content: aiResult.answer,
      citations,
      isAbstention: Boolean(aiResult.is_abstention),
      confidence: typeof aiResult.confidence === 'number' ? aiResult.confidence : 1.0,
      retrievalFeatures: aiResult.retrieval_features || {},
    });

    // Update conversation metadata
    conversation.lastMessageAt = new Date();
    await conversation.save();

    return res.status(200).json({
      success: true,
      conversationId: conversation._id,
      userMessageId: userMessage._id,
      messageId: assistantMessage._id,
      answer: aiResult.answer,
      citations,
      isAbstention: assistantMessage.isAbstention,
      confidence: assistantMessage.confidence,
      answerability: aiResult.answerability,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all conversations belonging to the current user
 */
const listConversations = async (req, res, next) => {
  try {
    const conversations = await Conversation.find({ userId: req.user._id })
      .sort({ lastMessageAt: -1 })
      .limit(50);

    return res.status(200).json({
      success: true,
      count: conversations.length,
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get messages of a specific conversation (ownership enforced)
 */
const getConversation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findOne({
      _id: id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access unauthorized.',
      });
    }

    const messages = await Message.find({ conversationId: id })
      .populate('feedback')
      .sort({ createdAt: 1 });

    return res.status(200).json({
      success: true,
      conversation,
      messages,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete conversation and its messages
 */
const deleteConversation = async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await Conversation.findOneAndDelete({
      _id: id,
      userId: req.user._id,
    });

    if (!conversation) {
      return res.status(404).json({
        success: false,
        message: 'Conversation not found or access unauthorized.',
      });
    }

    await Message.deleteMany({ conversationId: id });

    return res.status(200).json({
      success: true,
      message: 'Conversation deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  askQuestion,
  listConversations,
  getConversation,
  deleteConversation,
};
