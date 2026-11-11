const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const config = require('../config/env');

// Ensure storage directories exist
if (!fs.existsSync(config.storage.documentsDir)) {
  fs.mkdirSync(config.storage.documentsDir, { recursive: true });
}
if (!fs.existsSync(config.storage.tempDir)) {
  fs.mkdirSync(config.storage.tempDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.storage.documentsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeFilename = `${uuidv4()}${ext}`;
    cb(null, safeFilename);
  },
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype === 'application/pdf' || path.extname(file.originalname).toLowerCase() === '.pdf') {
    cb(null, true);
  } else {
    cb(new Error('Invalid file format. Only academic PDF documents (.pdf) are permitted.'), false);
  }
};

const upload = multer({
  storage,
  limits: {
    fileSize: config.storage.maxFileSizeMb * 1024 * 1024,
  },
  fileFilter,
});

module.exports = upload;
