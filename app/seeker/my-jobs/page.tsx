'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, MapPin, Loader2, CheckCircle2, ChevronRight, CreditCard, Building2, Banknote } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';

interface Task {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  budget: number;
  deadline: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  paymentMethod: string;
  progressStep: string;
  posterId: string;
  posterName: string | null;
}

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  ONLINE_PAYMENT: { label: 'Online', icon: <CreditCard size={12} /> },
  BANK_TRANSFER: { label: 'Bank', icon: <Building2 size={12} /> },
  CASH_ON_HAND: { label: 'Cash', icon: <Banknote size={12} /> },
};

export default function SeekerMyJobs() {
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [advancingId, setAdvancingId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchMyTasks();
  }, []);

  const fetchMyTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/tasks?type=my');
      if (!res.ok) throw new Error('Failed to fetch your accepted tasks.');
      const data = await res.json();
      setMyTasks(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleAdvanceStep = async (taskId: string) => {
    setAdvancingId(taskId);
    setError(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADVANCE_STEP' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to advance step.');
      setMyTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, progressStep: result.task.progressStep, status: result.task.status } : t))
      );
      setSuccessMsg('Progress updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setAdvancingId(null);
    }
  };

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">In Progress</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">Cancelled</span>;
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

  const totalAccepted = myTasks.length;
  const inProgress = myTasks.filter((t) => t.status === 'IN_PROGRESS').length;
  const completed = myTasks.filter((t) => t.status === 'COMPLETED').length;

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <Briefcase size={28} /> My Active Jobs
        </h1>
        <p className="text-slate-500 mt-1">Track your accepted gigs, advance progress, and submit for review</p>
      </div>

      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl text-emerald-700 font-medium flex items-center gap-2">
          <CheckCircle2 className="text-emerald-500 flex-shrink-0" size={20} />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Stats Counters */}
      <div className="grid grid-cols-3 gap-4 max-w-2xl">
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl font-black text-primary">{totalAccepted}</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Total Accepted</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl font-black text-blue-600">{inProgress}</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Ongoing</div>
        </div>
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm text-center">
          <div className="text-2xl font-black text-emerald-600">{completed}</div>
          <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mt-1">Completed</div>
        </div>
      </div>

      {/* Task List */}
      {myTasks.length === 0 ? (
        <div className="bg-white p-16 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm">
          <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="font-bold text-lg text-primary">No accepted jobs</p>
          <p className="text-sm mt-1 max-w-xs mx-auto">Visit the job board to find available work.</p>
          <Link
            href="/seeker/jobs"
            className="mt-6 inline-flex items-center justify-center py-2.5 px-5 text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors"
          >
            Browse Job Board
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myTasks.map((task) => {
            const payInfo = PAYMENT_LABELS[task.paymentMethod] || PAYMENT_LABELS['CASH_ON_HAND'];
            const stepLabel = {
              POSTED: 'Assignment Accepted',
              REVIEWING: 'Review Details',
              ACCEPTED: 'Review Details',
              CONTACT_COORDINATION: 'Contact the Applicant',
              WORK_IN_PROGRESS: 'Work in Progress',
              TASK_COMPLETED: 'Task Completed',
              PAYMENT_PROCESSING: 'Payment Processing',
              FINISHED: 'Task Finished',
              FEEDBACK: 'Feedback',
            }[task.progressStep] || task.progressStep;

            return (
              <div key={task.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                {/* Header */}
                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/seeker/my-jobs/${encodeURIComponent(task.id)}`}>
                        <h3 className="font-bold text-primary text-lg hover:text-accent hover:underline cursor-pointer">{task.title}</h3>
                      </Link>
                      {getStatusBadge(task.status)}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {payInfo.icon} {payInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {task.category} • Posted by: <strong className="text-slate-600">{task.posterName || 'Verified Client'}</strong>
                    </p>
                    <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">{task.description}</p>
                    <div className="flex flex-wrap gap-4 pt-1 text-xs text-slate-500">
                      <span className="flex items-center gap-1"><MapPin size={14} className="text-slate-400" /> {task.location}</span>
                      <span className="flex items-center gap-1"><Calendar size={14} className="text-slate-400" /> {formatDate(task.deadline)}</span>
                      <span className="font-bold text-primary">{task.budget.toLocaleString()} BDT</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex-shrink-0">
                    <Link
                      href={`/seeker/my-jobs/${encodeURIComponent(task.id)}`}
                      className="inline-flex items-center gap-1 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all shadow-sm"
                    >
                      View Details
                    </Link>
                  </div>
                </div>

                {/* Progress Step (for active / completed tasks) */}
                {task.status !== 'OPEN' && task.status !== 'CANCELLED' && (
                  <div className="px-5 pb-5 border-t border-slate-50 pt-3 flex items-center justify-between text-xs text-slate-500">
                    <span className="font-medium text-slate-400">Current Progress Stage:</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-700 border border-amber-200 animate-pulse">
                      {stepLabel}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
