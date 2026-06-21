'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Trash2, Ban, Loader2, AlertCircle, RefreshCw } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  budget: number;
  deadline: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  posterId: string;
  posterName: string | null;
  posterPhone: string | null;
  seekerId: string | null;
  seekerName: string | null;
  seekerPhone: string | null;
}

export default function AdminTasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Loading states for actions
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/tasks');
      if (!res.ok) throw new Error('Failed to load task records.');
      const data = await res.json();
      setTasksList(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleForceCancel = async (taskId: string) => {
    if (!confirm('Are you sure you want to FORCE CANCEL this task? This sets its status to CANCELLED.')) {
      return;
    }

    setCancellingTaskId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tasks/${taskId}?action=cancel`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to force cancel task.');
      }

      // Update state locally
      setTasksList((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'CANCELLED' as const } : t))
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setCancellingTaskId(null);
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to PERMANENTLY DELETE this task record from the database? This action is irreversible.')) {
      return;
    }

    setDeletingTaskId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/admin/tasks/${taskId}`, {
        method: 'DELETE',
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to delete task.');
      }

      // Remove from list
      setTasksList((prev) => prev.filter((t) => t.id !== taskId));
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setDeletingTaskId(null);
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-100">In Progress</span>;
      case 'OPEN':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-50 text-slate-700 border border-slate-200">Open</span>;
      case 'CANCELLED':
        return <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-50 text-red-700 border border-red-100">Cancelled</span>;
      default:
        return null;
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
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

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <Briefcase size={28} /> Task Management
        </h1>
        <p className="text-slate-500 mt-1">Monitor published gig-works, inspect assignment matches, and perform cancellations.</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium flex items-center gap-2">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          {error}
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {tasksList.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
            <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
            <p className="font-bold text-lg text-primary">No tasks found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Task Details</th>
                  <th className="px-6 py-4">Poster Info</th>
                  <th className="px-6 py-4">Seeker Info</th>
                  <th className="px-6 py-4">Budget / Deadline</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasksList.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary max-w-xs truncate" title={task.title}>{task.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{task.category} • ID: {task.id.slice(0, 8)}...</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-semibold text-slate-700">{task.posterName || 'Unnamed'}</div>
                      <div className="text-xs text-slate-400">{task.posterPhone}</div>
                    </td>
                    <td className="px-6 py-4">
                      {task.seekerId ? (
                        <div>
                          <div className="font-semibold text-slate-700">{task.seekerName || 'Unnamed'}</div>
                          <div className="text-xs text-slate-400">{task.seekerPhone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic text-xs">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-primary">{task.budget.toLocaleString()} BDT</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(task.deadline)}</div>
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                    <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                      {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && (
                        <button
                          onClick={() => handleForceCancel(task.id)}
                          disabled={cancellingTaskId !== null || deletingTaskId !== null}
                          className="inline-flex items-center gap-1 px-3 py-1.5 border border-amber-200 bg-white hover:bg-amber-50 text-amber-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                        >
                          {cancellingTaskId === task.id ? (
                            <Loader2 className="animate-spin" size={14} />
                          ) : (
                            <Ban size={14} />
                          )}
                          Cancel Task
                        </button>
                      )}
                      <button
                        onClick={() => handleDeleteTask(task.id)}
                        disabled={cancellingTaskId !== null || deletingTaskId !== null}
                        className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50"
                      >
                        {deletingTaskId === task.id ? (
                          <Loader2 className="animate-spin" size={14} />
                        ) : (
                          <Trash2 size={14} />
                        )}
                        Delete
                      </button>
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
