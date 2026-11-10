import React, { useState, useEffect } from 'react';
import { adminAPI } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { RoleBadge } from '../../components/common/RoleBadge';
import { LoadingSpinner } from '../../components/common/LoadingSpinner';
import {
  Users,
  UserPlus,
  Search,
  Shield,
  GraduationCap,
  Building,
  CheckCircle,
  Ban,
  X,
  AlertCircle,
} from 'lucide-react';

export const AdminUsersPage = () => {
  const { user: currentAdmin } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Provision Faculty Modal
  const [facultyModalOpen, setFacultyModalOpen] = useState(false);
  const [facultyName, setFacultyName] = useState('');
  const [facultyEmail, setFacultyEmail] = useState('');
  const [facultyPassword, setFacultyPassword] = useState('');
  const [facultyDept, setFacultyDept] = useState('Computer Science & AI');
  const [provisioning, setProvisioning] = useState(false);
  const [modalError, setModalError] = useState('');

  useEffect(() => {
    loadUsers();
  }, [roleFilter, statusFilter]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const res = await adminAPI.getUsers({
        search: search || undefined,
        role: roleFilter || undefined,
        status: statusFilter || undefined,
      });
      if (res.data?.success) {
        setUsers(res.data.users || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    loadUsers();
  };

  const handleToggleStatus = async (user) => {
    if (user._id === currentAdmin.id) {
      alert('Administrators cannot deactivate their own active session.');
      return;
    }

    const nextState = !user.isActive;
    const action = nextState ? 'activate' : 'deactivate';
    if (!window.confirm(`Are you sure you want to ${action} ${user.name}'s account?`)) return;

    try {
      await adminAPI.updateUserStatus(user._id, nextState);
      setUsers((prev) =>
        prev.map((u) => (u._id === user._id ? { ...u, isActive: nextState } : u))
      );
    } catch (err) {
      alert(err.message || 'Failed to update user status.');
    }
  };

  const handleProvisionFaculty = async (e) => {
    e.preventDefault();
    if (!facultyName || !facultyEmail || !facultyPassword) {
      setModalError('Name, email, and initial password are required.');
      return;
    }

    try {
      setProvisioning(true);
      setModalError('');
      const res = await adminAPI.createFaculty({
        name: facultyName,
        email: facultyEmail,
        password: facultyPassword,
        department: facultyDept,
      });

      if (res.data?.success) {
        setFacultyModalOpen(false);
        setFacultyName('');
        setFacultyEmail('');
        setFacultyPassword('');
        loadUsers();
      }
    } catch (err) {
      setModalError(err.message || 'Failed to provision faculty account.');
    } finally {
      setProvisioning(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Institutional User Directory
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Provision verified faculty accounts, review registered students, and manage account authorization
          </p>
        </div>

        <button
          onClick={() => setFacultyModalOpen(true)}
          className="inline-flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs transition"
        >
          <UserPlus className="w-4 h-4" />
          <span>Provision Faculty Account</span>
        </button>
      </div>

      {/* Filters Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search by legal name, institutional email, or department..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-slate-200 text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </form>

        <div className="flex items-center space-x-2 w-full md:w-auto">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Institutional Roles</option>
            <option value="student">Student</option>
            <option value="faculty">Faculty</option>
            <option value="admin">Administrator</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-slate-200 text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">All Statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Deactivated</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="py-20 flex justify-center">
            <LoadingSpinner size="md" />
          </div>
        ) : users.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <Users className="w-8 h-8 mx-auto mb-2 opacity-50" />
            No users match the search criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                  <th className="py-3 px-4">Name & Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Registered</th>
                  <th className="py-3 px-4 text-right">Access Control</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {users.map((u) => {
                  const isCurrent = u._id === currentAdmin.id;
                  return (
                    <tr key={u._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-4">
                        <div className="font-bold text-slate-900">{u.name}</div>
                        <div className="text-[11px] text-slate-400 font-mono mt-0.5">{u.email}</div>
                      </td>

                      <td className="py-3 px-4">
                        <RoleBadge role={u.role} />
                      </td>

                      <td className="py-3 px-4">
                        <span className="text-slate-700 font-medium">{u.department || 'General'}</span>
                      </td>

                      <td className="py-3 px-4">
                        {u.isActive ? (
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-semibold text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />
                            <span>Active</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center space-x-1 text-rose-700 font-semibold text-[11px]">
                            <Ban className="w-3.5 h-3.5 text-rose-500" />
                            <span>Deactivated</span>
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-slate-400 text-[11px]">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {isCurrent ? (
                          <span className="text-[11px] text-slate-400 italic">Current Session</span>
                        ) : (
                          <button
                            onClick={() => handleToggleStatus(u)}
                            className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                              u.isActive
                                ? 'text-rose-600 hover:bg-rose-50 border border-rose-200'
                                : 'text-emerald-700 hover:bg-emerald-50 border border-emerald-300'
                            }`}
                          >
                            {u.isActive ? 'Deactivate' : 'Reactivate'}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Provision Faculty Modal */}
      {facultyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 w-full max-w-md overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center space-x-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                <h3 className="text-sm font-bold text-slate-900">Provision Faculty Account</h3>
              </div>
              <button
                onClick={() => setFacultyModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleProvisionFaculty} className="p-6 space-y-4">
              {modalError && (
                <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalError}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Faculty Full Name *
                </label>
                <input
                  type="text"
                  required
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                  placeholder="e.g. Prof. Alan Turing"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Faculty Institutional Email *
                </label>
                <input
                  type="email"
                  required
                  value={facultyEmail}
                  onChange={(e) => setFacultyEmail(e.target.value)}
                  placeholder="faculty@deepread.edu"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Initial Temporary Password *
                </label>
                <input
                  type="password"
                  required
                  value={facultyPassword}
                  onChange={(e) => setFacultyPassword(e.target.value)}
                  placeholder="Minimum 6 characters"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">
                  Academic Department
                </label>
                <input
                  type="text"
                  value={facultyDept}
                  onChange={(e) => setFacultyDept(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setFacultyModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={provisioning}
                  className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl disabled:opacity-50"
                >
                  {provisioning ? 'Provisioning...' : 'Create Faculty Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
