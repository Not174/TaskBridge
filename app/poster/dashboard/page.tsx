'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LayoutDashboard, Plus, Briefcase, Play, CheckCircle, Clock, AlertTriangle, ArrowRight, Loader2 } from 'lucide-react';

interface Task {
  id: string;
  title: string;
  category: string;
  description: string;
  location: string;
  budget: number;
  deadline: string;
  status: 'OPEN' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';
  createdAt: string;
  seekerId: string | null;
  seekerName: string | null;
}

export default function PosterDashboard() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPosterTasks() {
      try {
        const res = await fetch('/api/tasks');
        if (!res.ok) {
          throw new Error('Failed to fetch your tasks.');
        }
        const data = await res.json();
        setTasksList(data);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchPosterTasks();
  }, []);

  // Compute statistics
  const totalPosted = tasksList.length;
  const completed = tasksList.filter((t) => t.status === 'COMPLETED').length;
  const inProgress = tasksList.filter((t) => t.status === 'IN_PROGRESS').length;
  const pending = tasksList.filter((t) => t.status === 'OPEN').length;
  const cancelled = tasksList.filter((t) => t.status === 'CANCELLED').length;

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">In Progress</span>;
      case 'OPEN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">Open</span>;
      case 'CANCELLED':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">Cancelled</span>;
      default:
        return null;
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
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
            <LayoutDashboard size={28} /> Dashboard
          </h1>
          <p className="text-slate-500 mt-1">Manage and track your posted tasks and seeker matches</p>
        </div>
        <Link
          href="/poster/post-task"
          className="flex items-center gap-2 px-5 py-3 bg-accent text-primary hover:bg-accent-hover font-bold rounded-xl shadow-sm shadow-accent/15 transition-all duration-200"
        >
          <Plus size={18} /> Post a Task
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* 4 Stats Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        
        {/* Total Posted */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-black text-xl">
            <Briefcase size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-primary">{totalPosted}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Posted</div>
          </div>
        </div>

        {/* In Progress */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xl">
            <Play size={20} className="fill-blue-600" />
          </div>
          <div>
            <div className="text-2xl font-black text-primary">{inProgress}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">In Progress</div>
          </div>
        </div>

        {/* Completed */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-black text-xl">
            <CheckCircle size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-primary">{completed}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Completed</div>
          </div>
        </div>

        {/* Pending (Open) */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center font-black text-xl">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-black text-primary">{pending}</div>
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Pending (Open)</div>
          </div>
        </div>

      </div>

      {/* Recent Tasks List */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <h3 className="font-bold text-lg text-primary">Recent Tasks</h3>
          <Link href="/poster/my-tasks" className="text-xs font-bold text-accent hover:underline flex items-center gap-1">
            View All Tasks <ArrowRight size={14} />
          </Link>
        </div>

        {tasksList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <AlertTriangle size={36} className="mx-auto text-slate-300 mb-2" />
            <p className="font-medium">No tasks posted yet.</p>
            <p className="text-xs mt-1">Get started by clicking the "Post a Task" button!</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Title</th>
                  <th className="px-6 py-4">Category</th>
                  <th className="px-6 py-4">Budget</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Assigned Seeker</th>
                  <th className="px-6 py-4">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasksList.slice(0, 5).map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 font-bold text-primary max-w-xs truncate">
                      {task.title}
                    </td>
                    <td className="px-6 py-4 text-slate-600">{task.category}</td>
                    <td className="px-6 py-4 font-bold text-primary">{task.budget.toLocaleString()} BDT</td>
                    <td className="px-6 py-4 text-slate-500">{formatDate(task.deadline)}</td>
                    <td className="px-6 py-4">
                      {task.seekerName ? (
                        <span className="font-medium text-slate-700">{task.seekerName}</span>
                      ) : (
                        <span className="text-slate-400 italic">None</span>
                      )}
                    </td>
                    <td className="px-6 py-4">{getStatusBadge(task.status)}</td>
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
