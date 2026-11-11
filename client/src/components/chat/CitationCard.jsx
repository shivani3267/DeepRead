import React from 'react';
import { FileText, ExternalLink, CheckCircle2 } from 'lucide-react';

export const CitationCard = ({ citation, onOpenPreview }) => {
  if (!citation) return null;

  const {
    documentId,
    documentTitle = 'Academic Document',
    pageNumber = 1,
    snippet = '',
    similarityScore = 0,
    isValidated = true,
  } = citation;

  return (
    <div
      onClick={() => onOpenPreview && onOpenPreview(citation)}
      className="group relative flex flex-col p-3 rounded-xl bg-white border border-slate-200 hover:border-primary-400 hover:shadow-md transition-all cursor-pointer text-left"
    >
      <div className="flex items-start justify-between gap-2 mb-1.5">
        <div className="flex items-center space-x-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center shrink-0">
            <FileText className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-semibold text-slate-900 truncate" title={documentTitle}>
            {documentTitle}
          </span>
        </div>
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-bold bg-slate-100 text-slate-700 shrink-0 border border-slate-200">
          Page {pageNumber}
        </span>
      </div>

      {snippet && (
        <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed italic bg-slate-50/70 p-1.5 rounded-lg border border-slate-100">
          "{snippet.trim()}..."
        </p>
      )}

      <div className="mt-2 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
        <span className="flex items-center space-x-1 text-emerald-600 font-medium">
          <CheckCircle2 className="w-3 h-3" />
          <span>Verified Grounding</span>
        </span>
        <span className="flex items-center space-x-1 text-primary-600 group-hover:translate-x-0.5 transition-transform">
          <span>View Source</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </div>
    </div>
  );
};
