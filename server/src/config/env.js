const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

const config = {
  port: parseInt(process.env.PORT, 10) || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  mongoUri: process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepread',
  jwt: {
    secret: process.env.JWT_SECRET || 'deepread_jwt_secret_dev_key',
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    cookieSecure: process.env.COOKIE_SECURE === 'true',
  },
  aiService: {
    url: process.env.AI_SERVICE_URL || 'http://localhost:8000',
    internalKey: process.env.INTERNAL_SERVICE_KEY || 'deepread_internal_secure_api_key_89234719',
    timeout: 300000,
  },
  storage: {
    documentsDir: path.resolve(__dirname, process.env.STORAGE_DIR || '../../../storage/documents'),
    tempDir: path.resolve(__dirname, '../../../storage/temp'),
    maxFileSizeMb: parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 25,
  },
};

module.exports = config;
