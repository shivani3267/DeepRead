import React from 'react';
import { X, ExternalLink, FileText, CheckCircle2 } from 'lucide-react';
import { documentAPI } from '../../services/api';

export const DocumentPreviewModal = ({ citation, onClose }) => {
  if (!citation) return null;

  const {
    documentId,
    documentTitle = 'Academic Document',
    pageNumber = 1,
    snippet = '',
    versionId,
  } = citation;

  const fileUrl = documentAPI.getFileUrl(documentId, versionId);
  const pdfWithPage = `${fileUrl}#page=${pageNumber}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl h-[85vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-xl bg-primary-100 text-primary-700 flex items-center justify-center">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 leading-tight">{documentTitle}</h3>
              <div className="flex items-center space-x-2 text-xs text-slate-500 mt-0.5">
                <span className="font-semibold text-primary-700 bg-primary-50 px-2 py-0.5 rounded border border-primary-200">
                  Page {pageNumber}
                </span>
                <span>•</span>
                <span className="flex items-center text-emerald-600">
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  Authenticated Access
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <a
              href={pdfWithPage}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-100 transition"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Snippet Context Bar */}
        {snippet && (
          <div className="px-6 py-2.5 bg-amber-50/60 border-b border-amber-200/60 text-xs text-amber-950 flex items-start space-x-2">
            <span className="font-bold shrink-0">Cited Excerpt:</span>
            <span className="italic line-clamp-2">"{snippet}"</span>
          </div>
        )}

        {/* PDF Viewer Embed */}
        <div className="flex-1 bg-slate-100 relative">
          <iframe
            src={pdfWithPage}
            title={documentTitle}
            className="w-full h-full border-0"
          />
        </div>
      </div>
    </div>
  );
};
