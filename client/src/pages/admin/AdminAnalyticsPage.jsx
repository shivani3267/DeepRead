import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  BarChart3,
  ThumbsUp,
  ThumbsDown,
  AlertTriangle,
  HelpCircle,
  Activity,
  CheckCircle,
  Tag,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';

export const AdminAnalyticsPage = () => {
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);

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
      console.error(err);
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
    feedback = { total: 0, helpful: 0, unhelpful: 0, satisfactionRate: 100, topTags: [] },
    queries = { totalConversations: 0, totalMessages: 0, assistantResponses: 0, abstentions: 0, abstentionRate: 0 },
    ingestion = { total: 0, completed: 0, failed: 0, recentFailures: [] },
    recentAbstentions = [],
  } = analytics || {};

  return (
    <div className="space-y-8 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Academic RAG Analytics & Quality Control
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Student feedback, abstention frequency, unanswerable queries, and ingestion reliability logs
          </p>
        </div>

        <button
          onClick={loadAnalytics}
          className="inline-flex items-center space-x-1.5 px-3 py-2 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold shadow-2xs transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Refresh Analytics</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* User Satisfaction Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Overall User Satisfaction</span>
            <ThumbsUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{feedback.satisfactionRate}%</span>
            <span className="text-xs text-emerald-600 font-semibold">
              ({feedback.helpful} helpful / {feedback.total} total)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Based on student & faculty response ratings
          </p>
        </div>

        {/* Abstention Rate */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Abstention Frequency</span>
            <HelpCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">{queries.abstentionRate}%</span>
            <span className="text-xs text-slate-500 font-medium">
              ({queries.abstentions} abstentions)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            Safe abstention when document context lacks evidence
          </p>
        </div>

        {/* Pipeline Failures */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-semibold">
            <span>Ingestion Health</span>
            <Activity className="w-4 h-4 text-primary-500" />
          </div>
          <div className="mt-2 flex items-baseline space-x-2">
            <span className="text-3xl font-black text-slate-900">
              {ingestion.total > 0
                ? Math.round((ingestion.completed / ingestion.total) * 100)
                : 100}
              %
            </span>
            <span className="text-xs text-slate-500 font-medium">
              ({ingestion.failed} failed)
            </span>
          </div>
          <p className="mt-2 text-[11px] text-slate-400">
            PyMuPDF parsing & Pinecone vectorization
          </p>
        </div>
      </div>

      {/* Middle Grid: Feedback Tags & Abstentions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Feedback Tags Breakdown */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">Feedback Tags Distribution</h2>
          <p className="text-xs text-slate-500 mb-4">Common qualities reported by students and faculty</p>

          {feedback.topTags && feedback.topTags.length > 0 ? (
            <div className="space-y-2.5">
              {feedback.topTags.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between text-xs">
                  <span className="flex items-center space-x-2 font-medium text-slate-700">
                    <Tag className="w-3.5 h-3.5 text-slate-400" />
                    <span>{item._id}</span>
                  </span>
                  <span className="font-bold text-slate-900 bg-slate-100 px-2.5 py-0.5 rounded-full text-[11px]">
                    {item.count}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              No tagged feedback recorded yet.
            </div>
          )}
        </div>

        {/* Unanswered Queries / Knowledge Gaps */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <h2 className="text-sm font-bold text-slate-900 mb-1">
            Knowledge Gaps & Unanswered Inquiries
          </h2>
          <p className="text-xs text-slate-500 mb-4">
            Recent queries where the AI safely abstained due to missing document context
          </p>

          {recentAbstentions && recentAbstentions.length > 0 ? (
            <div className="space-y-2">
              {recentAbstentions.map((item, idx) => (
                <div
                  key={idx}
                  className="p-3 rounded-xl bg-amber-50/60 border border-amber-200/80 text-xs"
                >
                  <p className="font-bold text-amber-950 mb-0.5">
                    "{item.content.length > 100 ? `${item.content.slice(0, 100)}...` : item.content}"
                  </p>
                  <span className="text-[10px] text-amber-800">
                    Confidence: {Math.round(item.confidence * 100)}% • Safely Abstained
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl">
              No recent abstentions logged.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
