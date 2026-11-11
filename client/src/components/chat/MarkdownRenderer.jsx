import React from 'react';
import { AlertTriangle, Quote } from 'lucide-react';

export const MarkdownRenderer = ({ content, isAbstention = false }) => {
  if (!content) return null;

  if (isAbstention) {
    return (
      <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
        <div className="flex items-center space-x-2 text-amber-800 font-bold text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>Insufficient Academic Evidence</span>
        </div>
        <p className="text-xs leading-relaxed">{content}</p>
        <p className="text-[11px] text-amber-700/80 pt-1 border-t border-amber-200/60">
          Tip: Try rephrasing your question or verify that the relevant academic documents are published and accessible to your role.
        </p>
      </div>
    );
  }

  // Parse markdown lines
  const lines = content.split('\n');
  const elements = [];
  let inCodeBlock = false;
  let codeBuffer = [];

  lines.forEach((line, index) => {
    // Code block toggle
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        elements.push(
          <pre
            key={`code-${index}`}
            className="my-3 p-3.5 rounded-xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto border border-slate-800"
          >
            <code>{codeBuffer.join('\n')}</code>
          </pre>
        );
        codeBuffer = [];
        inCodeBlock = false;
      } else {
        inCodeBlock = true;
      }
      return;
    }

    if (inCodeBlock) {
      codeBuffer.push(line);
      return;
    }

    // Headers
    if (line.startsWith('### ')) {
      elements.push(
        <h4 key={index} className="text-sm font-bold text-slate-900 mt-3 mb-1">
          {line.replace('### ', '')}
        </h4>
      );
      return;
    }
    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={index} className="text-base font-bold text-slate-900 mt-4 mb-1.5 border-b pb-1">
          {line.replace('## ', '')}
        </h3>
      );
      return;
    }
    if (line.startsWith('# ')) {
      elements.push(
        <h2 key={index} className="text-lg font-extrabold text-slate-900 mt-4 mb-2">
          {line.replace('# ', '')}
        </h2>
      );
      return;
    }

    // List items
    if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
      const itemText = line.trim().replace(/^[-*]\s+/, '');
      elements.push(
        <li key={index} className="ml-4 list-disc text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(itemText)}
        </li>
      );
      return;
    }

    if (/^\d+\.\s+/.test(line.trim())) {
      const itemText = line.trim().replace(/^\d+\.\s+/, '');
      elements.push(
        <li key={index} className="ml-4 list-decimal text-xs text-slate-700 leading-relaxed my-0.5">
          {formatInline(itemText)}
        </li>
      );
      return;
    }

    // Empty line spacer
    if (!line.trim()) {
      elements.push(<div key={index} className="h-2" />);
      return;
    }

    // Standard paragraph
    elements.push(
      <p key={index} className="text-xs text-slate-800 leading-relaxed my-1">
        {formatInline(line)}
      </p>
    );
  });

  return <div className="space-y-1 text-slate-800">{elements}</div>;
};

// Helper for bold, code, and citation highlights
function formatInline(text) {
  // Replace citation tags like [Doc: 123, Page: 4] with styled inline pill
  const citationRegex = /\[(?:Doc|Document):\s*([a-zA-Z0-9_\-]+),\s*(?:Page|p\.?):\s*(\d+)\]/gi;
  const parts = [];
  let lastIdx = 0;
  let match;

  while ((match = citationRegex.exec(text)) !== null) {
    if (match.index > lastIdx) {
      parts.push(parseFormatting(text.substring(lastIdx, match.index)));
    }
    const page = match[2];
    parts.push(
      <span
        key={`cit-${match.index}`}
        className="inline-flex items-center px-1.5 py-0.5 mx-1 rounded text-[10px] font-bold bg-primary-100 text-primary-800 border border-primary-200 select-all"
        title={`Cited from Page ${page}`}
      >
        p. {page}
      </span>
    );
    lastIdx = match.index + match[0].length;
  }

  if (lastIdx < text.length) {
    parts.push(parseFormatting(text.substring(lastIdx)));
  }

  return parts;
}

function parseFormatting(str) {
  // Bold **text**
  const boldParts = str.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return (
        <strong key={i} className="font-semibold text-slate-900">
          {part.slice(2, -2)}
        </strong>
      );
    }
    // Inline code `code`
    const codeParts = part.split(/(`[^`]+`)/g);
    return codeParts.map((sub, j) => {
      if (sub.startsWith('`') && sub.endsWith('`')) {
        return (
          <code
            key={j}
            className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono text-[11px] border border-slate-200"
          >
            {sub.slice(1, -1)}
          </code>
        );
      }
      return sub;
    });
  });
}
