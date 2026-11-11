const path = require('path');
const fs = require('fs');

const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
const axios = require(path.join(serverNodeModules, 'axios'));

async function testUploadAndQuery() {
  console.log('\n[Testing Live PDF Upload & Ingestion via Express -> FastAPI]');

  // 1. Admin login
  const loginRes = await axios.post('http://localhost:5000/api/auth/login', {
    email: 'admin@deepread.edu',
    password: 'AdminPassword123!',
  });
  const cookie = loginRes.headers['set-cookie'][0];
  console.log('✓ Admin authenticated');

  // 2. Upload PDF using standard FormData
  const pdfPath = path.resolve(__dirname, '../storage/sample_docs/Introduction_to_Quantum_Computing.pdf');
  const fileBuffer = fs.readFileSync(pdfPath);
  const blob = new Blob([fileBuffer], { type: 'application/pdf' });

  const formData = new FormData();
  formData.append('title', 'Quantum Computing Live Verification');
  formData.append('description', 'Live integration test document');
  formData.append('category', 'Quantum Physics');
  formData.append('subject', 'Computer Science');
  formData.append('accessScope', 'public');
  formData.append('file', blob, 'Introduction_to_Quantum_Computing.pdf');

  const uploadRes = await axios.post('http://localhost:5000/api/documents', formData, {
    headers: {
      Cookie: cookie,
    },
  });

  console.log('✓ Document uploaded:', uploadRes.data.document.title);
  console.log('  Job ID:', uploadRes.data.jobId);

  // Wait 3 seconds for background ingestion to complete
  console.log('  Waiting 3s for background ingestion...');
  await new Promise((r) => setTimeout(r, 3000));

  // 3. Query the uploaded document
  console.log('\n[Testing Live Query Against Newly Ingested Document]');
  const queryRes = await axios.post(
    'http://localhost:5000/api/chat',
    {
      query: 'How is a quantum bit (qubit) state represented mathematically in terms of probability amplitudes?',
    },
    {
      headers: { Cookie: cookie },
    }
  );

  console.log('✓ Live Query Response:');
  console.log('  Answer:', queryRes.data.answer);
  console.log('  Citations count:', queryRes.data.citations?.length || 0);
  if (queryRes.data.citations?.length > 0) {
    console.log('  Top Citation:', queryRes.data.citations[0].documentTitle, 'Page:', queryRes.data.citations[0].pageNumber);
    console.log('  Grounding Verified:', queryRes.data.citations[0].isValidated);
  }

  if (queryRes.data.citations?.length === 0 || queryRes.data.isAbstention) {
    throw new Error('Expected grounded response with citations for newly ingested document!');
  }
  console.log('\n✓ PDF Upload, FastAPI Ingestion, Vector Indexing, and Citation Grounding Verified Successfully!');
}

testUploadAndQuery().catch((err) => {
  console.error('Test error:', err.response?.data || err.message);
});
