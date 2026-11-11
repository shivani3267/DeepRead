const path = require('path');
const fs = require('fs');

const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
const mongoose = require(path.join(serverNodeModules, 'mongoose'));
const dotenv = require(path.join(serverNodeModules, 'dotenv'));
const axios = require(path.join(serverNodeModules, 'axios'));

dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const Document = require('../server/src/models/Document');
const DocumentVersion = require('../server/src/models/DocumentVersion');

const AI_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:8000';
const INTERNAL_KEY = process.env.INTERNAL_SERVICE_KEY || 'deepread_internal_secure_api_key_89234719';
const SAMPLE_DOCS = path.resolve(__dirname, '../storage/sample_docs');
const STORAGE_DOCS = path.resolve(__dirname, '../storage/documents');

async function syncAndIndexAll() {
  console.log('[Sync & Indexer] Connecting to MongoDB Atlas...');
  await mongoose.connect(process.env.MONGODB_URI);

  const docs = await Document.find({ publicationStatus: 'published' }).populate('currentVersionId');
  console.log(`[Sync & Indexer] Found ${docs.length} published documents in MongoDB.`);

  let totalIndexed = 0;

  for (const doc of docs) {
    console.log(`\nProcessing: "${doc.title}" (ID: ${doc._id}, Scope: ${doc.accessScope})`);

    // Determine PDF file path
    let filePath = null;
    if (doc.currentVersionId && doc.currentVersionId.storagePath && fs.existsSync(doc.currentVersionId.storagePath)) {
      filePath = doc.currentVersionId.storagePath;
    } else {
      // Look in storage/documents or sample_docs
      const candidates = [
        path.join(STORAGE_DOCS, doc.originalFilename || ''),
        path.join(SAMPLE_DOCS, doc.originalFilename || ''),
        path.join(SAMPLE_DOCS, doc.title.toLowerCase().includes('quantum') ? 'Introduction_to_Quantum_Computing.pdf' :
                               doc.title.toLowerCase().includes('machine') ? 'Machine_Learning_Fundamentals.pdf' :
                               doc.title.toLowerCase().includes('policy') || doc.title.toLowerCase().includes('faculty') ? 'Institutional_Faculty_Policy.pdf' : '')
      ];
      for (const cand of candidates) {
        if (cand && fs.existsSync(cand)) {
          filePath = cand;
          break;
        }
      }
    }

    if (!filePath || !fs.existsSync(filePath)) {
      console.warn(`  ⚠️ Could not locate PDF on disk for "${doc.title}". Skipping.`);
      continue;
    }

    console.log(`  Source PDF: ${filePath}`);

    try {
      const versionId = doc.currentVersionId?._id?.toString() || 'v1';
      const res = await axios.post(
        `${AI_URL}/internal/ingestion`,
        {
          document_id: doc._id.toString(),
          version_id: versionId,
          file_path: filePath,
          metadata: {
            title: doc.title,
            category: doc.category,
            access_scope: doc.accessScope,
          },
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Internal-Service-Key': INTERNAL_KEY,
          },
        }
      );

      console.log(`  ✓ Ingested: ${res.data.extracted_pages} pages, ${res.data.generated_chunks} chunks indexed.`);
      totalIndexed += res.data.indexed_vectors || 0;
    } catch (err) {
      console.error(`  ✗ Ingestion error:`, err.response?.data || err.message);
    }
  }

  console.log(`\n======================================================`);
  console.log(`  All Documents Synchronized to Local Persistent Vector Store!`);
  console.log(`  Total Vectors in Index: ${totalIndexed}`);
  console.log(`======================================================`);

  await mongoose.disconnect();
}

syncAndIndexAll().catch((err) => {
  console.error('[Sync Error]:', err);
  process.exit(1);
});
