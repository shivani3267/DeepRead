# DeepRead — AI-Powered Academic Document Assistant

DeepRead is an enterprise-grade academic document assistant designed for universities and higher-education institutions. It enables students and faculty to query complex academic PDFs in natural language and receive grounded, context-aware answers equipped with page-level citations.

The platform uses a custom, modular **Retrieval-Augmented Generation (RAG)** pipeline powered by **Google Gemini** and **Online Vector Embeddings**, coupled with server-enforced **Role-Based Access Control (RBAC)** to ensure document confidentiality.

---

## 1. System Architecture

```
                          +-------------------------------+
                          |     React 18 + Vite Client    |
                          | (Tailwind CSS, Lucide Icons)  |
                          +---------------+---------------+
                                          |
                              REST / HTTP-only Cookies
                                          |
                                          v
+-----------------------------------------------------------------------------------+
|                        Node.js / Express Application Server                       |
|                                                                                   |
|  - JWT Authentication (HTTP-only Cookies & Bearer Tokens)                         |
|  - Role-Based Access Control (Student, Faculty, Admin)                            |
|  - Private PDF Filesystem Management (Safe versioning & retirement)              |
|  - Rate Limiting, Audit Logging & Admin Analytics                                 |
+-------------------+---------------------------------------+-----------------------+
                    |                                       |
          Mongoose Queries                     Internal Key Authenticated REST
                    |                                       |
                    v                                       v
        +-----------------------+       +-------------------------------------------+
        |     MongoDB Atlas     |       |           FastAPI AI Microservice         |
        |  - Users & Roles      |       |                                           |
        |  - Documents & Scopes |       |  - PyMuPDF Page-by-Page Text Extractor    |
        |  - Versions & Audits  |       |  - Academic Token Chunker (500 tok/75 ov) |
        |  - Chat History & Logs|       |  - Google Gemini Embeddings (768-dim)     |
        |  - Feedback Ratings   |       |  - Pinecone Vector Database Integration   |
        +-----------------------+       |  - Dual-Stage Answerability Classifier   |
                                        |  - Google Gemini 1.5 Flash LLM Provider   |
                                        |  - Strict Page-Level Citation Verifier    |
                                        +-------------------+-----------------------+
                                                            |
                                            Pinecone REST / Serverless
                                                            |
                                                            v
                                                +-----------------------+
                                                |   Pinecone Database   |
                                                | (or Local Fallback)   |
                                                +-----------------------+
```

---

## 2. Technology Stack

### Frontend
- **Framework:** React 18, Vite
- **Styling:** Tailwind CSS, PostCSS, Autoprefixer
- **Icons:** Lucide React
- **HTTP Client:** Axios (configured with credentials for HTTP-only cookies)
- **Routing:** React Router DOM v6
- **Markdown & Math:** React-Markdown, Remark-GFM

### Backend API Server
- **Runtime:** Node.js (v18+)
- **Framework:** Express.js
- **Database:** MongoDB Atlas via Mongoose ODM
- **Authentication:** JSON Web Tokens (JWT), HTTP-only cookies, bcryptjs password hashing
- **File Upload:** Multer (private local filesystem storage, MIME validation)
- **Security:** Helmet, CORS, Express-Rate-Limit, Audit Logger

### AI Microservice & RAG Engine
- **Framework:** Python 3.11+, FastAPI, Uvicorn
- **PDF Extraction:** PyMuPDF (`fitz`) with 1-indexed page preserving logic
- **Embeddings:** Online Google Gemini `text-embedding-004` (768 dimensions) & HuggingFace Inference API, with deterministic semantic feature hashing fallback
- **Vector Database:** Pinecone (Serverless / Pod) with built-in `LocalDevelopmentVectorStore` adapter
- **LLM Generation:** Google Gemini `gemini-1.5-flash` via official Gemini API (with Ollama and Mock fallbacks)
- **Classification:** Threshold Baseline + Logistic Regression (Scikit-Learn) for strict anti-hallucination abstention
- **No Third-Party Chaining:** Custom modular pipeline — **Zero LangChain or LangGraph dependencies**.

---

## 3. User Roles and Access Control (RBAC)

The backend deterministically enforces three access tiers before any vector retrieval occurs:

| Role | Registration Mode | Document Scopes Accessible | Capabilities |
| :--- | :--- | :--- | :--- |
| **Student** | Self-Registration (`/api/auth/register`) | `public`, `student` | Query authorized literature, view conversation history, inspect page citations, submit answer feedback. |
| **Faculty** | Admin-Provisioned (`/api/admin/faculty`) | `public`, `student`, `faculty` | Query institutional policies and curriculum docs, evaluate citation provenance, submit feedback. |
| **Admin** | Controlled Seeding (`scripts/seed.js`) | All (`public`, `student`, `faculty`, `admin`) | Upload PDFs, version documents, manage publication lifecycles, provision faculty, inspect analytics & audit logs. |

> **Security Rule:** Roles are never trusted from the client request. Public registration is locked to `student`. Any attempt to supply `role: "admin"` or `role: "faculty"` results in HTTP 403 Forbidden.

---

## 4. Document Management & Safe Versioning Lifecycle

DeepRead manages PDF documents with strict lifecycle isolation:
1. **Upload & Private Stash:** Uploaded PDFs are stored in `storage/documents` and are never exposed via public static directory URLs.
2. **Draft & Background Ingestion:** An `IngestionJob` is created while PyMuPDF extracts text page by page, splits text into 500-token chunks with 75-token overlap, and upserts 768-dim vectors to Pinecone.
3. **Safe Version Replacement:** When an updated PDF version is uploaded:
   - The previous published version remains live and queryable during processing.
   - The new version is indexed and validated.
   - Once validated, the new version is published.
   - Obsolete vectors from the previous version are purged via `DELETE /internal/vectors/:docId/:versionId`.

---

## 5. Local Setup & Execution Guide

### Prerequisites
- Node.js (v18 or higher)
- Python 3.11 or higher
- MongoDB Atlas cluster URI (or local MongoDB)
- *(Optional)* Google Gemini API Key ([Get free at Google AI Studio](https://aistudio.google.com/app/apikey))
- *(Optional)* Pinecone API Key ([Pinecone Console](https://app.pinecone.io/))

### Step 1: Clone & Configure Environment Variables

Create environment configuration files for each service:

#### 1. Backend Server (`DeepRead/server/.env`)
```ini
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.xxx.mongodb.net/DeepRead?retryWrites=true&w=majority
JWT_SECRET=super_secure_deepread_production_jwt_secret_key_2026
JWT_EXPIRES_IN=7d
AI_SERVICE_URL=http://127.0.0.1:8000
INTERNAL_SERVICE_KEY=deepread_internal_secure_api_key_89234719
```

#### 2. AI Microservice (`DeepRead/ai-service/.env`)
```ini
PORT=8000
HOST=0.0.0.0
ENVIRONMENT=development
INTERNAL_SERVICE_KEY=deepread_internal_secure_api_key_89234719

# Google Gemini Configuration
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Embeddings & Vector Database
EMBEDDING_PROVIDER=gemini
EMBEDDING_DIMENSION=768
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=deepread-academic
PINECONE_CLOUD=aws
PINECONE_REGION=us-east-1

CHUNK_TARGET_TOKENS=500
CHUNK_OVERLAP_TOKENS=75
ANSWERABILITY_SIMILARITY_THRESHOLD=0.58
```

#### 3. Frontend Client (`DeepRead/client/.env`)
```ini
VITE_API_URL=http://localhost:5000/api
```

---

### Step 2: Install Dependencies & Seed Database

```powershell
# 1. Install Server Dependencies
cd DeepRead/server
npm install

# 2. Install Client Dependencies
cd ../client
npm install

# 3. Setup Python Virtual Environment & Install AI Service Packages
cd ../ai-service
python -m venv venv
.\venv\Scripts\pip install fastapi uvicorn pydantic pydantic-settings pymupdf numpy scikit-learn httpx pytest python-dotenv python-multipart pinecone

# 4. Seed Database with Default Accounts & Documents
cd ..
node server/scripts/seed.js
node scripts/seed_documents.js
```

Default credentials seeded:
- **Admin:** `admin@deepread.edu` / `AdminPassword123!`
- **Faculty:** `faculty.vance@deepread.edu` / `FacultyPassword123!`
- **Student:** `student.chen@deepread.edu` / `StudentPassword123!`

---

### Step 3: Run the Application Locally

Open three terminal windows:

#### Terminal 1 — FastAPI AI Microservice
```powershell
cd DeepRead/ai-service
.\venv\Scripts\python -m uvicorn app.main:app --host 127.0.0.1 --port 8000
```

#### Terminal 2 — Express Backend Server
```powershell
cd DeepRead/server
npm run dev
```

#### Terminal 3 — React Client
```powershell
cd DeepRead/client
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

## 6. Automated Testing & Verification Suite

DeepRead includes an exhaustive multi-layer test suite:

### 1. Server Integration & RBAC Tests (Jest)
Runs 14 automated unit and integration tests across 3 suites:
```powershell
cd DeepRead/server
npm test
```
*Results:* **`14 passed, 3 suites passed, 100% success rate`**

### 2. AI Pipeline Unit Tests (Pytest)
Tests PyMuPDF page extraction, text chunking token bounds, answerability classification, and citation verification:
```powershell
cd DeepRead/ai-service
.\venv\Scripts\python -m pytest tests/
```
*Results:* **`11 passed in 1.11s`**

### 3. End-to-End System Integration Test
Exercises complete multi-role workflows, live PDF upload, vector retrieval, and out-of-domain abstention:
```powershell
node scripts/test_e2e.js
node scripts/test_upload_and_query.js
```
*Results:* **`All 7 phases verified successfully`**

### 4. RAG Quality & Benchmark Evaluation
Evaluates retrieval accuracy and hallucination resistance over the benchmark dataset:
```powershell
cd DeepRead/evaluation
..\ai-service\venv\Scripts\python evaluate_rag.py
```

| Evaluation Metric | Benchmark Result | Target Requirement | Status |
| :--- | :--- | :--- | :--- |
| **Recall@1** | **92.31%** | > 80% | Passed |
| **Recall@3** | **92.31%** | > 85% | Passed |
| **Recall@5** | **92.31%** | > 90% | Passed |
| **Mean Reciprocal Rank (MRR)** | **0.9231** | > 0.85 | Passed |
| **Abstention Accuracy** | **100.00%** | > 95% | Passed |
| **Citation Precision** | **100.00%** | > 90% | Passed |
| **Average Query Latency** | **0.64 ms** (cached) / **1.2s** (live LLM) | < 3000 ms | Passed |

---

## 7. API Reference Catalog

### Authentication & Provisioning
- `POST /api/auth/register` — Student self-registration (enforces student role)
- `POST /api/auth/login` — User authentication, sets HTTP-only `token` cookie
- `POST /api/auth/logout` — Invalidates session cookie
- `GET /api/auth/me` — Fetches profile and role of authenticated user
- `POST /api/admin/faculty` — Admin-only faculty account provisioning

### Document Management
- `GET /api/documents` — Role-filtered academic document catalog
- `GET /api/documents/:id` — Document metadata & version status
- `GET /api/documents/:id/file` — Authorized streaming of private PDF file
- `POST /api/documents` — Admin-only PDF upload & ingestion trigger
- `POST /api/documents/:id/versions` — Admin-only upload of new version
- `PATCH /api/documents/:id/publish` — Admin-only version activation
- `PATCH /api/documents/:id/retire` — Admin-only document retirement

### Grounded Academic Chat & Feedback
- `POST /api/chat` — Executes grounded RAG inquiry with page citations
- `GET /api/conversations` — Retrieves user conversation history
- `GET /api/conversations/:id` — Loads complete message thread
- `DELETE /api/conversations/:id` — Deletes conversation thread
- `POST /api/feedback` — Submits student/faculty quality rating and tags
- `GET /api/feedback/summary` — Aggregated feedback metrics

### Admin Analytics & Governance
- `GET /api/admin/analytics` — Platform statistics, query volumes, satisfaction rate
- `GET /api/admin/audit-logs` — Immutable audit trail of document and user activities
- `GET /api/admin/jobs` — Status of active and historical PDF ingestion jobs
- `GET /api/admin/users` — List and deactivate user accounts

---

## 8. License & Governance
Developed for academic institutions. All rights reserved.