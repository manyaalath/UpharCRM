'use client';

import { useState, useEffect, useCallback } from 'react';
import { ALL_DISTRICTS } from '@/lib/constants';
import type { AppUser, UserRole } from '@/lib/types';
import { USER_ROLE_OPTIONS, USER_ROLE_COLORS } from '@/lib/types';

export default function UsersPage() {
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AppUser | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      if (!res.ok) {
        if (res.status === 403) {
          setError('Admin access required to view users.');
          return;
        }
        throw new Error('Failed to fetch users');
      }
      const data = await res.json();
      setUsers(data.data || []);
    } catch {
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">User Management</h1>
          <p className="text-sm text-slate-500 mt-1">Manage roles, districts, and user access</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-[#1E40AF] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition-all shadow-md shadow-blue-200"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Create User
        </button>
      </div>

      {/* Messages */}
      {error && (
        <div className="mb-4 px-4 py-3 bg-red-50 text-red-700 border border-red-200 rounded-xl text-sm">
          {error}
          <button onClick={() => setError('')} className="ml-2 font-bold">×</button>
        </div>
      )}
      {success && (
        <div className="mb-4 px-4 py-3 bg-green-50 text-green-700 border border-green-200 rounded-xl text-sm">
          {success}
          <button onClick={() => setSuccess('')} className="ml-2 font-bold">×</button>
        </div>
      )}

      {/* Users Table */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Name</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Email</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Role</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Districts</th>
                  <th className="text-left px-5 py-3.5 font-semibold text-slate-600">Status</th>
                  <th className="text-right px-5 py-3.5 font-semibold text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map(user => {
                  const roleColors = USER_ROLE_COLORS[user.role as UserRole] || USER_ROLE_COLORS.rep;
                  return (
                    <tr key={user.id} className={`border-b border-slate-100 hover:bg-slate-50/60 transition-colors ${!user.is_active ? 'opacity-50' : ''}`}>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{user.name}</td>
                      <td className="px-5 py-3.5 text-slate-600">{user.email}</td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${roleColors.bg} ${roleColors.text} border ${roleColors.border}`}>
                          {USER_ROLE_OPTIONS.find(r => r.value === user.role)?.label || user.role}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        {user.districts.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {user.districts.slice(0, 3).map(d => (
                              <span key={d} className="inline-flex items-center px-2 py-0.5 rounded-md text-xs bg-slate-100 text-slate-600">
                                {d}
                              </span>
                            ))}
                            {user.districts.length > 3 && (
                              <span className="text-xs text-slate-400">+{user.districts.length - 3} more</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">
                            {['admin', 'data_entry'].includes(user.role) ? 'All districts' : 'None assigned'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1 text-xs font-semibold ${
                          user.is_active
                            ? user.status === 'approved' ? 'text-green-600' : 'text-amber-600'
                            : 'text-red-500'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${
                            user.is_active
                              ? user.status === 'approved' ? 'bg-green-500' : 'bg-amber-400'
                              : 'bg-red-400'
                          }`} />
                          {!user.is_active ? 'Deactivated' : user.status === 'approved' ? 'Active' : user.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          onClick={() => setEditingUser(user)}
                          className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 hover:text-slate-700 transition-colors"
                          title="Edit user"
                        >
                          <span className="material-symbols-outlined text-[18px]">edit</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {users.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-slate-400">
                      No users found. Create one to get started.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      {showCreateModal && (
        <CreateUserModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={(msg) => { setSuccess(msg); fetchUsers(); setShowCreateModal(false); }}
          onError={setError}
        />
      )}

      {/* Edit User Modal */}
      {editingUser && (
        <EditUserModal
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSuccess={(msg) => { setSuccess(msg); fetchUsers(); setEditingUser(null); }}
          onError={setError}
        />
      )}
    </div>
  );
}

// ─── Create User Modal ───────────────────────────────────────
function CreateUserModal({ onClose, onSuccess, onError }: {
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    name: '', email: '', password: '', role: 'data_entry' as UserRole, districts: [] as string[],
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError('');

    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || 'Failed to create user');
        return;
      }
      onSuccess(`User "${form.name}" created successfully`);
    } catch {
      onError('Failed to create user');
    } finally {
      setSaving(false);
    }
  };

  const needsDistricts = ['manager', 'telecaller'].includes(form.role);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-bold text-slate-900">Create New User</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Email</label>
            <input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Password</label>
            <input
              type="password"
              value={form.password}
              onChange={e => setForm({ ...form, password: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as UserRole, districts: [] })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            >
              {USER_ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {needsDistricts && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                Assigned Districts
                <span className="font-normal text-slate-400 ml-1">(required for {form.role})</span>
              </label>
              <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-2">
                {ALL_DISTRICTS.map(d => (
                  <label key={d} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.districts.includes(d)}
                      onChange={e => {
                        if (e.target.checked) {
                          setForm({ ...form, districts: [...form.districts, d] });
                        } else {
                          setForm({ ...form, districts: form.districts.filter(x => x !== d) });
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    {d}
                  </label>
                ))}
              </div>
              {form.districts.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{form.districts.length} district(s) selected</p>
              )}
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#1E40AF] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition-all disabled:opacity-50 shadow-md shadow-blue-200"
            >
              {saving ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Edit User Modal ──────────────────────────────────────────
function EditUserModal({ user, onClose, onSuccess, onError }: {
  user: AppUser;
  onClose: () => void;
  onSuccess: (msg: string) => void;
  onError: (msg: string) => void;
}) {
  const [form, setForm] = useState({
    role: user.role as UserRole,
    name: user.name,
    districts: user.districts,
    is_active: user.is_active,
  });
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    onError('');

    try {
      const res = await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: user.id, ...form }),
      });
      const data = await res.json();
      if (!res.ok) {
        onError(data.error || 'Failed to update user');
        return;
      }
      onSuccess(`User "${user.name}" updated successfully`);
    } catch {
      onError('Failed to update user');
    } finally {
      setSaving(false);
    }
  };

  const needsDistricts = ['manager', 'telecaller'].includes(form.role);

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-5 border-b border-slate-200 flex justify-between items-center">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Edit User</h2>
            <p className="text-sm text-slate-500">{user.email}</p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Role</label>
            <select
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as UserRole })}
              className="w-full px-3.5 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 bg-white"
            >
              {USER_ROLE_OPTIONS.map(r => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>

          {needsDistricts && (
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-1.5">Assigned Districts</label>
              <div className="border border-slate-200 rounded-xl max-h-40 overflow-y-auto p-2">
                {ALL_DISTRICTS.map(d => (
                  <label key={d} className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={form.districts.includes(d)}
                      onChange={e => {
                        if (e.target.checked) {
                          setForm({ ...form, districts: [...form.districts, d] });
                        } else {
                          setForm({ ...form, districts: form.districts.filter(x => x !== d) });
                        }
                      }}
                      className="rounded border-slate-300"
                    />
                    {d}
                  </label>
                ))}
              </div>
              {form.districts.length > 0 && (
                <p className="text-xs text-slate-500 mt-1">{form.districts.length} district(s) selected</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between px-3.5 py-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-semibold text-slate-700">Account Active</p>
              <p className="text-xs text-slate-500">Deactivated users cannot log in</p>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, is_active: !form.is_active })}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${form.is_active ? 'bg-green-500' : 'bg-slate-300'}`}
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform shadow-sm ${form.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors">
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-[#1E40AF] text-white rounded-xl text-sm font-semibold hover:bg-[#1E3A8A] transition-all disabled:opacity-50 shadow-md shadow-blue-200"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
