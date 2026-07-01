'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, Trash2, Ban, Loader2, AlertCircle, RefreshCw, Copy, Check, Search, X, MapPin, Calendar, CreditCard, Building2, Banknote, User, Phone, Hash, Clock } from 'lucide-react';

interface Applicant {
  id: string;
  taskId: string;
  seekerId: string;
  seekerName: string | null;
  seekerPhone: string | null;
  createdAt: string;
}

interface Task {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  budget: number;
  deadline: string;
  createdAt: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: string;
  posterId: string;
  posterName: string | null;
  posterPhone: string | null;
  seekerId: string | null;
  seekerName: string | null;
  seekerPhone: string | null;
  progressStep: string;
  applicants?: Applicant[];
}

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  ONLINE_PAYMENT: { label: 'Online Payment', icon: <CreditCard size={14} /> },
  BANK_TRANSFER: { label: 'Bank Transfer', icon: <Building2 size={14} /> },
  CASH_ON_HAND: { label: 'Cash on Hand', icon: <Banknote size={14} /> },
};

export default function AdminTasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [activeTab, setActiveTab] = useState<'UNASSIGNED' | 'RUNNING' | 'COMPLETED'>('UNASSIGNED');
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null);

  // Loading states for actions
  const [cancellingTaskId, setCancellingTaskId] = useState<string | null>(null);
  const [deletingTaskId, setDeletingTaskId] = useState<string | null>(null);
  const [advancingTaskId, setAdvancingTaskId] = useState<string | null>(null);

  const handleAdvanceStep = async (taskId: string) => {
    setAdvancingTaskId(taskId);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADVANCE_STEP' }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to advance task step.');
      }

      // Update state locally
      setTasksList((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, progressStep: result.task.progressStep, status: result.task.status } : t))
      );
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setAdvancingTaskId(null);
    }
  };

  const [editingBudgetTaskId, setEditingBudgetTaskId] = useState<string | null>(null);
  const [editingBudgetValue, setEditingBudgetValue] = useState('');
  const [savingBudget, setSavingBudget] = useState(false);
  const [budgetSuccessMsg, setBudgetSuccessMsg] = useState<string | null>(null);

  const openBudgetEdit = (task: Task) => {
    setEditingBudgetTaskId(task.id);
    setEditingBudgetValue(task.budget.toString());
    setBudgetSuccessMsg(null);
  };

  const handleSaveBudget = async () => {
    if (!editingBudgetTaskId) return;
    const parsedBudget = parseFloat(editingBudgetValue);
    if (isNaN(parsedBudget) || parsedBudget <= 0) {
      setError('Please enter a valid positive budget amount.');
      return;
    }

    setSavingBudget(true);
    setError(null);

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(editingBudgetTaskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_BUDGET', budget: parsedBudget }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to update task budget.');

      // Update task list
      setTasksList((prev) =>
        prev.map((t) => (t.id === editingBudgetTaskId ? { ...t, budget: result.task.budget } : t))
      );

      // Also update selectedTask if it's open
      if (selectedTask?.id === editingBudgetTaskId) {
        setSelectedTask((prev) => prev ? { ...prev, budget: result.task.budget } : null);
      }

      setBudgetSuccessMsg(`Budget updated to ${parsedBudget.toLocaleString()} BDT. Seeker notified.`);
      setEditingBudgetTaskId(null);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setSavingBudget(false);
    }
  };

  const handleAssignSeeker = async (taskId: string, seekerId: string) => {
    setAssigningTaskId(taskId);
    setError(null);
    try {
      const res = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ASSIGN_SEEKER', seekerId }),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to assign seeker.');
      }
      
      // Update state locally
      setTasksList((prev) =>
        prev.map((t) => (t.id === taskId ? {
          ...t,
          seekerId,
          seekerName: result.task.seekerName || 'Verified Seeker',
          seekerPhone: result.task.seekerPhone || '',
          status: 'IN_PROGRESS' as const,
          progressStep: 'ACCEPTED'
        } : t))
      );
      
      // Update selectedTask if it is open
      if (selectedTask?.id === taskId) {
        setSelectedTask((prev) => prev ? {
          ...prev,
          seekerId,
          seekerName: result.task.seekerName || 'Verified Seeker',
          seekerPhone: result.task.seekerPhone || '',
          status: 'IN_PROGRESS' as const,
          progressStep: 'ACCEPTED'
        } : null);
      }

      setBudgetSuccessMsg('Seeker assigned successfully! The task is now running.');
      setTimeout(() => setBudgetSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setAssigningTaskId(null);
    }
  };


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
      const res = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}?action=cancel`, {
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
      const res = await fetch(`/api/admin/tasks/${encodeURIComponent(taskId)}`, {
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
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const filteredTasks = tasksList.filter((task) => {
    const query = searchQuery.trim().toLowerCase();
    const searchMatch = !query ||
      task.id.toLowerCase().includes(query) ||
      task.posterId.toLowerCase().includes(query) ||
      (task.seekerId ? task.seekerId.toLowerCase().includes(query) : false);

    if (activeTab === 'UNASSIGNED') return searchMatch && task.status === 'OPEN';
    if (activeTab === 'RUNNING') return searchMatch && task.status === 'IN_PROGRESS';
    if (activeTab === 'COMPLETED') return searchMatch && (task.status === 'COMPLETED' || task.status === 'CANCELLED');
    return searchMatch;
  });

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-slate-50">
      {/* ── Sticky header block ─────────────────────────────────────── */}
      <div className="bg-white border-b border-slate-100 shadow-sm px-4 sm:px-6 lg:px-8 pt-8 pb-4 space-y-5">

        {/* Back Link */}
        <Link
          href="/admin/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Admin Dashboard
        </Link>

        {/* Title row + Search */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
              <Briefcase size={28} /> Task Management
            </h1>
            <p className="text-slate-500 mt-1 text-sm">Review applications, monitor active jobs, and view completed work.</p>
          </div>
          <div className="relative w-full md:max-w-md flex-shrink-0">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search size={18} />
            </div>
            <input
              type="text"
              placeholder="Search by Job ID, Poster ID, or Seeker ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="block w-full pl-10 pr-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm bg-white"
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex gap-1 bg-slate-100 p-1 rounded-xl w-fit">
          {(['UNASSIGNED', 'RUNNING', 'COMPLETED'] as const).map((key) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`px-6 py-2 rounded-lg text-xs font-bold transition-all capitalize ${
                activeTab === key
                  ? 'bg-white text-primary shadow-sm'
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              {key.charAt(0) + key.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {/* ── Scrollable content area ─────────────────────────────────── */}
      <div className="flex-grow px-4 sm:px-6 lg:px-8 py-6 space-y-4 max-w-7xl w-full mx-auto">

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium flex items-center gap-2">
          <AlertCircle className="text-red-500 flex-shrink-0" size={20} />
          {error}
        </div>
      )}

      {/* ===== UNASSIGNED TAB ===== */}
      {activeTab === 'UNASSIGNED' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="font-bold text-lg text-primary">No unassigned tasks</p>
              <p className="text-sm mt-1">All tasks are currently assigned or there are no open posts.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {filteredTasks.map((task) => (
                <div key={task.id} className="p-5 hover:bg-slate-50/30 transition-colors">
                  {/* Task header row */}
                  <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                    <div className="flex-grow min-w-0 cursor-pointer" onClick={() => setSelectedTask(task)}>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="font-bold text-primary text-base hover:text-accent transition-colors truncate max-w-xs" title={task.title}>{task.title}</h3>
                        {getStatusBadge(task.status)}
                        <span className="text-[10px] font-bold text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">{task.category}</span>
                      </div>
                      <div className="flex items-center gap-1 mt-0.5">
                        <span className="text-xs text-slate-400">ID: {task.id}</span>
                        <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(task.id); setCopiedId(task.id); setTimeout(() => setCopiedId(null), 2000); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-colors">
                          {copiedId === task.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        </button>
                      </div>
                      <div className="flex items-center gap-4 mt-1.5 text-xs text-slate-500 flex-wrap">
                        <span className="flex items-center gap-1"><User size={12} className="text-slate-400" /> {task.posterName || 'Unnamed'} ({task.posterPhone})</span>
                        <span className="flex items-center gap-1"><MapPin size={12} className="text-slate-400" /> {task.location}</span>
                        <span className="font-bold text-primary">{task.budget.toLocaleString()} BDT</span>
                        <span className="flex items-center gap-1"><Calendar size={12} className="text-slate-400" /> {formatDate(task.deadline)}</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      <button onClick={(e) => { e.stopPropagation(); openBudgetEdit(task); }} className="px-3 py-1.5 border border-slate-200 bg-white hover:bg-slate-50 text-slate-600 text-xs font-bold rounded-lg transition-all">
                        Edit Budget
                      </button>
                      <button onClick={() => handleForceCancel(task.id)} disabled={cancellingTaskId !== null} className="inline-flex items-center gap-1 px-3 py-1.5 border border-amber-200 bg-white hover:bg-amber-50 text-amber-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                        {cancellingTaskId === task.id ? <Loader2 className="animate-spin" size={12} /> : <Ban size={12} />} Cancel
                      </button>
                      <button onClick={() => handleDeleteTask(task.id)} disabled={deletingTaskId !== null} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                        {deletingTaskId === task.id ? <Loader2 className="animate-spin" size={12} /> : <Trash2 size={12} />} Delete
                      </button>
                    </div>
                  </div>

                  {/* Applicant count hint — details visible in modal */}
                  <div className="mt-3">
                    <button
                      onClick={() => setSelectedTask(task)}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-accent hover:text-accent/80 transition-colors"
                    >
                      <User size={13} />
                      {(task.applicants?.length ?? 0) === 0
                        ? 'No applicants yet — click to view details'
                        : `${task.applicants!.length} applicant${task.applicants!.length > 1 ? 's' : ''} — click to review & assign`}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ===== RUNNING TAB ===== */}
      {activeTab === 'RUNNING' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="font-bold text-lg text-primary">No running tasks</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Task Details</th>
                    <th className="px-6 py-4">Poster Info</th>
                    <th className="px-6 py-4">Assigned Seeker</th>
                    <th className="px-6 py-4">Budget / Deadline</th>
                    <th className="px-6 py-4">Progress</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} className="hover:bg-slate-50/50 transition-colors cursor-pointer">
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary max-w-xs truncate" title={task.title}>{task.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>{task.category} • ID: {task.id}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(task.id); setCopiedId(task.id); setTimeout(() => setCopiedId(null), 2000); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-colors">
                            {copiedId === task.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700">{task.posterName || 'Unnamed'}</div>
                        <div className="text-xs text-slate-400">{task.posterPhone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-slate-700">{task.seekerName || 'Unnamed'}</div>
                        <div className="text-xs text-slate-400">{task.seekerPhone}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary">{task.budget.toLocaleString()} BDT</div>
                        <button onClick={(e) => { e.stopPropagation(); openBudgetEdit(task); }} className="text-[10px] text-accent hover:underline font-semibold mt-0.5">Edit Budget</button>
                        <div className="text-[10px] text-slate-400 mt-0.5">{formatDate(task.deadline)}</div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded">
                          {task.progressStep.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right space-x-2 whitespace-nowrap">
                        {task.progressStep !== 'FEEDBACK' && (
                          <button onClick={() => handleAdvanceStep(task.id)} disabled={advancingTaskId !== null} className="inline-flex items-center gap-1 px-3 py-1.5 border border-emerald-200 bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                            {advancingTaskId === task.id ? <Loader2 className="animate-spin" size={14} /> : <RefreshCw size={14} />} Advance
                          </button>
                        )}
                        <button onClick={() => handleForceCancel(task.id)} disabled={cancellingTaskId !== null} className="inline-flex items-center gap-1 px-3 py-1.5 border border-amber-200 bg-white hover:bg-amber-50 text-amber-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                          {cancellingTaskId === task.id ? <Loader2 className="animate-spin" size={14} /> : <Ban size={14} />} Cancel
                        </button>
                        <button onClick={() => handleDeleteTask(task.id)} disabled={deletingTaskId !== null} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                          {deletingTaskId === task.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ===== COMPLETED TAB ===== */}
      {activeTab === 'COMPLETED' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {filteredTasks.length === 0 ? (
            <div className="p-16 text-center text-slate-400">
              <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
              <p className="font-bold text-lg text-primary">No completed tasks yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-4">Task Details</th>
                    <th className="px-6 py-4">Posted By</th>
                    <th className="px-6 py-4">Completed By</th>
                    <th className="px-6 py-4">Budget</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTasks.map((task) => (
                    <tr key={task.id} onClick={() => setSelectedTask(task)} className={`transition-colors cursor-pointer ${task.status === 'COMPLETED' ? 'bg-emerald-50 hover:bg-emerald-100' : 'hover:bg-slate-50/50'}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary max-w-xs truncate" title={task.title}>{task.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5 flex items-center gap-1">
                          <span>{task.category} • ID: {task.id}</span>
                          <button type="button" onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(task.id); setCopiedId(task.id); setTimeout(() => setCopiedId(null), 2000); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-colors">
                            {copiedId === task.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                          </button>
                        </div>
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
                          <span className="text-slate-400 italic text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-bold text-primary">{task.budget.toLocaleString()} BDT</div>
                        <div className="text-[10px] text-slate-400">{formatDate(task.deadline)}</div>
                      </td>
                      <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
                      <td className="px-6 py-4 text-right">
                        <button onClick={() => handleDeleteTask(task.id)} disabled={deletingTaskId !== null} className="inline-flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 border border-red-100 text-red-700 text-xs font-bold rounded-lg transition-all disabled:opacity-50">
                          {deletingTaskId === task.id ? <Loader2 className="animate-spin" size={14} /> : <Trash2 size={14} />} Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Job Details Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[92vh]">

            {/* Modal Header */}
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <Briefcase size={22} className="text-accent" />
                <div>
                  <h3 className="font-bold text-lg text-primary leading-tight">Job Post Details</h3>
                  <p className="text-xs text-slate-400">Admin view — full task record</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all"
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6 flex-grow">

              {/* Title, category, status */}
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded bg-primary/5 text-primary border border-primary/10">{selectedTask.category}</span>
                  {getStatusBadge(selectedTask.status)}
                  {selectedTask.progressStep && selectedTask.status !== 'OPEN' && selectedTask.status !== 'CANCELLED' && (
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded">
                      {selectedTask.progressStep.replace(/_/g, ' ')}
                    </span>
                  )}
                </div>
                <h2 className="text-xl font-extrabold text-primary">{selectedTask.title}</h2>
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <Hash size={12} />
                  <span className="font-bold tracking-wider">{selectedTask.id}</span>
                  <button
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(selectedTask.id); setCopiedId(selectedTask.id); setTimeout(() => setCopiedId(null), 2000); }}
                    className="p-0.5 hover:bg-slate-100 rounded text-slate-400 transition-colors"
                    title="Copy Post ID"
                  >
                    {copiedId === selectedTask.id ? <Check size={11} className="text-emerald-500" /> : <Copy size={11} />}
                  </button>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1.5">
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Description</h4>
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap bg-slate-50 p-4 rounded-xl border border-slate-100">{selectedTask.description}</p>
              </div>

              {/* Task Info Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Location</div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-primary"><MapPin size={14} className="text-slate-400" /> {selectedTask.location}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Budget</div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-extrabold text-primary">{selectedTask.budget.toLocaleString()} BDT</span>
                    <button
                      onClick={() => openBudgetEdit(selectedTask)}
                      className="text-[10px] font-bold text-accent border border-accent/30 bg-accent/5 hover:bg-accent/10 px-2 py-0.5 rounded transition-colors"
                    >
                      Edit
                    </button>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Deadline</div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700"><Calendar size={14} className="text-slate-400" /> {formatDate(selectedTask.deadline)}</div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payment Method</div>
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    {PAYMENT_LABELS[selectedTask.paymentMethod]?.icon}
                    {PAYMENT_LABELS[selectedTask.paymentMethod]?.label || selectedTask.paymentMethod}
                  </div>
                </div>
                <div className="col-span-2 space-y-1">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Posted On</div>
                  <div className="flex items-center gap-1.5 text-sm text-slate-600"><Clock size={14} className="text-slate-400" /> {formatDate(selectedTask.createdAt)}</div>
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-slate-100" />

              {/* Poster + Seeker Profiles */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

                {/* Poster */}
                <div className="bg-slate-50 rounded-xl border border-slate-100 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Client (Poster)</h4>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center"><User size={18} /></div>
                    <div className="space-y-0.5 min-w-0">
                      <div className="font-bold text-primary text-sm truncate">{selectedTask.posterName || 'Unnamed'}</div>
                      <div className="flex items-center gap-1">
                        <span className="text-[11px] font-bold text-slate-400 tracking-widest">{selectedTask.posterId}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(selectedTask.posterId); setCopiedId('poster-' + selectedTask.id); setTimeout(() => setCopiedId(null), 2000); }}
                          className="p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                          title="Copy Poster ID"
                        >
                          {copiedId === 'poster-' + selectedTask.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="pt-1 space-y-1 text-xs text-slate-600">
                    <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {selectedTask.posterPhone || '—'}</div>
                  </div>
                </div>

                {/* Seeker */}
                <div className={`rounded-xl border p-4 space-y-2 ${
                  selectedTask.seekerId ? 'bg-slate-50 border-slate-100' : 'bg-slate-50/50 border-dashed border-slate-200'
                }`}>
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Applicant (Seeker)</h4>
                  {selectedTask.seekerId ? (
                    <>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-accent/10 text-accent flex items-center justify-center"><User size={18} /></div>
                          <div className="space-y-0.5 min-w-0">
                            <div className="font-bold text-primary text-sm truncate">{selectedTask.seekerName || 'Unnamed'}</div>
                            <div className="flex items-center gap-1">
                              <span className="text-[11px] font-bold text-slate-400 tracking-widest">{selectedTask.seekerId}</span>
                              <button
                                onClick={() => { navigator.clipboard.writeText(selectedTask.seekerId!); setCopiedId('seeker-' + selectedTask.id); setTimeout(() => setCopiedId(null), 2000); }}
                                className="p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-colors"
                                title="Copy Seeker ID"
                              >
                                {copiedId === 'seeker-' + selectedTask.id ? <Check size={10} className="text-emerald-500" /> : <Copy size={10} />}
                              </button>
                            </div>
                          </div>
                        </div>
                      <div className="pt-1 space-y-1 text-xs text-slate-600">
                        <div className="flex items-center gap-1.5"><Phone size={12} className="text-slate-400" /> {selectedTask.seekerPhone || '—'}</div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-slate-400 italic py-2">
                      <User size={14} /> No seeker assigned yet
                    </div>
                  )}
                </div>
              </div>

              {/* Applicants Panel — only for OPEN tasks */}
              {selectedTask.status === 'OPEN' && (
                <div className="space-y-3">
                  <div className="border-t border-slate-100" />
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Applicants ({selectedTask.applicants?.length ?? 0})
                  </h4>
                  {!selectedTask.applicants || selectedTask.applicants.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">No applicants yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {selectedTask.applicants.map((applicant) => (
                        <div key={applicant.id} className="flex items-center justify-between bg-slate-50 border border-slate-100 rounded-xl px-3 py-2.5">
                          <div className="min-w-0">
                            <div className="text-sm font-bold text-primary">{applicant.seekerName || 'Unnamed'}</div>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-400 mt-0.5">
                              <Phone size={10} />
                              <span>{applicant.seekerPhone || '—'}</span>
                              <span>•</span>
                              <span className="font-mono">{applicant.seekerId}</span>
                              <button onClick={() => { navigator.clipboard.writeText(applicant.seekerId); setCopiedId('modal-app-' + applicant.id); setTimeout(() => setCopiedId(null), 2000); }} className="p-0.5 hover:bg-slate-200 rounded text-slate-400 transition-colors">
                                {copiedId === 'modal-app-' + applicant.id ? <Check size={9} className="text-emerald-500" /> : <Copy size={9} />}
                              </button>
                            </div>
                          </div>
                          <button
                            onClick={() => handleAssignSeeker(selectedTask.id, applicant.seekerId)}
                            disabled={assigningTaskId !== null}
                            className="ml-3 flex-shrink-0 px-4 py-1.5 bg-accent hover:bg-accent/90 text-white text-xs font-bold rounded-lg transition-all disabled:opacity-50 whitespace-nowrap"
                          >
                            {assigningTaskId === selectedTask.id ? <Loader2 className="animate-spin inline" size={12} /> : 'Assign'}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
              >
                Close
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Budget Edit Modal */}
      {editingBudgetTaskId && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
            <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-primary">Edit Task Budget</h3>
                <p className="text-xs text-slate-400 mt-0.5">Seeker will be notified of any change.</p>
              </div>
              <button onClick={() => setEditingBudgetTaskId(null)} className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">New Budget (BDT)</label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={editingBudgetValue}
                  onChange={(e) => setEditingBudgetValue(e.target.value)}
                  className="block w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all text-sm font-bold text-primary"
                  placeholder="Enter amount..."
                  autoFocus
                />
              </div>
              {error && <p className="text-xs text-red-600 font-medium">{error}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={handleSaveBudget}
                  disabled={savingBudget}
                  className="flex-1 flex items-center justify-center gap-1.5 px-4 py-2.5 bg-accent text-white font-bold text-sm rounded-xl hover:bg-accent/90 transition-all disabled:opacity-60"
                >
                  {savingBudget ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                  {savingBudget ? 'Saving...' : 'Save & Notify'}
                </button>
                <button
                  onClick={() => { setEditingBudgetTaskId(null); setError(null); }}
                  className="px-4 py-2.5 text-sm font-bold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Budget success toast */}
      {budgetSuccessMsg && (
        <div className="fixed bottom-6 right-6 z-[70] bg-emerald-600 text-white px-5 py-3 rounded-xl shadow-lg text-sm font-semibold flex items-center gap-2">
          <Check size={16} /> {budgetSuccessMsg}
        </div>
      )}

      </div>{/* end flex-grow content */}
    </div>
  );
}
