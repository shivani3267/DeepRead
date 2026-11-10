import React, { useState, useEffect } from 'react';
import { documentAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  BookOpen,
  Search,
  ExternalLink,
  FileText,
  CheckCircle,
  Filter,
  Layers,
} from 'lucide-react';

export const DocumentCatalogPage = () => {
  const { user } = useAuth();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');

  useEffect(() => {
    loadCatalog();
  }, [selectedCategory]);

  const loadCatalog = async () => {
    try {
      setLoading(true);
      const res = await documentAPI.list({
        search: search || undefined,
        category: selectedCategory || undefined,
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
    loadCatalog();
  };

  const categories = Array.from(new Set(documents.map((d) => d.category))).filter(Boolean);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Authorized Academic Literature
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Explore course materials, textbooks, and institutional documents permitted for your account ({user?.role})
        </p>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search academic documents..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full sm:w-auto">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Documents Grid */}
      {loading ? (
        <div className="py-20 flex justify-center">
          <LoadingSpinner size="md" />
        </div>
      ) : documents.length === 0 ? (
        <div className="py-16 text-center text-slate-400 text-xs bg-white rounded-2xl border border-slate-200">
          <BookOpen className="w-8 h-8 mx-auto mb-2 opacity-50" />
          No academic documents available in this category.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {documents.map((doc) => (
            <div
              key={doc._id}
              className="flex flex-col justify-between p-5 rounded-2xl bg-white border border-slate-200 hover:border-primary-300 hover:shadow-md transition group"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 mb-2">
                  <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                    {doc.category || 'General'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium uppercase">
                    Scope: {doc.accessScope}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-slate-900 group-hover:text-primary-600 transition line-clamp-1">
                  {doc.title}
                </h3>
                <p className="text-xs text-slate-500 mt-1.5 line-clamp-2 leading-relaxed">
                  {doc.description || 'Academic literature and lecture notes.'}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                <span className="text-slate-400 text-[11px]">
                  v{doc.currentVersion} • {doc.subject}
                </span>
                <a
                  href={`/api/documents/${doc._id}/file`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center space-x-1 font-semibold text-primary-600 hover:text-primary-700"
                >
                  <span>Open PDF</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
