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
  Clock,
  Layers,
  CheckCircle,
} from 'lucide-react';

export const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [documents, setDocuments] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [quickQuery, setQuickQuery] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [docsRes, convsRes] = await Promise.all([
        documentAPI.list(),
        chatAPI.getConversations(),
      ]);

      if (docsRes.data?.success) setDocuments(docsRes.data.documents || []);
      if (convsRes.data?.success) setConversations(convsRes.data.conversations || []);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAsk = (e) => {
    e.preventDefault();
    if (!quickQuery.trim()) return;
    navigate('/chat');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Welcome Hero Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-primary-900 via-primary-800 to-indigo-900 text-white p-8 sm:p-10 shadow-lg shadow-primary-950/10">
        <div className="relative z-10 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-primary-200 text-xs font-semibold mb-4 border border-white/10">
            <Sparkles className="w-3.5 h-3.5 text-primary-300" />
            <span>Academic Intelligence Platform</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            Welcome back, {user?.name || 'Scholar'}
          </h1>
          <p className="mt-2 text-sm text-primary-200 leading-relaxed">
            Query published course literature, research papers, and lecture materials. Every answer is grounded in authorized PDFs with page citations.
          </p>

          {/* Quick Search / Query Bar */}
          <form onSubmit={handleQuickAsk} className="mt-6 flex items-center max-w-lg">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="text"
                value={quickQuery}
                onChange={(e) => setQuickQuery(e.target.value)}
                placeholder="Ask any question about your course documents..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white text-slate-900 text-xs sm:text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400 shadow-md"
              />
            </div>
            <button
              type="submit"
              className="ml-2.5 px-5 py-3 rounded-2xl bg-primary-500 hover:bg-primary-400 text-white text-xs sm:text-sm font-bold shadow-md hover:shadow-lg transition flex items-center space-x-1.5"
            >
              <span>Ask</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>

        {/* Decorative background circle */}
        <div className="absolute -right-10 -bottom-10 w-80 h-80 rounded-full bg-primary-600/20 blur-3xl" />
      </div>

      {/* Available Documents Section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Available Course Documents</h2>
            <p className="text-xs text-slate-500">
              Published academic documents authorized for student study
            </p>
          </div>
          <Link
            to="/documents"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <span>View All ({documents.length})</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {documents.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center">
            <BookOpen className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500">No published documents currently available.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.slice(0, 6).map((doc) => (
              <div
                key={doc._id}
                className="flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-md transition group"
              >
                <div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                    <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                      {doc.category || 'General'}
                    </span>
                    <span className="flex items-center text-emerald-600 font-medium">
                      <CheckCircle className="w-3 h-3 mr-1" />
                      Indexed
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary-700 transition line-clamp-1">
                    {doc.title}
                  </h3>

                  <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                    {doc.description || 'Academic course literature and reference material.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-400 text-[11px]">
                    v{doc.currentVersion} • {doc.subject || 'Literature'}
                  </span>
                  <a
                    href={`/api/documents/${doc._id}/file`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center space-x-1 font-semibold text-primary-600 hover:text-primary-700"
                  >
                    <span>Read PDF</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Inquiries */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">Recent Inquiries</h2>
            <p className="text-xs text-slate-500">Your prior question threads and grounded answers</p>
          </div>
          <Link
            to="/chat"
            className="text-xs font-semibold text-primary-600 hover:text-primary-700 flex items-center space-x-1"
          >
            <span>Open Chat Workspace</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {conversations.length === 0 ? (
          <div className="p-8 rounded-2xl bg-white border border-slate-200 text-center">
            <MessageSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 mb-3">No questions submitted yet.</p>
            <Link
              to="/chat"
              className="inline-flex items-center space-x-1.5 px-4 py-2 rounded-xl bg-primary-600 text-white text-xs font-semibold hover:bg-primary-700 transition"
            >
              <span>Ask Your First Question</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {conversations.slice(0, 4).map((c) => (
              <Link
                key={c._id}
                to={`/chat?c=${c._id}`}
                className="flex items-center justify-between p-4 rounded-xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-xs transition"
              >
                <div className="flex items-center space-x-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h4 className="text-xs font-bold text-slate-900 truncate">{c.title}</h4>
                    <span className="text-[10px] text-slate-400 flex items-center mt-0.5">
                      <Clock className="w-3 h-3 mr-1" />
                      {new Date(c.lastMessageAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
