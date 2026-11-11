const axios = require('axios');
const config = require('../config/env');

const aiClient = axios.create({
  baseURL: config.aiService.url,
  timeout: config.aiService.timeout,
  headers: {
    'Content-Type': 'application/json',
    'X-Internal-Service-Key': config.aiService.internalKey,
  },
});

const triggerIngestion = async ({ documentId, versionId, filePath, metadata }) => {
  try {
    const response = await aiClient.post('/internal/ingestion', {
      document_id: documentId.toString(),
      version_id: versionId.toString(),
      file_path: filePath,
      metadata: metadata || {},
    });
    return response.data;
  } catch (error) {
    console.error('[AI Service Ingestion Error]:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Failed to trigger AI ingestion pipeline.'
    );
  }
};

const getIngestionJobStatus = async (jobId) => {
  try {
    const response = await aiClient.get(`/internal/ingestion/${jobId}`);
    return response.data;
  } catch (error) {
    console.error('[AI Service Job Status Error]:', error.response?.data || error.message);
    throw new Error(error.response?.data?.detail || 'Failed to fetch ingestion job status.');
  }
};

const queryRAG = async ({ query, authorizedDocumentIds, userId, conversationId, topK = 5 }) => {
  try {
    const response = await aiClient.post('/internal/query', {
      query,
      authorized_document_ids: authorizedDocumentIds.map((id) => id.toString()),
      user_id: userId.toString(),
      conversation_id: conversationId ? conversationId.toString() : null,
      top_k: topK,
    });
    return response.data;
  } catch (error) {
    console.error('[AI Service Query Error]:', error.response?.data || error.message);
    throw new Error(
      error.response?.data?.detail ||
      error.message ||
      'Failed to generate answer from AI service.'
    );
  }
};

const deleteVersionVectors = async ({ documentId, versionId }) => {
  try {
    const response = await aiClient.delete(`/internal/vectors/${documentId}/${versionId}`);
    return response.data;
  } catch (error) {
    console.warn('[AI Service Vector Deletion Warning]:', error.response?.data || error.message);
    // Non-fatal if vector deletion fails or service offline
    return { success: false, error: error.message };
  }
};

const checkAiHealth = async () => {
  try {
    const response = await aiClient.get('/health', { timeout: 3000 });
    return response.data;
  } catch (error) {
    return { status: 'unavailable', error: error.message };
  }
};

module.exports = {
  triggerIngestion,
  getIngestionJobStatus,
  queryRAG,
  deleteVersionVectors,
  checkAiHealth,
};
