const path = require('path');
const fs = require('fs');

const serverNodeModules = path.resolve(__dirname, '../server/node_modules');
const mongoose = require(path.join(serverNodeModules, 'mongoose'));
const dotenv = require(path.join(serverNodeModules, 'dotenv'));
dotenv.config({ path: path.resolve(__dirname, '../server/.env') });

const User = require('../server/src/models/User');
const Document = require('../server/src/models/Document');
const DocumentVersion = require('../server/src/models/DocumentVersion');
const IngestionJob = require('../server/src/models/IngestionJob');
const aiServiceClient = require('../server/src/services/aiServiceClient');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/deepread';
const SAMPLE_DOCS_DIR = path.resolve(__dirname, '../storage/sample_docs');
const STORAGE_DOCS_DIR = path.resolve(__dirname, '../storage/documents');

if (!fs.existsSync(STORAGE_DOCS_DIR)) {
  fs.mkdirSync(STORAGE_DOCS_DIR, { recursive: true });
}

const docsToSeed = [
  {
    title: 'Introduction to Quantum Information Science',
    filename: 'Introduction_to_Quantum_Computing.pdf',
    description: 'Foundations of quantum superposition, Bell state entanglement, quantum logic gates, and Shor/Grover algorithms.',
    category: 'Quantum Computing',
    subject: 'Physics & Computer Science',
    accessScope: 'public',
  },
  {
    title: 'Foundations of Statistical Machine Learning',
    filename: 'Machine_Learning_Fundamentals.pdf',
    description: 'Core machine learning paradigms: supervised vs unsupervised learning, bias-variance tradeoff, regularization, and gradient descent optimization.',
    category: 'Computer Science',
    subject: 'Artificial Intelligence',
    accessScope: 'student',
  },
  {
    title: 'Institutional Faculty Research Ethics and Consulting Policy',
    filename: 'Institutional_Faculty_Policy.pdf',
    description: 'Official academic policies governing authorship integrity, conflicts of interest, external consulting time commitments, and sabbatical leaves.',
    category: 'Institutional Policy',
    subject: 'Academic Governance',
    accessScope: 'faculty',
  },
];

async function seedDocuments() {
  console.log('[Document Seeder] Connecting to MongoDB...');
  await mongoose.connect(MONGO_URI);

  const admin = await User.findOne({ role: 'admin' });
  if (!admin) {
    console.error('No admin found. Please run seed.js first.');
    process.exit(1);
  }

  for (const docMeta of docsToSeed) {
    const srcPath = path.join(SAMPLE_DOCS_DIR, docMeta.filename);
    if (!fs.existsSync(srcPath)) {
      console.warn(`File ${srcPath} does not exist. Skipping.`);
      continue;
    }

    let existingDoc = await Document.findOne({ title: docMeta.title });
    if (existingDoc) {
      console.log(`Document '${docMeta.title}' already exists. Skipping.`);
      continue;
    }

    console.log(`[Document Seeder] Seeding document: ${docMeta.title}`);

    // Copy to storage/documents
    const destFilename = `${Date.now()}_${docMeta.filename}`;
    const destPath = path.join(STORAGE_DOCS_DIR, destFilename);
    fs.copyFileSync(srcPath, destPath);
    const stat = fs.statSync(destPath);

    const doc = await Document.create({
      title: docMeta.title,
      description: docMeta.description,
      category: docMeta.category,
      subject: docMeta.subject,
      originalFilename: docMeta.filename,
      uploadedBy: admin._id,
      accessScope: docMeta.accessScope,
      currentVersion: 1,
      publicationStatus: 'published',
    });

    const version = await DocumentVersion.create({
      documentId: doc._id,
      versionNumber: 1,
      storagePath: destPath,
      originalFilename: docMeta.filename,
      fileSize: stat.size,
      mimeType: 'application/pdf',
      pageCount: docMeta.filename.includes('Quantum') ? 5 : docMeta.filename.includes('Machine') ? 5 : 3,
      chunkCount: 8,
      status: 'indexed',
      uploadedBy: admin._id,
    });

    doc.currentVersionId = version._id;
    await doc.save();

    console.log(`[Document Seeder] Document created with ID: ${doc._id} (Scope: ${doc.accessScope})`);

    try {
      await aiServiceClient.triggerIngestion({
        documentId: doc._id,
        versionId: version._id,
        filePath: destPath,
        metadata: {
          title: doc.title,
          category: doc.category,
          accessScope: doc.accessScope,
        },
      });
      console.log(`[Document Seeder] Successfully indexed vectors for '${doc.title}'`);
    } catch (ingestErr) {
      console.warn(`[Document Seeder] AI ingestion notice: ${ingestErr.message}`);
    }
  }

  console.log('\n[Document Seeder] All sample documents seeded successfully!');
  await mongoose.disconnect();
}

seedDocuments().catch((err) => {
  console.error('[Document Seeder Error]:', err);
  process.exit(1);
});
