'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Briefcase, Calendar, MapPin, CheckCircle, AlertTriangle, Loader2, CheckCircle2, Play } from 'lucide-react';

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
}

export default function SeekerMyJobs() {
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const [completingTaskId, setCompletingTaskId] = useState<string | null>(null);
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

  const handleMarkComplete = async (taskId: string) => {
    setCompletingTaskId(taskId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'COMPLETE' }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update task.');
      }

      setSuccessMsg('Task completed successfully! Great work.');
      
      // Update local state to reflect change
      setMyTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: 'COMPLETED' as const } : t))
      );

      // Auto-dismiss success alert
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setCompletingTaskId(null);
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

  // Stats calculation
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
      
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <Briefcase size={28} /> My Active Jobs
        </h1>
        <p className="text-slate-500 mt-1">Check your accepted gigs, complete requirements, and submit jobs for review</p>
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

      {/* Stats Counters Grid */}
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

      {/* Task List Grid */}
      {myTasks.length === 0 ? (
        <div className="bg-white p-16 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm">
          <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="font-bold text-lg text-primary">No accepted jobs</p>
          <p className="text-sm mt-1 max-w-xs mx-auto">You have not accepted any jobs yet. Visit the job board to find available work.</p>
          <Link
            href="/seeker/jobs"
            className="mt-6 inline-flex items-center justify-center py-2.5 px-5 text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors"
          >
            Browse Job Board
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {myTasks.map((task) => (
            <div key={task.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 hover:shadow-md transition-all duration-200">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div className="space-y-2 flex-grow">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-bold text-primary text-xl leading-tight">{task.title}</h3>
                    {getStatusBadge(task.status)}
                  </div>
                  <p className="text-xs text-slate-400">
                    Category: <strong className="text-slate-600 font-semibold">{task.category}</strong> • Posted by: <strong className="text-slate-600 font-semibold">{task.posterName || 'Verified Client'}</strong>
                  </p>
                  <p className="text-sm text-slate-500 max-w-3xl leading-relaxed">{task.description}</p>
                  
                  {/* Task details */}
                  <div className="flex flex-wrap gap-4 pt-2 text-xs text-slate-500">
                    <span className="flex items-center gap-1">
                      <MapPin size={14} className="text-slate-400" />
                      {task.location}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar size={14} className="text-slate-400" />
                      Deadline: {formatDate(task.deadline)}
                    </span>
                    <span className="font-bold text-primary">
                      Budget: {task.budget.toLocaleString()} BDT
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex-shrink-0">
                  {task.status === 'IN_PROGRESS' ? (
                    <button
                      onClick={() => handleMarkComplete(task.id)}
                      disabled={completingTaskId !== null}
                      className="inline-flex items-center gap-1.5 px-5 py-3 bg-accent hover:bg-accent-hover text-primary font-bold text-sm rounded-xl transition-all duration-200 shadow-sm disabled:opacity-50"
                    >
                      {completingTaskId === task.id ? (
                        <>
                          <Loader2 className="animate-spin" size={16} />
                          Updating...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Mark Complete
                        </>
                      )}
                    </button>
                  ) : (
                    <span className="text-xs text-slate-400 italic font-semibold flex items-center gap-1">
                      <CheckCircle2 size={14} className="text-emerald-500" /> Job closed
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
