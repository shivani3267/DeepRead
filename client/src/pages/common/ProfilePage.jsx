import React from 'react';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../../components/common/RoleBadge';
import {
  User,
  Mail,
  Shield,
  Building,
  Calendar,
  Lock,
  CheckCircle,
  XCircle,
} from 'lucide-react';

export const ProfilePage = () => {
  const { user } = useAuth();
  if (!user) return null;

  const permissions = {
    student: [
      { label: 'Query Public & Student Documents', allowed: true },
      { label: 'Receive AI Answers with Citations', allowed: true },
      { label: 'View Own Conversation History', allowed: true },
      { label: 'Submit Answer Feedback', allowed: true },
      { label: 'Access Faculty-Restricted Documents', allowed: false },
      { label: 'Upload Official Institutional PDFs', allowed: false },
      { label: 'Manage User Accounts', allowed: false },
    ],
    faculty: [
      { label: 'Query Public & Student Documents', allowed: true },
      { label: 'Query Faculty-Restricted Literature', allowed: true },
      { label: 'Receive Grounded Citations', allowed: true },
      { label: 'View Own Conversation History', allowed: true },
      { label: 'Submit Answer Feedback', allowed: true },
      { label: 'Upload & Manage System Documents', allowed: false },
      { label: 'Create Other Faculty Accounts', allowed: false },
    ],
    admin: [
      { label: 'Full Access to All Documents & Scopes', allowed: true },
      { label: 'Upload & Version Academic PDFs', allowed: true },
      { label: 'Publish & Retire Documents', allowed: true },
      { label: 'Provision Faculty Accounts', allowed: true },
      { label: 'Manage & Deactivate Users', allowed: true },
      { label: 'View Global Analytics & Failure Logs', allowed: true },
      { label: 'Test AI Service Queries', allowed: true },
    ],
  };

  const userPerms = permissions[user.role] || permissions.student;

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-200">
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">Institutional Profile</h1>
        <p className="text-xs text-slate-500 mt-1">
          Review your credentials, academic department affiliation, and security permissions
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs space-y-5">
          <div className="text-center">
            <div className="w-16 h-16 rounded-2xl bg-primary-100 text-primary-700 flex items-center justify-center mx-auto mb-3 shadow-sm font-bold text-xl">
              {user.name.charAt(0)}
            </div>
            <h2 className="text-base font-bold text-slate-900">{user.name}</h2>
            <div className="mt-1 flex justify-center">
              <RoleBadge role={user.role} />
            </div>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-3 text-xs">
            <div className="flex items-center space-x-2 text-slate-600">
              <Mail className="w-4 h-4 text-slate-400 shrink-0" />
              <span className="truncate">{user.email}</span>
            </div>

            <div className="flex items-center space-x-2 text-slate-600">
              <Building className="w-4 h-4 text-slate-400 shrink-0" />
              <span>{user.department || 'General Academic'}</span>
            </div>

            <div className="flex items-center space-x-2 text-slate-600">
              <Lock className="w-4 h-4 text-slate-400 shrink-0" />
              <span>Status: {user.isActive ? 'Active' : 'Deactivated'}</span>
            </div>
          </div>
        </div>

        {/* Permissions & Security Matrix */}
        <div className="md:col-span-2 p-6 rounded-2xl bg-white border border-slate-200 shadow-2xs">
          <div className="flex items-center space-x-2 mb-1">
            <Shield className="w-4 h-4 text-primary-600" />
            <h3 className="text-sm font-bold text-slate-900">Institutional Access Matrix</h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            System permissions enforced by the Express backend for the <strong>{user.role}</strong> role.
          </p>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-xl overflow-hidden">
            {userPerms.map((perm, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-3 text-xs bg-white hover:bg-slate-50/60"
              >
                <span className="font-medium text-slate-700">{perm.label}</span>
                {perm.allowed ? (
                  <span className="inline-flex items-center space-x-1 text-emerald-700 font-bold text-[11px] bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    <CheckCircle className="w-3 h-3" />
                    <span>Permitted</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center space-x-1 text-slate-400 text-[11px] bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
                    <XCircle className="w-3 h-3" />
                    <span>Restricted</span>
                  </span>
                )}
              </div>
            ))}
          </div>

          <p className="mt-4 text-[11px] text-slate-400">
            Permissions are cryptographically verified using JWT session tokens and server-side RBAC guards on every endpoint.
          </p>
        </div>
      </div>
    </div>
  );
};
