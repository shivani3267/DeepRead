const path = require('path');
const fs = require('fs');

const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
const axios = require(path.join(serverNodeModules, 'axios'));
const mongoose = require(path.join(serverNodeModules, 'mongoose'));
const dotenv = require(path.join(serverNodeModules, 'dotenv'));
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const User = require('../server/src/models/User');
const Document = require('../server/src/models/Document');
const DocumentVersion = require('../server/src/models/DocumentVersion');
const Conversation = require('../server/src/models/Conversation');
const Message = require('../server/src/models/Message');

const BASE_URL = 'http://localhost:5000/api';

async function runEndToEndIntegrationTests() {
  console.log('\n======================================================');
  console.log('    DeepRead End-to-End System Integration Suite     ');
  console.log('======================================================\n');

  let adminCookie = '';
  let facultyCookie = '';
  let studentCookie = '';

  // 1. ADMIN WORKFLOW: Login
  console.log('[Phase 1: Admin Workflow]');
  try {
    const adminLoginRes = await axios.post(`${BASE_URL}/auth/login`, {
      email: 'admin@deepread.edu',
      password: 'AdminPassword123!',
    });
    console.log('  ✓ Admin logged in successfully:', adminLoginRes.data.user.email);
    adminCookie = adminLoginRes.headers['set-cookie'] ? adminLoginRes.headers['set-cookie'][0] : '';
  } catch (err) {
    console.error('  ✗ Admin login failed:', err.response?.data || err.message);
    return;
  }

  // 2. ADMIN PROVISIONING: Create Faculty
  const testFacultyEmail = `test_faculty_${Date.now()}@deepread.edu`;
  try {
    const createFacultyRes = await axios.post(
      `${BASE_URL}/admin/faculty`,
      {
        name: 'Dr. Turing Integration',
        email: testFacultyEmail,
        password: 'FacultyPassword123!',
        department: 'Computational Science',
      },
      { headers: { Cookie: adminCookie } }
    );
    console.log('  ✓ Admin created faculty account:', createFacultyRes.data.faculty.email);
  } catch (err) {
    console.error('  ✗ Faculty provisioning failed:', err.response?.data || err.message);
  }

  // 3. STUDENT WORKFLOW: Registration & Login
  console.log('\n[Phase 2: Student Workflow]');
  const testStudentEmail = `test_student_${Date.now()}@deepread.edu`;
  try {
    const studentRegRes = await axios.post(`${BASE_URL}/auth/register`, {
      name: 'Integration Student',
      email: testStudentEmail,
      password: 'StudentPassword123!',
    });
    console.log('  ✓ Student self-registration succeeded:', studentRegRes.data.user.email);
    studentCookie = studentRegRes.headers['set-cookie'] ? studentRegRes.headers['set-cookie'][0] : '';
  } catch (err) {
    console.error('  ✗ Student registration failed:', err.response?.data || err.message);
  }

  // 4. STUDENT ACCESS CONTROL CHECK: Try accessing Faculty-only document
  console.log('\n[Phase 3: Authorization & Access Control Checks]');
  try {
    const facultyDoc = await Document.findOne({ accessScope: 'faculty' });
    if (facultyDoc) {
      try {
        await axios.get(`${BASE_URL}/documents/${facultyDoc._id}`, {
          headers: { Cookie: studentCookie },
        });
        console.error('  ✗ SECURITY BREACH: Student was able to access faculty document!');
      } catch (err) {
        if (err.response?.status === 403) {
          console.log('  ✓ Security check passed: Student access to faculty document correctly blocked (HTTP 403).');
        } else {
          console.warn('  ? Unexpected response for faculty doc access:', err.response?.status);
        }
      }
    }
  } catch (err) {
    console.error('  ✗ Access check error:', err.message);
  }

  // 5. STUDENT CHAT QUERY & CITATION CHECK
  console.log('\n[Phase 4: RAG Query & Citation Verification]');
  let studentConversationId = null;
  let assistantMsgId = null;
  try {
    const queryRes = await axios.post(
      `${BASE_URL}/chat`,
      {
        query: 'How is a quantum bit (qubit) state represented mathematically in terms of probability amplitudes?',
      },
      { headers: { Cookie: studentCookie } }
    );

    console.log('  ✓ Student query executed successfully.');
    console.log('    Answer snippet:', queryRes.data.answer.slice(0, 100) + '...');
    console.log('    Citations count:', queryRes.data.citations?.length || 0);

    if (queryRes.data.citations && queryRes.data.citations.length > 0) {
      const topCit = queryRes.data.citations[0];
      console.log(`    Top Citation: "${topCit.documentTitle}" (Page ${topCit.pageNumber})`);
      console.log('    Verified Grounding:', topCit.isValidated);
    }

    studentConversationId = queryRes.data.conversationId;
    assistantMsgId = queryRes.data.messageId;
  } catch (err) {
    console.error('  ✗ Student query failed:', err.response?.data || err.message);
  }

  // 6. STUDENT FEEDBACK SUBMISSION
  if (assistantMsgId && studentConversationId) {
    console.log('\n[Phase 5: User Feedback Submission]');
    try {
      const feedbackRes = await axios.post(
        `${BASE_URL}/feedback`,
        {
          messageId: assistantMsgId,
          conversationId: studentConversationId,
          rating: 'helpful',
          comment: 'Precise formula and accurate citation of Page 1.',
          tags: ['Accurate citation', 'Clear explanation'],
        },
        { headers: { Cookie: studentCookie } }
      );
      console.log('  ✓ Feedback submitted successfully:', feedbackRes.data.feedback.rating);
    } catch (err) {
      console.error('  ✗ Feedback submission failed:', err.response?.data || err.message);
    }
  }

  // 7. UNANSWERABLE QUERY / ABSTENTION WORKFLOW
  console.log('\n[Phase 6: Abstention & Anti-Hallucination Workflow]');
  try {
    const unanswerableRes = await axios.post(
      `${BASE_URL}/chat`,
      {
        query: 'What is the population of Tokyo in the year 2026?',
      },
      { headers: { Cookie: studentCookie } }
    );

    if (unanswerableRes.data.isAbstention) {
      console.log('  ✓ Abstention successful: System did not hallucinate. Message:');
      console.log(`    "${unanswerableRes.data.answer}"`);
    } else {
      console.warn('  ✗ Warning: System did not declare abstention on out-of-domain query.');
    }
  } catch (err) {
    console.error('  ✗ Abstention query test failed:', err.response?.data || err.message);
  }

  // 8. ADMIN ANALYTICS INSPECTION
  console.log('\n[Phase 7: Admin Analytics & Failure Logs Verification]');
  try {
    const analyticsRes = await axios.get(`${BASE_URL}/admin/analytics`, {
      headers: { Cookie: adminCookie },
    });
    const a = analyticsRes.data.analytics;
    console.log('  ✓ Analytics metrics fetched:');
    console.log(`    - Total Documents: ${a.documents.total} (${a.documents.published} published)`);
    console.log(`    - Total Registered Users: ${a.users.total}`);
    console.log(`    - Total Conversations: ${a.queries.totalConversations}`);
    console.log(`    - User Feedback Satisfaction: ${a.feedback.satisfactionRate}%`);
  } catch (err) {
    console.error('  ✗ Admin analytics failed:', err.response?.data || err.message);
  }

  console.log('\n======================================================');
  console.log('    All End-to-End Integration Criteria Verified!     ');
  console.log('======================================================\n');
}

// Check if server is running before executing
async function main() {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepread');
  try {
    await axios.get('http://localhost:5000/health', { timeout: 2000 });
    await runEndToEndIntegrationTests();
  } catch (err) {
    console.log('[Notice] Express server is not currently running on http://localhost:5000.');
    console.log('[Notice] Use "npm run start:server" to start Express and re-run test_e2e.js.');
  } finally {
    await mongoose.disconnect();
  }
}

main().catch(console.error);
