import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { documentAPI, chatAPI } from '../../services/api';
import {
  BookOpen,
  MessageSquare,
  Search,
  ExternalLink,
  Sparkles,
  ArrowRight,
  Shield,
  Layers,
  CheckCircle,
} from 'lucide-react';

export const FacultyDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [quickQuery, setQuickQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFacultyData();
  }, []);

  const loadFacultyData = async () => {
    try {
      setLoading(true);
      const [docsRes, convsRes] = await Promise.all([
        documentAPI.list(),
        chatAPI.getConversations(),
      ]);

      if (docsRes.data?.success) setDocuments(docsRes.data.documents || []);
      if (convsRes.data?.success) setConversations(convsRes.data.conversations || []);
    } catch (err) {
      console.error('Faculty dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const facultyExclusiveCount = documents.filter((d) => d.accessScope === 'faculty').length;

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Faculty Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-primary-950 text-white p-8 sm:p-10 shadow-lg">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-indigo-500/20 backdrop-blur-md text-indigo-200 text-xs font-semibold mb-4 border border-indigo-400/20">
            <Shield className="w-3.5 h-3.5 text-indigo-300" />
            <span>Faculty Portal • {user?.department || 'Academic Department'}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome, {user?.name || 'Faculty Member'}
          </h1>
          <p className="mt-2 text-sm text-indigo-200/90 leading-relaxed">
            Access authorized faculty resources, institutional literature, and student-accessible course documents with rigorous RAG citation verification.
          </p>

          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              to="/chat"
              className="px-5 py-2.5 rounded-xl bg-primary-600 hover:bg-primary-500 text-white text-xs font-bold transition flex items-center space-x-1.5 shadow-md"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Launch Academic Query Workspace</span>
            </Link>
            <Link
              to="/documents"
              className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-semibold backdrop-blur-sm border border-white/10 transition flex items-center space-x-1.5"
            >
              <BookOpen className="w-4 h-4" />
              <span>Browse Catalog ({documents.length})</span>
            </Link>
          </div>
        </div>

        <div className="absolute -right-10 -bottom-10 w-80 h-80 rounded-full bg-indigo-600/20 blur-3xl" />
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Accessible Documents
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-slate-900">{documents.length}</span>
            <span className="text-xs text-slate-400">Total</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Faculty-Restricted Scope
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-indigo-600">{facultyExclusiveCount}</span>
            <span className="text-xs text-slate-400">Institutional Docs</span>
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Inquiry Threads
          </span>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-2xl font-black text-primary-600">{conversations.length}</span>
            <span className="text-xs text-slate-400">Recorded</span>
          </div>
        </div>
      </div>

      {/* Authorized Documents Grid */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Authorized Academic Materials</h2>
            <p className="text-xs text-slate-500">
              Documents available to your faculty credentials
            </p>
          </div>
          <Link
            to="/documents"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <span>View Full Catalog</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-indigo-300 hover:shadow-md transition group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    {doc.category}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      doc.accessScope === 'faculty'
                        ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                        : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    Scope: {doc.accessScope}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-600 transition line-clamp-1">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {doc.description || 'Academic literature.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">v{doc.currentVersion}</span>
                <a
                  href={`/api/documents/${doc._id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 font-semibold text-indigo-600 hover:text-indigo-800"
                >
                  <span>Open PDF</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
