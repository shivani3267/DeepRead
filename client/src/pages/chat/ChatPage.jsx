import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { chatAPI, documentAPI } from '../../services/api';
import { MessageItem } from '../../components/chat/MessageItem';
import { DocumentPreviewModal } from '../../components/chat/DocumentPreviewModal';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  MessageSquare,
  Plus,
  Send,
  Trash2,
  FileText,
  Filter,
  Sparkles,
  BookOpen,
  HelpCircle,
} from 'lucide-react';

export const ChatPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlConvId = searchParams.get('c');

  const [conversations, setConversations] = useState([]);
  const [activeConvId, setActiveConvId] = useState(urlConvId || null);
  const [messages, setMessages] = useState([]);
  const [inputQuery, setInputQuery] = useState('');
  const [loadingConv, setLoadingConv] = useState(false);
  const [sending, setSending] = useState(false);
  const [availableDocs, setAvailableDocs] = useState([]);
  const [selectedDocIds, setSelectedDocIds] = useState([]);
  const [previewCitation, setPreviewCitation] = useState(null);

  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadConversations();
    loadDocuments();
  }, []);

  useEffect(() => {
    if (activeConvId) {
      loadMessages(activeConvId);
      setSearchParams({ c: activeConvId });
    } else {
      setMessages([]);
      setSearchParams({});
    }
  }, [activeConvId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, sending]);

  const loadConversations = async () => {
    try {
      const res = await chatAPI.getConversations();
      if (res.data?.success) {
        setConversations(res.data.conversations || []);
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadDocuments = async () => {
    try {
      const res = await documentAPI.list();
      if (res.data?.success) {
        setAvailableDocs(res.data.documents || []);
      }
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
  };

  const loadMessages = async (convId) => {
    try {
      setLoadingConv(true);
      const res = await chatAPI.getConversation(convId);
      if (res.data?.success) {
        setMessages(res.data.messages || []);
      }
    } catch (err) {
      console.error('Failed to load messages:', err);
    } finally {
      setLoadingConv(false);
    }
  };

  const handleStartNewChat = () => {
    setActiveConvId(null);
    setMessages([]);
    setInputQuery('');
    textareaRef.current?.focus();
  };

  const handleDeleteConversation = async (e, convId) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this conversation?')) return;
    try {
      await chatAPI.deleteConversation(convId);
      setConversations((prev) => prev.filter((c) => c._id !== convId));
      if (activeConvId === convId) {
        handleStartNewChat();
      }
    } catch (err) {
      alert(err.message || 'Failed to delete conversation.');
    }
  };

  const handleSend = async (e) => {
    e?.preventDefault();
    const query = inputQuery.trim();
    if (!query || sending) return;

    // Optimistic user message
    const tempUserMsg = {
      _id: `temp-${Date.now()}`,
      sender: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, tempUserMsg]);
    setInputQuery('');
    setSending(true);

    try {
      const res = await chatAPI.ask({
        query,
        conversationId: activeConvId,
        documentIds: selectedDocIds.length > 0 ? selectedDocIds : undefined,
      });

      if (res.data?.success) {
        const assistantMsg = {
          _id: res.data.messageId,
          sender: 'assistant',
          content: res.data.answer,
          citations: res.data.citations || [],
          isAbstention: res.data.isAbstention,
          confidence: res.data.confidence,
          createdAt: new Date().toISOString(),
        };

        setMessages((prev) => [...prev, assistantMsg]);

        // If this was a new conversation, record its ID
        if (!activeConvId && res.data.conversationId) {
          setActiveConvId(res.data.conversationId);
          loadConversations();
        }
      }
    } catch (err) {
      const errorAssistantMsg = {
        _id: `err-${Date.now()}`,
        sender: 'assistant',
        content: `Error: ${err.message}. Please verify the AI service status and try again.`,
        citations: [],
        isAbstention: true,
        createdAt: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorAssistantMsg]);
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const toggleDocumentFilter = (docId) => {
    setSelectedDocIds((prev) =>
      prev.includes(docId) ? prev.filter((id) => id !== docId) : [...prev, docId]
    );
  };

  return (
    <div className="flex h-[calc(100vh-8.5rem)] rounded-2xl bg-white border border-slate-200 shadow-xs overflow-hidden">
      {/* Left Chat Sidebar (Conversations History) */}
      <div className="w-72 bg-slate-50 border-r border-slate-200 flex flex-col shrink-0 hidden lg:flex">
        <div className="p-3 border-b border-slate-200">
          <button
            onClick={handleStartNewChat}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-xl border border-slate-200 shadow-2xs transition"
          >
            <Plus className="w-4 h-4 text-primary-600" />
            <span>New Academic Inquiry</span>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400">
              No previous inquiries recorded.
            </div>
          ) : (
            conversations.map((conv) => {
              const isActive = activeConvId === conv._id;
              return (
                <div
                  key={conv._id}
                  onClick={() => setActiveConvId(conv._id)}
                  className={`group flex items-center justify-between p-2.5 rounded-xl text-xs font-medium cursor-pointer transition ${
                    isActive
                      ? 'bg-primary-50 text-primary-900 border border-primary-200'
                      : 'text-slate-600 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center space-x-2 min-w-0">
                    <MessageSquare
                      className={`w-3.5 h-3.5 shrink-0 ${
                        isActive ? 'text-primary-600' : 'text-slate-400'
                      }`}
                    />
                    <span className="truncate">{conv.title}</span>
                  </div>
                  <button
                    onClick={(e) => handleDeleteConversation(e, conv._id)}
                    className="opacity-0 group-hover:opacity-100 p-1 hover:text-rose-600 rounded transition"
                    title="Delete Conversation"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Document Scope Filter Indicator */}
        <div className="p-3 border-t border-slate-200 bg-white/70">
          <div className="flex items-center justify-between text-xs text-slate-600 mb-1.5 font-semibold">
            <span className="flex items-center space-x-1">
              <Filter className="w-3 h-3 text-slate-400" />
              <span>Document Scope</span>
            </span>
            <span className="text-[11px] text-primary-600">
              {selectedDocIds.length === 0 ? 'All Documents' : `${selectedDocIds.length} Selected`}
            </span>
          </div>
          <p className="text-[10px] text-slate-400 leading-tight">
            Queries retrieve facts strictly from documents permitted for your role.
          </p>
        </div>
      </div>

      {/* Main Chat Panel */}
      <div className="flex-1 flex flex-col min-w-0 bg-slate-50/30">
        {/* Top Header Filter Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-white flex items-center justify-between gap-4">
          <div className="flex items-center space-x-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
            <h2 className="text-xs font-bold text-slate-800 truncate">
              {activeConvId
                ? conversations.find((c) => c._id === activeConvId)?.title || 'Academic Inquiry'
                : 'New Academic Inquiry'}
            </h2>
          </div>

          {/* Quick Doc filter pills */}
          {availableDocs.length > 0 && (
            <div className="hidden sm:flex items-center space-x-1.5 overflow-x-auto max-w-md py-1">
              <button
                onClick={() => setSelectedDocIds([])}
                className={`px-2 py-0.5 rounded-md text-[11px] font-semibold transition shrink-0 ${
                  selectedDocIds.length === 0
                    ? 'bg-primary-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All ({availableDocs.length})
              </button>
              {availableDocs.slice(0, 3).map((d) => {
                const isSelected = selectedDocIds.includes(d._id);
                return (
                  <button
                    key={d._id}
                    onClick={() => toggleDocumentFilter(d._id)}
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium transition truncate max-w-[130px] shrink-0 ${
                      isSelected
                        ? 'bg-primary-100 text-primary-800 border border-primary-300'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                    title={d.title}
                  >
                    {d.title}
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Message Feed */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {loadingConv ? (
            <div className="h-full flex items-center justify-center">
              <LoadingSpinner size="md" />
            </div>
          ) : messages.length === 0 ? (
            /* Empty State */
            <div className="h-full flex flex-col items-center justify-center text-center max-w-md mx-auto p-6">
              <div className="w-12 h-12 rounded-2xl bg-primary-100 text-primary-600 flex items-center justify-center mb-4 shadow-sm">
                <BookOpen className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-slate-900 mb-1">
                Ask Questions Grounded in Academic Literature
              </h3>
              <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                DeepRead retrieves verified passages from authorized PDFs and provides page-level citations. If the documents do not contain evidence, the assistant clearly abstains.
              </p>

              <div className="w-full space-y-2 text-left">
                <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider text-center">
                  Sample Inquiries
                </p>
                {[
                  'What are the primary differences between supervised and unsupervised learning?',
                  'How does quantum superposition enable exponential state representation?',
                  'What academic policies govern faculty research authorship and conflict of interest?',
                ].map((sample, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setInputQuery(sample);
                      textareaRef.current?.focus();
                    }}
                    className="w-full text-left p-2.5 rounded-xl border border-slate-200 bg-white hover:border-primary-300 hover:bg-primary-50/50 text-xs text-slate-700 transition"
                  >
                    "{sample}"
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message list */
            <div>
              {messages.map((msg) => (
                <MessageItem
                  key={msg._id}
                  message={msg}
                  conversationId={activeConvId}
                  onOpenPreview={(cit) => setPreviewCitation(cit)}
                />
              ))}

              {sending && (
                <div className="flex items-start space-x-3 mb-6 animate-pulse">
                  <div className="w-8 h-8 rounded-full bg-primary-600 text-white flex items-center justify-center shrink-0">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs text-xs text-slate-500 flex items-center space-x-2">
                    <LoadingSpinner size="sm" />
                    <span>Searching authorized document chunks & generating grounded citations...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Input Bar */}
        <div className="p-4 border-t border-slate-200 bg-white">
          <form onSubmit={handleSend} className="relative flex items-center">
            <textarea
              ref={textareaRef}
              rows={1}
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask an academic question about authorized documents..."
              className="w-full pl-4 pr-12 py-3 rounded-xl border border-slate-300 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500 resize-none max-h-32 transition"
            />
            <button
              type="submit"
              disabled={sending || !inputQuery.trim()}
              className="absolute right-2 p-2 rounded-lg bg-primary-600 text-white hover:bg-primary-700 disabled:opacity-40 transition shadow-xs"
              title="Send Inquiry (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
            <span>Press Enter to send, Shift+Enter for newline</span>
            <span>Grounding: Strict Page Citations • Zero Hallucination Mode</span>
          </div>
        </div>
      </div>

      {/* PDF Document Preview Modal */}
      {previewCitation && (
        <DocumentPreviewModal
          citation={previewCitation}
          onClose={() => setPreviewCitation(null)}
        />
      )}
    </div>
  );
};
