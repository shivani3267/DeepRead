const path = require('path');
const fs = require('fs');

// Ensure module resolution points to server/node_modules
const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
const mongoose = require(path.join(serverNodeModules, 'mongoose'));
const dotenv = require(path.join(serverNodeModules, 'dotenv'));
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const User = require('../server/src/models/User');
const Document = require('../server/src/models/Document');
const DocumentVersion = require('../server/src/models/DocumentVersion');
const IngestionJob = require('../server/src/models/IngestionJob');
const Conversation = require('../server/src/models/Conversation');
const Message = require('../server/src/models/Message');
const Feedback = require('../server/src/models/Feedback');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepread';

async function seedDatabase() {
  console.log('[Seed] Connecting to MongoDB at', MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log('[Seed] Connected successfully.');

  // Clean or check existing
  const existingAdmin = await User.findOne({ email: 'admin@deepread.edu' });

  if (existingAdmin) {
    console.log('[Seed] Admin user already exists. Updating credentials if needed...');
    existingAdmin.password = 'AdminPassword123!';
    existingAdmin.isActive = true;
    await existingAdmin.save();
  } else {
    console.log('[Seed] Creating initial Admin user...');
    await User.create({
      name: 'System Administrator',
      email: 'admin@deepread.edu',
      password: 'AdminPassword123!',
      role: 'admin',
      department: 'University Administration',
      isActive: true,
    });
  }

  const admin = await User.findOne({ email: 'admin@deepread.edu' });

  // Faculty seed
  let faculty = await User.findOne({ email: 'faculty.vance@deepread.edu' });
  if (!faculty) {
    console.log('[Seed] Creating Faculty user (Dr. Eleanor Vance)...');
    faculty = await User.create({
      name: 'Dr. Eleanor Vance',
      email: 'faculty.vance@deepread.edu',
      password: 'FacultyPassword123!',
      role: 'faculty',
      department: 'Computer Science & AI',
      isActive: true,
      createdBy: admin._id,
    });
  }

  // Student seed
  let student = await User.findOne({ email: 'student.chen@deepread.edu' });
  if (!student) {
    console.log('[Seed] Creating Student user (Marcus Chen)...');
    student = await User.create({
      name: 'Marcus Chen',
      email: 'student.chen@deepread.edu',
      password: 'StudentPassword123!',
      role: 'student',
      department: 'Computer Science',
      isActive: true,
    });
  }

  console.log('\n=============================================');
  console.log('  DeepRead Seed Completed Successfully!     ');
  console.log('=============================================');
  console.log('Pre-configured Accounts:');
  console.log('1. Admin:   admin@deepread.edu         / AdminPassword123!');
  console.log('2. Faculty: faculty.vance@deepread.edu / FacultyPassword123!');
  console.log('3. Student: student.chen@deepread.edu  / StudentPassword123!');
  console.log('=============================================\n');

  await mongoose.disconnect();
}

seedDatabase().catch((err) => {
  console.error('[Seed Error]:', err);
  process.exit(1);
});
