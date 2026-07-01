'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, Loader2, MapPin, Calendar, CreditCard, Building2, Banknote, ShieldAlert, Navigation, AlertTriangle, Copy, Check } from 'lucide-react';
import ProgressBar from '@/components/ProgressBar';
import TrackingMap from '@/components/TrackingMap';

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
  seekerId: string | null;
  seekerName: string | null;
  seekerPhone: string | null;
  budgetChangedByPoster: boolean;
}

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  ONLINE_PAYMENT: { label: 'Online Payment', icon: <CreditCard size={16} /> },
  BANK_TRANSFER: { label: 'Bank Transfer', icon: <Building2 size={16} /> },
  CASH_ON_HAND: { label: 'Cash on Hand', icon: <Banknote size={16} /> },
};

export default function PosterTaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: taskId } = use(params);
  const [task, setTask] = useState<Task | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [isEditingBudget, setIsEditingBudget] = useState(false);
  const [newBudget, setNewBudget] = useState('');
  const [updatingBudget, setUpdatingBudget] = useState(false);

  useEffect(() => {
    fetchTaskDetails();
  }, [taskId]);

  const fetchTaskDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`);
      if (!res.ok) {
        throw new Error('Failed to load task details. You may not have permission.');
      }
      const data = await res.json();
      if (data.success && data.task) {
        setTask(data.task);
      } else {
        throw new Error('Invalid response structure.');
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Seeker GPS tracking
  const [seekerCoords, setSeekerCoords] = useState<{ latitude: number; longitude: number; recordedAt: string } | null>(null);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [coordsError, setCoordsError] = useState<string | null>(null);

  const fetchSeekerGPS = async (seekerId: string) => {
    setLoadingCoords(true);
    setCoordsError(null);
    try {
      const res = await fetch(`/api/gps?userId=${encodeURIComponent(seekerId)}`);
      if (!res.ok) {
        if (res.status === 404) throw new Error('Seeker has not shared any location yet.');
        throw new Error('Failed to retrieve seeker location.');
      }
      const data = await res.json();
      if (data.success && data.log) setSeekerCoords(data.log);
    } catch (err: any) {
      setCoordsError(err.message || 'Error connecting to GPS service.');
    } finally {
      setLoadingCoords(false);
    }
  };

  const isLocationLive = () => {
    if (!seekerCoords) return false;
    return Date.now() - new Date(seekerCoords.recordedAt).getTime() < 120000;
  };

  useEffect(() => {
    if (task?.seekerId && task.status !== 'CANCELLED' && task.status !== 'OPEN') {
      fetchSeekerGPS(task.seekerId);
      const interval = setInterval(() => fetchSeekerGPS(task.seekerId!), 30000);
      return () => clearInterval(interval);
    }
  }, [task]);

  const handleUpdateBudget = async () => {
    if (!newBudget || isNaN(parseFloat(newBudget)) || parseFloat(newBudget) <= 0) {
      alert('Please enter a valid positive number for the budget.');
      return;
    }

    setUpdatingBudget(true);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_BUDGET', budget: parseFloat(newBudget) }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to update budget.');
      }

      setTask((prev) => prev ? { ...prev, budget: result.task.budget, budgetChangedByPoster: result.task.budgetChangedByPoster } : null);
      setIsEditingBudget(false);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setUpdatingBudget(false);
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

  const getStatusBadge = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100">Completed</span>;
      case 'IN_PROGRESS':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-100">In Progress</span>;
      case 'OPEN':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">Open</span>;
      case 'CANCELLED':
        return <span className="px-3 py-1 rounded-full text-xs font-semibold bg-red-50 text-red-700 border border-red-100">Cancelled</span>;
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50/50 flex items-center justify-center">
        <Loader2 className="animate-spin text-accent" size={40} />
      </div>
    );
  }

  if (error || !task) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert size={48} className="mx-auto text-red-500" />
        <h2 className="text-xl font-bold text-primary">Error Loading Task</h2>
        <p className="text-slate-500">{error || 'Task details could not be found.'}</p>
        <Link
          href="/poster/my-tasks"
          className="inline-flex items-center gap-1.5 text-sm font-bold text-accent hover:underline"
        >
          <ArrowLeft size={16} /> Back to My Tasks
        </Link>
      </div>
    );
  }

  const payInfo = PAYMENT_LABELS[task.paymentMethod] || PAYMENT_LABELS['CASH_ON_HAND'];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      {/* Back Button */}
      <div>
        <Link
          href="/poster/my-tasks"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to My Tasks
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left 2 Columns: Task Details */}
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div className="space-y-1">
                <span className="px-2.5 py-1 rounded bg-primary/5 text-primary text-[10px] font-extrabold uppercase tracking-wider">
                  {task.category}
                </span>
                <h1 className="text-2xl sm:text-3xl font-extrabold text-primary pt-1">{task.title}</h1>
              </div>
              <div className="flex flex-col items-end gap-1.5">
                {getStatusBadge(task.status)}
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">ID: {task.id}</span>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(task.id);
                      setCopiedId(task.id);
                      setTimeout(() => setCopiedId(null), 2000);
                    }}
                    className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors inline-flex items-center"
                    title="Copy Task ID"
                  >
                    {copiedId === task.id ? <Check size={12} className="text-emerald-500" /> : <Copy size={12} />}
                  </button>
                </div>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <h3 className="font-bold text-primary text-sm uppercase tracking-wider">Description</h3>
              <p className="text-slate-600 text-sm leading-relaxed whitespace-pre-wrap">{task.description}</p>
            </div>

            {/* Info Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 pt-4 border-t border-slate-50">
              <div className="space-y-4">
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <div className="font-semibold text-slate-500">Location</div>
                    <div className="text-primary font-medium">{task.location}</div>
                  </div>
                </div>

                <div className="flex items-start gap-2.5 text-sm">
                  <Calendar className="text-slate-400 mt-0.5 flex-shrink-0" size={18} />
                  <div>
                    <div className="font-semibold text-slate-500">Deadline</div>
                    <div className="text-primary font-medium">{formatDate(task.deadline)}</div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-start gap-2.5 text-sm">
                  <div className="text-slate-400 mt-0.5 flex-shrink-0">{payInfo.icon}</div>
                  <div>
                    <div className="font-semibold text-slate-500">Payment Method</div>
                    <div className="text-primary font-medium">{payInfo.label}</div>
                  </div>
                </div>

                 <div className="flex items-start gap-2.5 text-sm">
                  <div className="text-slate-400 mt-0.5 flex-shrink-0 font-bold text-sm">BDT</div>
                  <div className="flex-grow">
                    <div className="font-semibold text-slate-500">Total Budget</div>
                    {isEditingBudget ? (
                      <div className="flex items-center gap-2 mt-1">
                        <input
                          type="number"
                          value={newBudget}
                          onChange={(e) => setNewBudget(e.target.value)}
                          className="px-2 py-1 text-sm border border-slate-300 rounded focus:outline-none focus:border-accent w-24"
                          disabled={updatingBudget}
                          placeholder={task.budget.toString()}
                        />
                        <button
                          onClick={handleUpdateBudget}
                          disabled={updatingBudget}
                          className="px-2 py-1 bg-accent text-primary text-xs font-bold rounded hover:bg-accent-hover transition-colors disabled:opacity-50"
                        >
                          {updatingBudget ? 'Saving...' : 'Save'}
                        </button>
                        <button
                          onClick={() => setIsEditingBudget(false)}
                          disabled={updatingBudget}
                          className="px-2 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-primary font-bold text-lg">{task.budget.toLocaleString()} BDT</span>
                        {task.status !== 'CANCELLED' && task.status !== 'COMPLETED' && !task.budgetChangedByPoster && (
                          <button
                            onClick={() => {
                              setNewBudget(task.budget.toString());
                              setIsEditingBudget(true);
                            }}
                            className="text-xs text-accent hover:underline font-bold"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    )}
                    {task.budgetChangedByPoster && (
                      <div className="text-[10px] text-slate-400 mt-0.5 italic">Budget edited once (limit reached)</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Seeker details if assigned */}
            {task.seekerName && (
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-2 mt-4">
                <h4 className="font-bold text-xs text-slate-400 uppercase tracking-wider">Assigned Task Seeker</h4>
                <div className="flex justify-between items-center text-sm">
                  <div>
                    <div className="font-bold text-primary">{task.seekerName}</div>
                    <div className="text-xs text-slate-500">{task.seekerPhone}</div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Seeker Location Tracking Panel — only when a seeker is assigned */}
          {task.seekerId && task.status !== 'OPEN' && task.status !== 'CANCELLED' && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-primary text-base flex items-center gap-2">
                    <Navigation size={18} className="text-accent" /> Seeker Location
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {seekerCoords
                      ? isLocationLive()
                        ? 'Live tracking active'
                        : 'Last known location'
                      : 'Awaiting seeker GPS signal'}
                  </p>
                </div>
                {seekerCoords && (
                  <span className={`flex items-center gap-1.5 text-xs font-bold px-2 py-1 rounded-full ${
                    isLocationLive() ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                  }`}>
                    <span className={`w-2 h-2 rounded-full ${
                      isLocationLive() ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
                    }`} />
                    {isLocationLive() ? 'Live' : 'Offline'}
                  </span>
                )}
              </div>

              {loadingCoords && !seekerCoords && (
                <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl text-slate-400 text-xs gap-2">
                  <Loader2 className="animate-spin text-accent" size={16} />
                  Connecting to GPS service...
                </div>
              )}

              {!loadingCoords && coordsError && !seekerCoords && (
                <div className="flex flex-col items-center gap-2 p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center">
                  <AlertTriangle size={28} className="text-amber-400" />
                  <p className="text-xs font-semibold text-slate-600">{coordsError}</p>
                  <button
                    onClick={() => task.seekerId && fetchSeekerGPS(task.seekerId)}
                    className="mt-1 px-3 py-1.5 text-xs font-bold text-primary bg-accent hover:bg-accent-hover rounded-lg transition-colors"
                  >
                    Retry
                  </button>
                </div>
              )}

              {seekerCoords && (
                <div className="space-y-3">
                  <div className="h-[280px] relative overflow-hidden rounded-xl border border-slate-100">
                    <TrackingMap
                      latitude={seekerCoords.latitude}
                      longitude={seekerCoords.longitude}
                      seekerName={task.seekerName || 'Seeker'}
                    />
                  </div>
                  <div className="text-[11px] text-slate-400 text-right">
                    Last updated: {new Date(seekerCoords.recordedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right 1 Column: Vertical Progress Bar */}
        <div className="lg:col-span-1">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
            <div>
              <h3 className="font-bold text-primary text-base">Tracking Status</h3>
              <p className="text-xs text-slate-400 mt-0.5">Updated by TaskBridge Administration</p>
            </div>

            {task.status === 'OPEN' ? (
              <div className="p-4 text-center border border-dashed border-slate-200 rounded-xl text-xs text-slate-400">
                Waiting for a seeker to accept this task.
              </div>
            ) : task.status === 'CANCELLED' ? (
              <div className="p-4 text-center border border-dashed border-red-200 rounded-xl text-xs text-red-500 bg-red-50 font-semibold">
                This task has been cancelled.
              </div>
            ) : (
              <div className="pt-2">
                <ProgressBar currentStep={task.progressStep} role="POSTER" isVertical={true} />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
