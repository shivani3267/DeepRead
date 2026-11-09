const User = require('../models/User');
const Document = require('../models/Document');
const DocumentVersion = require('../models/DocumentVersion');
const IngestionJob = require('../models/IngestionJob');
const Feedback = require('../models/Feedback');
const Message = require('../models/Message');
const Conversation = require('../models/Conversation');
const auditService = require('../services/auditService');

/**
 * Admin creates a new Faculty account
 */
const createFaculty = async (req, res, next) => {
  try {
    const { name, email, password, department } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and temporary password are required.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email address already exists.',
      });
    }

    const faculty = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'faculty',
      department: department || 'Academic Faculty',
      isActive: true,
      createdBy: req.user._id,
    });

    await auditService.logAction({
      userId: req.user._id,
      action: 'FACULTY_CREATED',
      details: { facultyId: faculty._id, email: faculty.email, name: faculty.name },
      req,
    });

    return res.status(201).json({
      success: true,
      message: 'Faculty account created successfully.',
      faculty: {
        id: faculty._id,
        name: faculty.name,
        email: faculty.email,
        role: faculty.role,
        department: faculty.department,
        isActive: faculty.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * List all users with filtering, search, and pagination
 */
const listUsers = async (req, res, next) => {
  try {
    const { role, status, search, page = 1, limit = 20 } = req.query;

    const filter = {};
    if (role && ['student', 'faculty', 'admin'].includes(role)) {
      filter.role = role;
    }
    if (status) {
      filter.isActive = status === 'active';
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { department: { $regex: search, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page, 10) - 1) * parseInt(limit, 10);
    const users = await User.find(filter)
      .select('-__v')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit, 10));

    const total = await User.countDocuments(filter);

    return res.status(200).json({
      success: true,
      total,
      page: parseInt(page, 10),
      totalPages: Math.ceil(total / parseInt(limit, 10)),
      users,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle user active/deactivated status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: "'isActive' boolean field is required.",
      });
    }

    if (req.user._id.toString() === id) {
      return res.status(400).json({
        success: false,
        message: 'Administrators cannot deactivate their own account.',
      });
    }

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    user.isActive = isActive;
    await user.save();

    await auditService.logAction({
      userId: req.user._id,
      action: 'USER_STATUS_UPDATED',
      details: { targetUserId: user._id, isActive },
      req,
    });

    return res.status(200).json({
      success: true,
      message: `User account has been ${isActive ? 'activated' : 'deactivated'} successfully.`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Comprehensive usage analytics, document status, feedback, and unanswered queries
 */
const getAnalytics = async (req, res, next) => {
  try {
    // 1. User breakdown
    const userStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
    ]);
    const usersByRole = { student: 0, faculty: 0, admin: 0 };
    userStats.forEach((s) => {
      if (usersByRole[s._id] !== undefined) usersByRole[s._id] = s.count;
    });

    // 2. Document breakdown
    const totalDocs = await Document.countDocuments();
    const publishedDocs = await Document.countDocuments({ publicationStatus: 'published' });
    const docsByScope = await Document.aggregate([
      { $group: { _id: '$accessScope', count: { $sum: 1 } } },
    ]);

    // 3. Ingestion Jobs
    const totalJobs = await IngestionJob.countDocuments();
    const failedJobs = await IngestionJob.countDocuments({ status: 'failed' });
    const completedJobs = await IngestionJob.countDocuments({ status: 'completed' });
    const processingJobs = await IngestionJob.countDocuments({ status: 'processing' });

    // Recent failed ingestion jobs for monitoring
    const recentFailedJobs = await IngestionJob.find({ status: 'failed' })
      .populate('documentId', 'title')
      .sort({ createdAt: -1 })
      .limit(5);

    // 4. Query & Conversation metrics
    const totalConversations = await Conversation.countDocuments();
    const totalMessages = await Message.countDocuments();
    const assistantMessages = await Message.countDocuments({ sender: 'assistant' });
    const abstentions = await Message.countDocuments({ sender: 'assistant', isAbstention: true });

    // 5. Feedback breakdown
    const helpfulCount = await Feedback.countDocuments({ rating: 'helpful' });
    const unhelpfulCount = await Feedback.countDocuments({ rating: 'unhelpful' });
    const totalFeedback = helpfulCount + unhelpfulCount;
    const satisfactionRate = totalFeedback > 0 ? Math.round((helpfulCount / totalFeedback) * 100) : 100;

    // Common feedback tags
    const feedbackTags = await Feedback.aggregate([
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 10 },
    ]);

    // 6. Recent unanswerable queries (where AI abstained)
    const recentAbstentions = await Message.find({ sender: 'assistant', isAbstention: true })
      .populate('conversationId', 'userId')
      .sort({ createdAt: -1 })
      .limit(8)
      .lean();

    return res.status(200).json({
      success: true,
      analytics: {
        users: {
          total: await User.countDocuments(),
          byRole: usersByRole,
        },
        documents: {
          total: totalDocs,
          published: publishedDocs,
          byScope: docsByScope,
        },
        ingestion: {
          total: totalJobs,
          completed: completedJobs,
          processing: processingJobs,
          failed: failedJobs,
          recentFailures: recentFailedJobs,
        },
        queries: {
          totalConversations,
          totalMessages,
          assistantResponses: assistantMessages,
          abstentions,
          abstentionRate: assistantMessages > 0 ? Math.round((abstentions / assistantMessages) * 100) : 0,
        },
        feedback: {
          total: totalFeedback,
          helpful: helpfulCount,
          unhelpful: unhelpfulCount,
          satisfactionRate,
          topTags: feedbackTags,
        },
        recentAbstentions,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createFaculty,
  listUsers,
  updateUserStatus,
  getAnalytics,
};
