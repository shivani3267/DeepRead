import React, { useState, useEffect } from 'react';
import { documentAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  UploadCloud,
  FileText,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  History,
  Archive,
  ExternalLink,
  Plus,
  X,
  RefreshCw,
} from 'lucide-react';

export const AdminDocumentsPage = () => {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Modals state
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [versionModalDoc, setVersionModalDoc] = useState(null);
  const [versionsList, setVersionsList] = useState([]);
  const [loadingVersions, setLoadingVersions] = useState(false);
  const [newVersionFile, setNewVersionFile] = useState(null);
  const [uploadingVersion, setUploadingVersion] = useState(false);

  // Upload Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [subject, setSubject] = useState('Foundational AI');
  const [accessScope, setAccessScope] = useState('public');
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');

  useEffect(() => {
    loadDocuments();
  }, [scopeFilter, statusFilter]);

  const loadDocuments = async () => {
    try {
      setLoading(true);
      const res = await documentAPI.list({
        search: search || undefined,
        scope: scopeFilter || undefined,
        status: statusFilter || undefined,
      });
      if (res.data?.success) {
        setDocuments(res.data.documents || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadDocuments();
  };

  const handleUploadSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFile || !title) {
      setUploadError('Title and PDF file are required.');
      return;
    }

    try {
      setUploading(true);
      setUploadError('');
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      formData.append('subject', subject);
      formData.append('accessScope', accessScope);
      formData.append('file', selectedFile);

      const res = await documentAPI.upload(formData);
      if (res.data?.success) {
        setUploadModalOpen(false);
        resetUploadForm();
        loadDocuments();
      }
    } catch (err) {
      setUploadError(err.message || 'Document upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const resetUploadForm = () => {
    setTitle('');
    setDescription('');
    setCategory('Computer Science');
    setSubject('Foundational AI');
    setAccessScope('public');
    setSelectedFile(null);
    setUploadError('');
  };

  const openVersionsModal = async (doc) => {
    setVersionModalDoc(doc);
    try {
      setLoadingVersions(true);
      const res = await documentAPI.getVersions(doc._id);
      if (res.data?.success) {
        setVersionsList(res.data.versions || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to load version history.');
    } finally {
      setLoadingVersions(false);
    }
  };

  const handleUploadNewVersion = async (e) => {
    e.preventDefault();
    if (!newVersionFile || !versionModalDoc) return;

    try {
      setUploadingVersion(true);
      const formData = new FormData();
      formData.append('file', newVersionFile);

      const res = await documentAPI.uploadVersion(versionModalDoc._id, formData);
      if (res.data?.success) {
        setNewVersionFile(null);
        openVersionsModal(versionModalDoc);
        loadDocuments();
      }
    } catch (err) {
      alert(err.message || 'Failed to upload new version.');
    } finally {
      setUploadingVersion(false);
    }
  };

  const handlePublish = async (docId, versionId) => {
    try {
      await documentAPI.publish(docId, versionId);
      loadDocuments();
      if (versionModalDoc) openVersionsModal(versionModalDoc);
    } catch (err) {
      alert(err.message || 'Failed to publish document.');
    }
  };

  const handleRetire = async (docId) => {
    if (!window.confirm('Retiring this document will deactivate it from student/faculty search and purge its Pinecone vectors. Continue?')) {
      return;
    }
    try {
      await documentAPI.retire(docId);
      loadDocuments();
      if (versionModalDoc) setVersionModalDoc(null);
    } catch (err) {
      alert(err.message || 'Failed to retire document.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic Document Repository
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Upload institutional PDFs, manage semantic versioning, and configure role-based access scopes
          </p>
        </div>

        <button
          onClick={() => setUploadModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <Plus className="w-4 h-4" />
          <span>Upload Academic PDF</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by title, subject, or abstract..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={scopeFilter}
            onChange={(e) => setScopeFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Scopes</option>
            <option value="public">Public</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Admin</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Draft / Processing</option>
            <option value="retired">Retired</option>
          </select>

          <button
            onClick={loadDocuments}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
            title="Refresh"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Documents Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : documents.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No academic documents match your filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Document Title & Filename</th>
                  <th className="py-3 px-4">Category / Subject</th>
                  <th className="py-3 px-4">Access Scope</th>
                  <th className="py-3 px-4">Active Version</th>
                  <th className="py-3 px-4">Publication Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {documents.map((doc) => {
                  const currentVer = doc.currentVersionId;
                  const isProcessing = currentVer?.status === 'processing';
                  const isFailed = currentVer?.status === 'failed';
                  const isRetired = doc.publicationStatus === 'retired';

                  return (
                    <tr key={doc._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900 line-clamp-1">{doc.title}</div>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          {doc.originalFilename}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="text-slate-800 font-medium">{doc.category}</div>
                        <div className="text-[10px] text-slate-400">{doc.subject}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                            doc.accessScope === 'faculty'
                              ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                              : doc.accessScope === 'admin'
                              ? 'bg-rose-50 text-rose-700 border border-rose-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {doc.accessScope}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-1.5">
                          <span className="font-semibold text-slate-800">v{doc.currentVersion}</span>
                          {currentVer && (
                            <span className="text-[10px] text-slate-400">
                              ({currentVer.pageCount || 0} pgs • {currentVer.chunkCount || 0} chunks)
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {isProcessing ? (
                          <span className="inline-flex items-center space-x-1 text-amber-600 bg-amber-50 px-2 py-0.5 rounded text-[11px] font-medium border border-amber-200">
                            <Clock className="w-3 h-3 animate-spin" />
                            <span>Indexing...</span>
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center space-x-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded text-[11px] font-medium border border-rose-200">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Ingestion Failed</span>
                          </span>
                        ) : isRetired ? (
                          <span className="inline-flex items-center space-x-1 text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px] font-medium">
                            <Archive className="w-3 h-3" />
                            <span>Retired</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                            <CheckCircle className="w-3 h-3" />
                            <span>Published</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right space-x-1">
                        <a
                          href={`/api/documents/${doc._id}/file`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 inline-flex items-center text-slate-500 hover:text-primary-600 hover:bg-slate-100 rounded-lg transition"
                          title="Stream PDF"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>

                        <button
                          onClick={() => openVersionsModal(doc)}
                          className="p-1.5 inline-flex items-center text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition"
                          title="Version History & Replacement"
                        >
                          <History className="w-4 h-4" />
                        </button>

                        {!isRetired && (
                          <button
                            onClick={() => handleRetire(doc._id)}
                            className="p-1.5 inline-flex items-center text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Retire Document (Purges Pinecone Vectors)"
                          >
                            <Archive className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Upload Document Modal */}
      {uploadModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <h3 className="text-sm font-bold text-slate-900">Upload New Academic PDF</h3>
              <button
                onClick={() => setUploadModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              {uploadError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs">
                  {uploadError}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Document Title *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Introduction to Quantum Computing"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Description / Abstract
                </label>
                <textarea
                  rows={2}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Academic scope and syllabus coverage..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                    Subject Area
                  </label>
                  <input
                    type="text"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Access Authorization Scope
                </label>
                <select
                  value={accessScope}
                  onChange={(e) => setAccessScope(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                >
                  <option value="public">Public (All students and faculty)</option>
                  <option value="student">Student (Enrolled students & faculty)</option>
                  <option value="faculty">Faculty (Restricted faculty only)</option>
                  <option value="admin">Admin (Institutional admin only)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  PDF Document File (.pdf) *
                </label>
                <input
                  type="file"
                  accept="application/pdf"
                  required
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-primary-50 file:text-primary-700 hover:file:bg-primary-100 cursor-pointer"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl disabled:opacity-50"
                >
                  {uploading ? 'Processing & Ingesting...' : 'Upload & Start Ingestion'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Version History & Safe Replacement Modal */}
      {versionModalDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="text-sm font-bold text-slate-900">{versionModalDoc.title}</h3>
                <span className="text-[11px] text-slate-500">
                  Document Versioning & Atomic Replacement History
                </span>
              </div>
              <button
                onClick={() => setVersionModalDoc(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Upload New Version Section */}
              <div className="p-4 rounded-xl bg-primary-50/50 border border-primary-200/80">
                <h4 className="text-xs font-bold text-primary-900 mb-1">
                  Upload Updated PDF Version (Safe Replacement)
                </h4>
                <p className="text-[11px] text-primary-800/80 mb-3 leading-relaxed">
                  The currently published version stays active and searchable until this new version passes full text extraction, chunking, and Pinecone vector indexing.
                </p>
                <form onSubmit={handleUploadNewVersion} className="flex items-center gap-2">
                  <input
                    type="file"
                    accept="application/pdf"
                    required
                    onChange={(e) => setNewVersionFile(e.target.files[0])}
                    className="flex-1 text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-primary-600 file:text-white hover:file:bg-primary-700 cursor-pointer"
                  />
                  <button
                    type="submit"
                    disabled={uploadingVersion || !newVersionFile}
                    className="px-4 py-2 text-xs font-bold text-white bg-primary-700 hover:bg-primary-800 rounded-xl disabled:opacity-50 transition"
                  >
                    {uploadingVersion ? 'Ingesting...' : 'Upload Version'}
                  </button>
                </form>
              </div>

              {/* Version History Table */}
              <div>
                <h4 className="text-xs font-bold text-slate-800 mb-2">Version History</h4>
                {loadingVersions ? (
                  <div className="py-6 flex justify-center">
                    <LoadingSpinner size="sm" />
                  </div>
                ) : (
                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] text-slate-500 uppercase">
                        <tr>
                          <th className="py-2.5 px-3">Ver #</th>
                          <th className="py-2.5 px-3">Status</th>
                          <th className="py-2.5 px-3">Metrics</th>
                          <th className="py-2.5 px-3">Uploaded</th>
                          <th className="py-2.5 px-3 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {versionsList.map((ver) => (
                          <tr key={ver._id} className="hover:bg-slate-50/60">
                            <td className="py-2 px-3 font-bold text-slate-900">
                              v{ver.versionNumber}
                            </td>
                            <td className="py-2 px-3">
                              <span
                                className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                                  ver.status === 'indexed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : ver.status === 'failed'
                                    ? 'bg-rose-100 text-rose-800'
                                    : ver.status === 'retired'
                                    ? 'bg-slate-100 text-slate-600'
                                    : 'bg-amber-100 text-amber-800'
                                }`}
                              >
                                {ver.status}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[11px] text-slate-500">
                              {ver.pageCount || 0} pgs • {ver.chunkCount || 0} chunks
                            </td>
                            <td className="py-2 px-3 text-[10px] text-slate-400">
                              {new Date(ver.createdAt).toLocaleDateString()}
                            </td>
                            <td className="py-2 px-3 text-right">
                              {ver.status === 'indexed' && (
                                <button
                                  onClick={() => handlePublish(versionModalDoc._id, ver._id)}
                                  className="text-xs font-semibold text-primary-600 hover:text-primary-800"
                                >
                                  Activate
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
