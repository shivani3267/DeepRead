const mongoose = require('mongoose');
const User = require('./src/models/User');
const config = require('./src/config/env');

console.log('Mongo URI loaded:', !!process.env.MONGO_URI);
const createAdmin = async () => {
  try {
    await mongoose.connect(config.mongoUri);

    const existingAdmin = await User.findOne({ role: 'admin' });

    if (existingAdmin) {
      console.log('Admin already exists:', existingAdmin.email);
      return;
    }

    const admin = await User.create({
      name: 'DeepRead Admin',
      email: 'admin@deepread.com',
      password: 'Admin@123456',
      role: 'admin',
      department: 'Administration',
      isActive: true
    });

    console.log('Admin created successfully:', admin.email);
  } catch (error) {
    console.error('Error creating admin:', error.message);
  } finally {
    await mongoose.disconnect();
  }
};

createAdmin();