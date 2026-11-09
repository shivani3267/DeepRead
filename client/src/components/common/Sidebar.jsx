import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard,
  MessageSquare,
  FileText,
  Users,
  BarChart3,
  UploadCloud,
  User,
  Sparkles,
} from 'lucide-react';

export const Sidebar = () => {
  const { user } = useAuth();
  if (!user) return null;

  const role = user.role;

  const getLinks = () => {
    if (role === 'admin') {
      return [
        { to: '/admin', label: 'Admin Dashboard', icon: LayoutDashboard },
        { to: '/admin/documents', label: 'Document Ingestion & Versions', icon: UploadCloud },
        { to: '/admin/users', label: 'User & Faculty Management', icon: Users },
        { to: '/admin/analytics', label: 'Analytics & Failure Logs', icon: BarChart3 },
        { to: '/chat', label: 'AI Query Testing', icon: MessageSquare },
        { to: '/profile', label: 'Admin Profile', icon: User },
      ];
    }

    if (role === 'faculty') {
      return [
        { to: '/faculty', label: 'Faculty Dashboard', icon: LayoutDashboard },
        { to: '/chat', label: 'Academic Inquiries (RAG)', icon: MessageSquare },
        { to: '/documents', label: 'Authorized Literature', icon: FileText },
        { to: '/profile', label: 'Faculty Profile', icon: User },
      ];
    }

    // Default Student links
    return [
      { to: '/student', label: 'Student Dashboard', icon: LayoutDashboard },
      { to: '/chat', label: 'Ask DeepRead (AI Assistant)', icon: MessageSquare },
      { to: '/documents', label: 'Course Documents', icon: FileText },
      { to: '/profile', label: 'Student Profile', icon: User },
    ];
  };

  const links = getLinks();

  return (
    <aside className="w-64 bg-white border-r border-academic-200 hidden md:flex flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16">
      <div className="p-4 space-y-1">
        <div className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider text-academic-400">
          Navigation
        </div>
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              end={link.to === '/admin' || link.to === '/faculty' || link.to === '/student'}
              className={({ isActive }) =>
                `flex items-center space-x-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-primary-50 text-primary-700 font-semibold'
                    : 'text-academic-600 hover:text-academic-900 hover:bg-academic-100'
                }`
              }
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span>{link.label}</span>
            </NavLink>
          );
        })}
      </div>

      <div className="p-4 m-3 bg-gradient-to-br from-primary-50 to-indigo-50 border border-primary-100 rounded-xl">
        <div className="flex items-center space-x-2 text-primary-700 font-semibold text-xs mb-1">
          <Sparkles className="w-3.5 h-3.5" />
          <span>Strict Citation RAG</span>
        </div>
        <p className="text-[11px] text-primary-900/80 leading-relaxed">
          Answers are strictly retrieved from authorized academic PDFs with page verification.
        </p>
      </div>
    </aside>
  );
};
