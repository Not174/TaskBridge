'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ShieldAlert, Users, Briefcase, Play, UserCheck, CheckCircle2, ArrowRight, Loader2, BarChart3 } from 'lucide-react';

interface Stats {
  totalUsers: number;
  totalPosters: number;
  totalSeekers: number;
  totalAdmins: number;
  totalTasks: number;
  activeTasks: number;
  completedTasks: number;
  openTasks: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/admin/stats');
        if (!res.ok) {
          throw new Error('Failed to load platform analytics.');
        }
        const data = await res.json();
        setStats(data.stats);
      } catch (err: any) {
        setError(err.message || 'An error occurred.');
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-primary" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-10">
      
      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <ShieldAlert size={28} /> Admin Dashboard
        </h1>
        <p className="text-slate-500 mt-1">Platform analytics and administrative management console</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Analytics Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          
          {/* Total Users */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center font-black">
              <Users size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalUsers}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Users</div>
            </div>
          </div>

          {/* Posters */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-primary/5 text-primary flex items-center justify-center font-black">
              <UserCheck size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalPosters}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Posters</div>
            </div>
          </div>

          {/* Seekers */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-accent/10 text-accent flex items-center justify-center font-black">
              <Users size={22} className="text-accent" />
            </div>
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalSeekers}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Seekers</div>
            </div>
          </div>

          {/* Total Tasks */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center font-black">
              <Briefcase size={22} />
            </div>
            <div>
              <div className="text-2xl font-black text-primary">{stats.totalTasks}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Total Tasks</div>
            </div>
          </div>

          {/* Active Tasks */}
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center gap-4 col-span-2 lg:col-span-1">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black">
              <Play size={20} className="fill-blue-600 text-blue-600" />
            </div>
            <div>
              <div className="text-2xl font-black text-primary">{stats.activeTasks}</div>
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Active Tasks</div>
            </div>
          </div>

        </div>
      )}

      {/* Navigations panels */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        
        {/* User Management Panel */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users size={24} />
            </div>
            <h3 className="font-bold text-xl text-primary">User Management</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Browse platform registered users (posters and seekers). Audit sensitive fields, ban/unban user accounts, or delete accounts from the database records.
            </p>
          </div>
          <Link
            href="/admin/users"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-primary text-white font-bold rounded-xl text-sm hover:bg-primary-hover transition-colors shadow-sm self-start"
          >
            Manage Users <ArrowRight size={16} />
          </Link>
        </div>

        {/* Task Management Panel */}
        <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between space-y-6 hover:shadow-md transition-shadow">
          <div className="space-y-3">
            <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center">
              <Briefcase size={24} />
            </div>
            <h3 className="font-bold text-xl text-primary">Task Management</h3>
            <p className="text-slate-500 text-sm leading-relaxed">
              Audit posted gigs, inspect current seeker assignments, budget thresholds, and deadlines. Force cancel/close disputed tasks or delete task records.
            </p>
          </div>
          <Link
            href="/admin/tasks"
            className="inline-flex items-center justify-center gap-1.5 px-5 py-3 bg-accent text-primary font-bold rounded-xl text-sm hover:bg-accent-hover transition-colors shadow-sm self-start"
          >
            Manage Tasks <ArrowRight size={16} />
          </Link>
        </div>

      </div>

    </div>
  );
}
