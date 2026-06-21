'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Users, ShieldAlert, Ban, UserCheck, Trash2, Loader2, AlertCircle } from 'lucide-react';

interface User {
  id: string;
  name: string | null;
  phone: string;
  email: string | null;
  role: 'POSTER' | 'SEEKER' | 'ADMIN';
  isActive: boolean;
  createdAt: string;
}

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pending actions states (to prevent double clicks)
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/users');
      if (!res.ok) throw new Error('Failed to load user records.');
      const data = await res.json();
      setUsersList(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleBan = async (user: User) => {
    setUpdatingUserId(user.id);
    setError(null);

    const newStatus = !user.isActive;

    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update user status.');
      }

      // Update local state
      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Are you sure you want to permanently delete this user account? This action cannot be undone and will delete related tasks.')) {
      return;
    }

    setDeletingUserId(userId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to delete user.');
      }

      // Remove from local list
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      
      {/* Back link */}
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <Users size={28} /> User Management
        </h1>
        <p className="text-slate-500 mt-1">Review registered posters, seekers, and administrators. Manage platform access.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium flex items-center gap-2">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {usersList.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Users size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="font-bold text-lg text-primary">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">User Details</th>
                  <th className="px-6 py-4">Role</th>
                  <th className="px-6 py-4">Created At</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usersList.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary">{user.name || <span className="text-slate-400 font-normal italic">Unnamed</span>}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{user.phone} • {user.email || 'No Email'}</div>
                    </td>
                    <td className="px-6 py-4">
                      {user.role === 'ADMIN' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-100">Admin</span>}
                      {user.role === 'POSTER' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-primary/5 text-primary border border-primary/10">Poster</span>}
                      {user.role === 'SEEKER' && <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-accent/10 text-accent border border-accent/20">Seeker</span>}
                    </td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(user.createdAt)}</td>
                    <td className="px-6 py-4">
                      {user.isActive ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Active</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">Banned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {user.role !== 'ADMIN' && (
                        <>
                          <button
                            onClick={() => handleToggleBan(user)}
                            disabled={updatingUserId !== null || deletingUserId !== null}
                            className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-bold rounded-lg border transition-all ${
                              user.isActive
                                ? 'bg-white hover:bg-red-50 text-red-600 border-red-200'
                                : 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200'
                            } disabled:opacity-50`}
                          >
                            {updatingUserId === user.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : user.isActive ? (
                              <Ban size={14} />
                            ) : (
                              <UserCheck size={14} />
                            )}
                            {user.isActive ? 'Ban User' : 'Unban User'}
                          </button>
                          <button
                            onClick={() => handleDeleteUser(user.id)}
                            disabled={updatingUserId !== null || deletingUserId !== null}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 border border-red-100 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                          >
                            {deletingUserId === user.id ? (
                              <Loader2 className="animate-spin" size={14} />
                            ) : (
                              <Trash2 size={14} />
                            )}
                            Delete
                          </button>
                        </>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
