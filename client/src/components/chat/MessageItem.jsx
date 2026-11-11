import React, { useState } from 'react';
import { MarkdownRenderer } from './MarkdownRenderer';
import { CitationCard } from './CitationCard';
import { FeedbackDialog } from './FeedbackDialog';
import { User, Sparkles, ThumbsUp, ThumbsDown, Check, ShieldCheck } from 'lucide-react';

export const MessageItem = ({ message, conversationId, onOpenPreview }) => {
  const isUser = message.sender === 'user';
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackRating, setFeedbackRating] = useState('helpful');
  const [hasFeedback, setHasFeedback] = useState(Boolean(message.feedback));

  const handleFeedbackClick = (rating) => {
    setFeedbackRating(rating);
    setFeedbackOpen(true);
  };

  if (isUser) {
    return (
      <div className="flex justify-end mb-5">
        <div className="flex items-start max-w-2xl space-x-2.5">
          <div className="p-3.5 rounded-2xl rounded-tr-xs bg-primary-600 text-white text-xs leading-relaxed shadow-sm">
            {message.content}
          </div>
          <div className="w-8 h-8 rounded-full bg-primary-700 text-white flex items-center justify-center shrink-0 text-xs font-bold shadow-xs">
            <User className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // Assistant message
  return (
    <div className="flex items-start space-x-3 mb-6 max-w-3xl">
      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-primary-500/20">
        <Sparkles className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <div className="p-4 rounded-2xl rounded-tl-xs bg-white border border-slate-200/90 shadow-xs space-y-3">
          {/* Header indicator */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center space-x-1.5">
              <span>DeepRead Assistant</span>
              <span className="text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 flex items-center">
                <ShieldCheck className="w-3 h-3 mr-0.5" />
                Grounded
              </span>
            </span>

            {message.confidence !== undefined && (
              <span className="text-[10px] text-slate-400">
                Confidence: {Math.round(message.confidence * 100)}%
              </span>
            )}
          </div>

          {/* Rendered answer text */}
          <MarkdownRenderer
            content={message.content}
            isAbstention={message.isAbstention}
          />

          {/* Citations section */}
          {message.citations && message.citations.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="block text-[11px] font-bold text-slate-600 uppercase tracking-wider mb-2">
                Page Citations ({message.citations.length})
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {message.citations.map((cit, idx) => (
                  <CitationCard
                    key={idx}
                    citation={cit}
                    onOpenPreview={onOpenPreview}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Action toolbar: Feedback */}
        <div className="flex items-center space-x-2 mt-1.5 ml-2 text-slate-400 text-xs">
          {hasFeedback ? (
            <span className="inline-flex items-center space-x-1 text-emerald-600 font-medium text-[11px]">
              <Check className="w-3 h-3" />
              <span>Feedback recorded</span>
            </span>
          ) : (
            <>
              <button
                onClick={() => handleFeedbackClick('helpful')}
                className="hover:text-emerald-600 p-1 rounded hover:bg-slate-100 transition"
                title="Helpful & Accurate"
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleFeedbackClick('unhelpful')}
                className="hover:text-rose-600 p-1 rounded hover:bg-slate-100 transition"
                title="Unhelpful or Inaccurate"
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      </div>

      {feedbackOpen && (
        <FeedbackDialog
          messageId={message._id}
          conversationId={conversationId}
          initialRating={feedbackRating}
          onClose={() => setFeedbackOpen(false)}
          onSuccess={() => setHasFeedback(true)}
        />
      )}
    </div>
  );
};
