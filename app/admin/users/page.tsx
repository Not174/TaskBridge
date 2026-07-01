'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Users, 
  Ban, 
  UserCheck, 
  Trash2, 
  Loader2, 
  AlertCircle,
  User, 
  Phone, 
  Mail, 
  Calendar, 
  X, 
  Briefcase, 
  CheckSquare, 
  MapPin,
  Copy,
  Check,
  Search
} from 'lucide-react';

interface JobSummary {
  id: string;
  title: string;
  status: string;
  budget: number;
  location: string;
}

interface UserProfile {
  id: string;
  name: string | null;
  phone: string;
  additionalPhone: string | null;
  email: string | null;
  role: 'POSTER' | 'SEEKER' | 'ADMIN';
  profilePicUrl: string | null;
  isActive: boolean;
  createdAt: string;
  activeJobs: JobSummary[];
  finishedJobs: JobSummary[];
}

export default function AdminUsersPage() {
  const [usersList, setUsersList] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Selected user for details modal
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<'active' | 'finished'>('active');

  // Pending actions states
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

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

  const handleToggleBan = async (user: UserProfile, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal
    setUpdatingUserId(user.id);
    setError(null);

    const newStatus = !user.isActive;

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(user.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isActive: newStatus }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update user status.');
      }

      // Update state locally
      setUsersList((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, isActive: newStatus } : u))
      );
      if (selectedUser?.id === user.id) {
        setSelectedUser((prev) => prev ? { ...prev, isActive: newStatus } : null);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setUpdatingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening modal
    if (!confirm('Are you sure you want to permanently delete this user account? This action cannot be undone and will delete related tasks.')) {
      return;
    }

    setDeletingUserId(userId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/users/${encodeURIComponent(userId)}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to delete user.');
      }

      // Remove from local list & close modal if open
      setUsersList((prev) => prev.filter((u) => u.id !== userId));
      if (selectedUser?.id === userId) {
        setSelectedUser(null);
      }
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

  const filteredUsers = usersList.filter((user) => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    
    const phoneMatches = user.phone.toLowerCase().includes(query) || (user.additionalPhone ? user.additionalPhone.toLowerCase().includes(query) : false);
    const emailMatches = user.email ? user.email.toLowerCase().includes(query) : false;
    const idMatches = user.id.toLowerCase().includes(query);
    const nameMatches = user.name ? user.name.toLowerCase().includes(query) : false;
    
    return phoneMatches || emailMatches || idMatches || nameMatches;
  });

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      {/* Back Link */}
      <div>
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Admin Dashboard
        </Link>
      </div>

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
            <Users size={28} /> User Management
          </h1>
          <p className="text-slate-500 mt-1">Click on any user row to view their detailed profile, job listings, and manage access.</p>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:max-w-md">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
            <Search size={18} />
          </div>
          <input
            type="text"
            placeholder="Search by ID, Name, Phone or Email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium flex items-center gap-2">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          {error}
        </div>
      )}

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filteredUsers.length === 0 ? (
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
                {filteredUsers.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => {
                      setSelectedUser(user);
                      setActiveTab('active');
                    }}
                    className="hover:bg-slate-50/50 transition-colors cursor-pointer"
                  >
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
                            onClick={(e) => handleToggleBan(user, e)}
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
                            {user.isActive ? 'Ban' : 'Unban'}
                          </button>
                          <button
                            onClick={(e) => handleDeleteUser(user.id, e)}
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

      {/* Details & Jobs Modal Overlay */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div className="flex items-center gap-3">
                <Users className="text-accent" size={24} />
                <div>
                  <h3 className="font-bold text-lg text-primary">User Profile Card</h3>
                  <p className="text-xs text-slate-500">System user details & associated task logs</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">
              
              {/* Profile Card Summary */}
              <div className="flex flex-col sm:flex-row gap-6 items-center sm:items-start pb-6 border-b border-slate-100">
                {/* Profile Pic */}
                {selectedUser.profilePicUrl ? (
                  <img
                    src={selectedUser.profilePicUrl}
                    alt={selectedUser.name || 'User'}
                    className="w-24 h-24 rounded-full object-cover border-4 border-slate-100 shadow-sm"
                  />
                ) : (
                  <div className="w-24 h-24 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center border-4 border-slate-100">
                    <User size={40} />
                  </div>
                )}

                {/* Details list */}
                <div className="space-y-3 flex-grow text-center sm:text-left min-w-0">
                  <div>
                    <h2 className="text-xl font-extrabold text-primary flex flex-wrap items-center justify-center sm:justify-start gap-2">
                      {selectedUser.name || <span className="text-slate-400 font-normal italic">Unnamed</span>}
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded bg-accent/15 text-primary border border-accent/25 tracking-widest">{selectedUser.id}</span>
                    </h2>
                    <p className="text-xs text-slate-400 mt-1">Registered: {formatDate(selectedUser.createdAt)}</p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-sm text-slate-600 pt-1">
                    <div className="flex items-center justify-center sm:justify-start gap-2"><Phone size={14} className="text-slate-400" /> <span className="font-semibold text-primary">{selectedUser.phone}</span></div>
                    {selectedUser.additionalPhone && (
                      <div className="flex items-center justify-center sm:justify-start gap-2"><Phone size={14} className="text-slate-400" /> <span>Secondary: <span className="font-semibold text-primary">{selectedUser.additionalPhone}</span></span></div>
                    )}
                    {selectedUser.email && (
                      <div className="flex items-center justify-center sm:justify-start gap-2"><Mail size={14} className="text-slate-400" /> <span className="font-medium">{selectedUser.email}</span></div>
                    )}
                    <div className="flex items-center justify-center sm:justify-start gap-2">
                      <span className="font-semibold text-slate-500">Role:</span>
                      <span className="font-bold text-accent">{selectedUser.role}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Jobs section */}
              <div className="space-y-4">
                {/* Tabs */}
                <div className="flex border-b border-slate-100">
                  <button
                    onClick={() => setActiveTab('active')}
                    className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'active' 
                        ? 'border-accent text-accent font-extrabold' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <Briefcase size={16} />
                    Active Jobs ({selectedUser.activeJobs.length})
                  </button>
                  <button
                    onClick={() => setActiveTab('finished')}
                    className={`flex-1 pb-3 text-sm font-bold border-b-2 transition-all flex items-center justify-center gap-2 ${
                      activeTab === 'finished' 
                        ? 'border-accent text-accent font-extrabold' 
                        : 'border-transparent text-slate-400 hover:text-slate-600'
                    }`}
                  >
                    <CheckSquare size={16} />
                    Finished Jobs ({selectedUser.finishedJobs.length})
                  </button>
                </div>

                {/* Job List items */}
                <div className="space-y-3 pt-2">
                  {activeTab === 'active' ? (
                    selectedUser.activeJobs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No active jobs found for this user.
                      </div>
                    ) : (
                      selectedUser.activeJobs.map((job) => (
                        <div key={job.id} className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl flex items-center justify-between gap-4 transition-colors">
                          <div className="space-y-1 min-w-0">
                            <div className="font-bold text-sm text-primary truncate">{job.title}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-500">Post ID: {job.id}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(job.id);
                                    setCopiedId(job.id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }}
                                  className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-650 transition-colors"
                                  title="Copy Post ID"
                                >
                                  {copiedId === job.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                </button>
                              </div>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><MapPin size={11} /> {job.location}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-xs text-primary">{job.budget.toLocaleString()} BDT</div>
                            <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-blue-50 text-blue-700 rounded border border-blue-100 uppercase">{job.status}</span>
                          </div>
                        </div>
                      ))
                    )
                  ) : (
                    selectedUser.finishedJobs.length === 0 ? (
                      <div className="p-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                        No completed jobs found for this user.
                      </div>
                    ) : (
                      selectedUser.finishedJobs.map((job) => (
                        <div key={job.id} className="p-4 bg-slate-50 hover:bg-slate-100/70 border border-slate-100 rounded-xl flex items-center justify-between gap-4 transition-colors">
                          <div className="space-y-1 min-w-0">
                            <div className="font-bold text-sm text-primary truncate">{job.title}</div>
                            <div className="flex items-center gap-2 text-xs text-slate-400">
                              <div className="flex items-center gap-1">
                                <span className="font-bold text-slate-500">Post ID: {job.id}</span>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(job.id);
                                    setCopiedId(job.id);
                                    setTimeout(() => setCopiedId(null), 2000);
                                  }}
                                  className="p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-slate-650 transition-colors"
                                  title="Copy Post ID"
                                >
                                  {copiedId === job.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                                </button>
                              </div>
                              <span>•</span>
                              <span className="flex items-center gap-0.5"><MapPin size={11} /> {job.location}</span>
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-xs text-primary">{job.budget.toLocaleString()} BDT</div>
                            <span className="inline-block mt-1 px-2 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 rounded border border-emerald-100 uppercase">COMPLETED</span>
                          </div>
                        </div>
                      ))
                    )
                  )}
                </div>
              </div>

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                {selectedUser.role !== 'ADMIN' && (
                  <button
                    onClick={(e) => handleToggleBan(selectedUser, e)}
                    disabled={updatingUserId !== null || deletingUserId !== null}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-lg border transition-all ${
                      selectedUser.isActive 
                        ? 'bg-white hover:bg-red-50 text-red-600 border-red-200' 
                        : 'bg-white hover:bg-emerald-50 text-emerald-600 border-emerald-200'
                    } disabled:opacity-50`}
                  >
                    {updatingUserId === selectedUser.id ? (
                      <Loader2 className="animate-spin" size={14} />
                    ) : selectedUser.isActive ? (
                      <Ban size={14} />
                    ) : (
                      <UserCheck size={14} />
                    )}
                    {selectedUser.isActive ? 'Ban Access' : 'Restore Access'}
                  </button>
                )}
              </div>
              <button
                onClick={() => setSelectedUser(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close Profile
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
