const request = require('supertest');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const app = require('../src/app');
const User = require('../src/models/User');
const Document = require('../src/models/Document');
const config = require('../src/config/env');

jest.setTimeout(45000);
const MONGO_TEST_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepread_test';

let studentToken;
let facultyToken;
let adminToken;
let studentUser;
let facultyUser;
let adminUser;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_TEST_URI);
  }

  // Clean previous test users
  await User.deleteMany({ email: /@test\.edu$/ });

  // Create test accounts
  studentUser = await User.create({
    name: 'Access Student',
    email: 'access_student@test.edu',
    password: 'Password123!',
    role: 'student',
  });

  facultyUser = await User.create({
    name: 'Access Faculty',
    email: 'access_faculty@test.edu',
    password: 'Password123!',
    role: 'faculty',
  });

  adminUser = await User.create({
    name: 'Access Admin',
    email: 'access_admin@test.edu',
    password: 'Password123!',
    role: 'admin',
  });

  studentToken = jwt.sign({ id: studentUser._id, role: 'student' }, config.jwt.secret);
  facultyToken = jwt.sign({ id: facultyUser._id, role: 'faculty' }, config.jwt.secret);
  adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, config.jwt.secret);
});

afterAll(async () => {
  await User.deleteMany({ email: /@test\.edu$/ });
});

describe('Role-Based Access Control (RBAC) Tests', () => {
  it('denies student access to admin faculty creation endpoint', async () => {
    const res = await request(app)
      .post('/api/admin/faculty')
      .set('Authorization', `Bearer ${studentToken}`)
      .send({
        name: 'Illegal Faculty',
        email: 'illegal@test.edu',
        password: 'Password123!',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/Forbidden/i);
  });

  it('denies faculty access to admin faculty creation endpoint', async () => {
    const res = await request(app)
      .post('/api/admin/faculty')
      .set('Authorization', `Bearer ${facultyToken}`)
      .send({
        name: 'Illegal Faculty By Faculty',
        email: 'illegal2@test.edu',
        password: 'Password123!',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('allows admin to access admin analytics', async () => {
    const res = await request(app)
      .get('/api/admin/analytics')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.analytics).toBeDefined();
  });

  it('allows admin to provision a new faculty member', async () => {
    const res = await request(app)
      .post('/api/admin/faculty')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Dr. Valid Faculty',
        email: 'valid_faculty@test.edu',
        password: 'Password123!',
        department: 'Physics',
      })
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.faculty.role).toBe('faculty');
  });

  it('denies unauthenticated requests to protected endpoints', async () => {
    const res = await request(app).get('/api/auth/me').expect(401);
    expect(res.body.success).toBe(false);
  });
});
