const jwt = require('jsonwebtoken');
const User = require('../models/User');
const config = require('../config/env');
const auditService = require('../services/auditService');

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      email: user.email,
      role: user.role,
    },
    config.jwt.secret,
    {
      expiresIn: config.jwt.expiresIn,
    }
  );
};

const sendTokenResponse = (user, statusCode, res, message = 'Success') => {
  const token = generateToken(user);

  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true,
    secure: config.jwt.cookieSecure || config.nodeEnv === 'production',
    sameSite: 'lax',
  };

  res
    .status(statusCode)
    .cookie('auth_token', token, cookieOptions)
    .json({
      success: true,
      message,
      token, // Also provided for bearer token clients/tests
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        department: user.department,
        isActive: user.isActive,
      },
    });
};

/**
 * Public student registration only.
 * Role is strictly enforced as 'student' - frontend role overrides are rejected.
 */
const register = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required.',
      });
    }

    if (role && role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Public registration is restricted to Students only. Faculty and Admin roles cannot self-register.',
      });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email address already exists.',
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password,
      role: 'student',
      isActive: true,
    });

    await auditService.logAction({
      userId: user._id,
      action: 'STUDENT_REGISTERED',
      details: { email: user.email, name: user.name },
      req,
    });

    sendTokenResponse(user, 201, res, 'Student account registered successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Login for all roles (Student, Faculty, Admin)
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+password');

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.',
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Account has been deactivated. Contact an administrator.',
      });
    }

    user.lastLoginAt = new Date();
    await user.save({ validateBeforeSave: false });

    await auditService.logAction({
      userId: user._id,
      action: 'USER_LOGIN',
      details: { role: user.role, email: user.email },
      req,
    });

    sendTokenResponse(user, 200, res, 'Logged in successfully.');
  } catch (error) {
    next(error);
  }
};

/**
 * Logout clears HTTP-only cookie
 */
const logout = async (req, res) => {
  res.clearCookie('auth_token', {
    httpOnly: true,
    sameSite: 'lax',
  });
  return res.status(200).json({
    success: true,
    message: 'Logged out successfully.',
  });
};

/**
 * Current user profile endpoint
 */
const getMe = async (req, res) => {
  return res.status(200).json({
    success: true,
    user: {
      id: req.user._id,
      name: req.user.name,
      email: req.user.email,
      role: req.user.role,
      department: req.user.department,
      isActive: req.user.isActive,
      createdAt: req.user.createdAt,
    },
  });
};

module.exports = {
  register,
  login,
  logout,
  getMe,
};
