const mongoose = require('mongoose');

jest.setTimeout(45000);

const MONGO_TEST_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepread_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_TEST_URI);
  }
});

afterAll(async () => {
  // Allow connection to persist across in-band test suites; final teardown handled by Jest exit
});
