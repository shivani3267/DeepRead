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
let studentDocId;
let facultyDocId;
let draftDocId;

beforeAll(async () => {
  if (mongoose.connection.readyState === 0) {
    await mongoose.connect(MONGO_TEST_URI);
  }

  await User.deleteMany({ email: /@test\.edu$/ });

  const studentUser = await User.create({
    name: 'Doc Student',
    email: 'doc_student@test.edu',
    password: 'Password123!',
    role: 'student',
  });

  const facultyUser = await User.create({
    name: 'Doc Faculty',
    email: 'doc_faculty@test.edu',
    password: 'Password123!',
    role: 'faculty',
  });

  const adminUser = await User.create({
    name: 'Doc Admin',
    email: 'doc_admin@test.edu',
    password: 'Password123!',
    role: 'admin',
  });

  studentToken = jwt.sign({ id: studentUser._id, role: 'student' }, config.jwt.secret);
  facultyToken = jwt.sign({ id: facultyUser._id, role: 'faculty' }, config.jwt.secret);
  adminToken = jwt.sign({ id: adminUser._id, role: 'admin' }, config.jwt.secret);

  // Create documents with different scopes
  const sDoc = await Document.create({
    title: 'Student Accessible Doc',
    originalFilename: 'student.pdf',
    uploadedBy: adminUser._id,
    accessScope: 'student',
    publicationStatus: 'published',
  });
  studentDocId = sDoc._id;

  const fDoc = await Document.create({
    title: 'Faculty Restricted Doc',
    originalFilename: 'faculty.pdf',
    uploadedBy: adminUser._id,
    accessScope: 'faculty',
    publicationStatus: 'published',
  });
  facultyDocId = fDoc._id;

  const dDoc = await Document.create({
    title: 'Unpublished Draft Doc',
    originalFilename: 'draft.pdf',
    uploadedBy: adminUser._id,
    accessScope: 'student',
    publicationStatus: 'draft',
  });
  draftDocId = dDoc._id;
});

afterAll(async () => {
  await User.deleteMany({ email: /@test\.edu$/ });
  await Document.deleteMany({ _id: { $in: [studentDocId, facultyDocId, draftDocId] } });
});

describe('Document Scope Filtering & Access Control Tests', () => {
  it('student query includes student documents but excludes faculty documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);

    const docIds = res.body.documents.map((d) => d._id.toString());
    expect(docIds).toContain(studentDocId.toString());
    expect(docIds).not.toContain(facultyDocId.toString());
    expect(docIds).not.toContain(draftDocId.toString());
  });

  it('student cannot view faculty document directly by id', async () => {
    const res = await request(app)
      .get(`/api/documents/${facultyDocId}`)
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(403);

    expect(res.body.success).toBe(false);
  });

  it('faculty query includes both student and faculty documents', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${facultyToken}`)
      .expect(200);

    const docIds = res.body.documents.map((d) => d._id.toString());
    expect(docIds).toContain(studentDocId.toString());
    expect(docIds).toContain(facultyDocId.toString());
    expect(docIds).not.toContain(draftDocId.toString());
  });

  it('admin query includes all documents regardless of scope or draft status', async () => {
    const res = await request(app)
      .get('/api/documents')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const docIds = res.body.documents.map((d) => d._id.toString());
    expect(docIds).toContain(studentDocId.toString());
    expect(docIds).toContain(facultyDocId.toString());
    expect(docIds).toContain(draftDocId.toString());
  });
});
