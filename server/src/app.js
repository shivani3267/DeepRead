const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const config = require('./config/env');
const errorHandler = require('./middleware/errorHandler');

// Route imports
const authRoutes = require('./routes/authRoutes');
const adminRoutes = require('./routes/adminRoutes');
const documentRoutes = require('./routes/documentRoutes');
const chatRoutes = require('./routes/chatRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');

const app = express();

// Security and CORS configuration
app.use(
  cors({
    origin: [config.clientUrl, 'http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);

app.use(cookieParser());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health Check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    service: 'DeepRead Express Backend',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
  });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/feedback', feedbackRoutes);

// Convenience routes for direct /api/conversations access
app.get('/api/conversations', (req, res, next) => {
  req.url = '/conversations';
  chatRoutes(req, res, next);
});
app.get('/api/conversations/:id', (req, res, next) => {
  req.url = `/conversations/${req.params.id}`;
  chatRoutes(req, res, next);
});
app.delete('/api/conversations/:id', (req, res, next) => {
  req.url = `/conversations/${req.params.id}`;
  chatRoutes(req, res, next);
});

// 404 Fallback
app.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `Resource not found at endpoint ${req.originalUrl}`,
  });
});

// Global Error Handler
app.use(errorHandler);

module.exports = app;
