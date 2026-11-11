import React, { useState } from 'react';
import { X, ThumbsUp, ThumbsDown, Check } from 'lucide-react';
import { feedbackAPI } from '../../services/api';

const commonTags = [
  'Accurate citation',
  'Clear explanation',
  'Directly answered',
  'Wrong page cited',
  'Incomplete context',
  'Hallucinated claim',
  'Unhelpful abstention',
];

export const FeedbackDialog = ({ messageId, conversationId, initialRating, onClose, onSuccess }) => {
  const [rating, setRating] = useState(initialRating || 'helpful');
  const [selectedTags, setSelectedTags] = useState([]);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      setError('');
      await feedbackAPI.submit({
        messageId,
        conversationId,
        rating,
        comment,
        tags: selectedTags,
      });
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to submit feedback.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">Provide Feedback</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && <p className="text-xs text-rose-600 bg-rose-50 p-2 rounded-lg">{error}</p>}

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Was this answer helpful and well-grounded?
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRating('helpful')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition ${
                  rating === 'helpful'
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-800 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ThumbsUp className="w-4 h-4" />
                <span>Helpful</span>
              </button>

              <button
                type="button"
                onClick={() => setRating('unhelpful')}
                className={`flex items-center justify-center space-x-2 py-2.5 px-3 rounded-xl border text-sm font-semibold transition ${
                  rating === 'unhelpful'
                    ? 'border-rose-500 bg-rose-50 text-rose-800 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-600'
                }`}
              >
                <ThumbsDown className="w-4 h-4" />
                <span>Unhelpful</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-2">
              Select feedback tags
            </label>
            <div className="flex flex-wrap gap-1.5">
              {commonTags.map((tag) => {
                const active = selectedTags.includes(tag);
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => toggleTag(tag)}
                    className={`inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-medium transition ${
                      active
                        ? 'bg-primary-100 text-primary-800 border border-primary-300'
                        : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border border-transparent'
                    }`}
                  >
                    {active && <Check className="w-3 h-3 text-primary-700" />}
                    <span>{tag}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1.5">
              Additional Notes (Optional)
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="e.g. The answer correctly cited page 5 for the equation..."
              className="w-full p-2.5 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-700 rounded-xl disabled:opacity-50"
            >
              {submitting ? 'Submitting...' : 'Submit Feedback'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
