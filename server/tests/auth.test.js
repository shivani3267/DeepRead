const request = require('supertest');
const mongoose = require('mongoose');
const app = require('../src/app');
const User = require('../src/models/User');

jest.setTimeout(45000);
const MONGO_TEST_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepread_test';

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_TEST_URI);
  }
  await User.deleteMany({ email: /@test\.edu$/ });
});

afterAll(async () => {
  await User.deleteMany({ email: /@test\.edu$/ });
});

describe('Authentication & Role Enforcement Tests', () => {
  const testStudent = {
    name: 'Test Student',
    email: 'new_student@test.edu',
    password: 'Password123!',
  };

  it('allows student self-registration', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send(testStudent)
      .expect(201);

    expect(res.body.success).toBe(true);
    expect(res.body.user.role).toBe('student');
    expect(res.headers['set-cookie']).toBeDefined();
  });

  it('strictly rejects public registration with admin role override', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attacker Trying Admin',
        email: 'attacker@test.edu',
        password: 'Password123!',
        role: 'admin',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
    expect(res.body.message).toMatch(/restricted to Students only/i);
  });

  it('strictly rejects public registration with faculty role override', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Attacker Trying Faculty',
        email: 'attacker2@test.edu',
        password: 'Password123!',
        role: 'faculty',
      })
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('authenticates valid credentials and sets HTTP-only cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: testStudent.password,
      })
      .expect(200);

    expect(res.body.success).toBe(true);
    expect(res.body.user.email).toBe(testStudent.email);
    expect(res.headers['set-cookie'][0]).toMatch(/auth_token=/);
  });

  it('rejects invalid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        email: testStudent.email,
        password: 'WrongPassword999!',
      })
      .expect(401);

    expect(res.body.success).toBe(false);
  });
});
