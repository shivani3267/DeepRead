import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from './RoleBadge';
import { BookOpen, LogOut, User as UserIcon, Shield, Sparkles } from 'lucide-react';

export const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getDashboardLink = () => {
    if (!user) return '/login';
    if (user.role === 'admin') return '/admin';
    if (user.role === 'faculty') return '/faculty';
    return '/student';
  };

  return (
    <header className="sticky top-0 z-30 bg-white/90 backdrop-blur-md border-b border-academic-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo & Brand */}
          <div className="flex items-center space-x-3">
            <Link to={getDashboardLink()} className="flex items-center space-x-2.5 group">
              <div className="w-10 h-10 rounded-xl bg-primary-600 flex items-center justify-center text-white shadow-md shadow-primary-500/20 group-hover:scale-105 transition-transform duration-200">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-academic-900 to-primary-700 bg-clip-text text-transparent">
                  DeepRead
                </span>
                <span className="hidden sm:inline-block ml-2 px-1.5 py-0.5 text-[10px] font-semibold tracking-wider uppercase bg-primary-50 text-primary-700 rounded border border-primary-200">
                  Academic AI
                </span>
              </div>
            </Link>
          </div>

          {/* User Nav and Actions */}
          {user ? (
            <div className="flex items-center space-x-4">
              <div className="hidden sm:flex flex-col items-end">
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-semibold text-academic-800">{user.name}</span>
                  <RoleBadge role={user.role} />
                </div>
                <span className="text-xs text-academic-500">{user.department || user.email}</span>
              </div>

              <div className="flex items-center space-x-2">
                <Link
                  to="/profile"
                  className="p-2 text-academic-500 hover:text-academic-800 hover:bg-academic-100 rounded-lg transition-colors"
                  title="Profile Settings"
                >
                  <UserIcon className="w-5 h-5" />
                </Link>

                <button
                  onClick={handleLogout}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium text-academic-700 hover:text-rose-600 hover:bg-rose-50 rounded-lg border border-academic-200 hover:border-rose-200 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Sign Out</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-sm font-medium text-academic-700 hover:text-academic-900 px-3 py-1.5 rounded-lg hover:bg-academic-100"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 px-3.5 py-1.5 rounded-lg shadow-xs hover:shadow transition"
              >
                Student Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
