import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { adminAPI, documentAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Shield,
  UploadCloud,
  Users,
  BarChart3,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export const AdminDashboard = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAnalytics();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getAnalytics();
      if (res.data?.success) {
        setAnalytics(res.data.analytics);
      }
    } catch (err) {
      setError(err.message || 'Failed to load system analytics.');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="h-96 flex items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const {
    users = { total: 0, byRole: { student: 0, faculty: 0, admin: 1 } },
    documents = { total: 0, published: 0 },
    ingestion = { total: 0, completed: 0, failed: 0, recentFailures: [] },
    queries = { totalConversations: 0, totalMessages: 0, assistantResponses: 0, abstentions: 0, abstentionRate: 0 },
    feedback = { total: 0, helpful: 0, unhelpful: 0, satisfactionRate: 100 },
  } = analytics || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">Admin Operations Console</h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200 uppercase">
              Admin Mode
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            System health, document ingestion pipelines, user provisioning, and RAG retrieval metrics
          </p>
        </div>

        <div className="flex items-center space-x-2.5">
          <Link
            to="/admin/documents"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-xs font-semibold shadow-xs transition"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Document</span>
          </Link>
          <Link
            to="/admin/users"
            className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition"
          >
            <Users className="w-4 h-4" />
            <span>Provision Faculty</span>
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Primary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Documents */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Academic Documents</span>
            <FileText className="w-4 h-4 text-primary-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{documents.total}</span>
            <span className="text-xs text-emerald-600 font-semibold">{documents.published} Published</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Vectorized & indexed with Pinecone
          </div>
        </div>

        {/* Total Users */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Institutional Users</span>
            <Users className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{users.total}</span>
            <span className="text-xs text-slate-500 font-medium">
              {users.byRole.student} Students • {users.byRole.faculty} Faculty
            </span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Role-enforced authentication
          </div>
        </div>

        {/* Ingestion Success */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ingestion Pipeline</span>
            <Activity className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{ingestion.completed}</span>
            <span className="text-xs text-slate-500 font-medium">of {ingestion.total} Jobs</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            {ingestion.failed > 0 ? (
              <span className="text-rose-600 font-semibold">{ingestion.failed} Failed Jobs</span>
            ) : (
              <span className="text-emerald-600 font-semibold">100% Pipeline Reliability</span>
            )}
          </div>
        </div>

        {/* User Satisfaction */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Citation Grounding</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{feedback.satisfactionRate}%</span>
            <span className="text-xs text-emerald-600 font-semibold">{feedback.helpful} Helpful</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-400">
            Abstention Rate: {queries.abstentionRate}%
          </div>
        </div>
      </div>

      {/* Middle Section: Ingestion Monitor & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Ingestion Failures / Status */}
        <div className="lg:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Ingestion Job Status & Diagnostics</h2>
              <p className="text-xs text-slate-500">Real-time status of PDF parsing, chunking, and embedding</p>
            </div>
            <Link
              to="/admin/documents"
              className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
            >
              <span>Manage Docs</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>

          {ingestion.recentFailures && ingestion.recentFailures.length > 0 ? (
            <div className="space-y-2">
              {ingestion.recentFailures.map((job) => (
                <div
                  key={job._id}
                  className="p-3 rounded-xl bg-rose-50/70 border border-rose-200 flex items-start justify-between text-xs"
                >
                  <div>
                    <span className="font-bold text-rose-900">
                      {job.documentId?.title || 'Unknown Document'}
                    </span>
                    <p className="text-rose-700 text-[11px] mt-0.5">{job.errorMessage || 'Unknown error'}</p>
                  </div>
                  <span className="text-[10px] text-rose-500 font-medium">Failed</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <CheckCircle2 className="w-7 h-7 text-emerald-500 mx-auto mb-1.5" />
              <p className="text-xs font-semibold text-slate-700">All PDF Ingestion Pipelines Healthy</p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                PyMuPDF page extractions and Pinecone indexing jobs completed with zero unresolved failures.
              </p>
            </div>
          )}
        </div>

        {/* Administration Shortcuts */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 mb-1">Administrative Actions</h2>
            <p className="text-xs text-slate-500 mb-4">Core institutional controls</p>

            <div className="space-y-2.5">
              <Link
                to="/admin/documents"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-primary-300 hover:bg-primary-50/40 transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-primary-100 text-primary-700 flex items-center justify-center">
                    <UploadCloud className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-primary-700">
                      PDF Document Ingestion
                    </h4>
                    <span className="text-[10px] text-slate-400">Upload, version & retire</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/users"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-indigo-300 hover:bg-indigo-50/40 transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center">
                    <Users className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-indigo-700">
                      Faculty & User Accounts
                    </h4>
                    <span className="text-[10px] text-slate-400">Provision & deactivate</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>

              <Link
                to="/admin/analytics"
                className="flex items-center justify-between p-3 rounded-xl border border-slate-200 hover:border-amber-300 hover:bg-amber-50/40 transition group"
              >
                <div className="flex items-center space-x-2.5">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <BarChart3 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-800 group-hover:text-amber-700">
                      Query & Abstention Logs
                    </h4>
                    <span className="text-[10px] text-slate-400">Feedback analytics</span>
                  </div>
                </div>
                <ArrowRight className="w-3.5 h-3.5 text-slate-400 group-hover:translate-x-0.5 transition" />
              </Link>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
            Node.js / Express • FastAPI • Pinecone • MongoDB Atlas
          </div>
        </div>
      </div>
    </div>
  );
};
