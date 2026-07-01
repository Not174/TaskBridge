'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, MapPin, X, Loader2, AlertTriangle, ChevronRight, CreditCard, Building2, Banknote } from 'lucide-react';
import TrackingMap from '@/components/TrackingMap';
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
  seekerId: string | null;
  seekerName: string | null;
  seekerPhone: string | null;
}

const PAYMENT_LABELS: Record<string, { label: string; icon: React.ReactNode }> = {
  ONLINE_PAYMENT: { label: 'Online', icon: <CreditCard size={12} /> },
  BANK_TRANSFER: { label: 'Bank', icon: <Building2 size={12} /> },
  CASH_ON_HAND: { label: 'Cash', icon: <Banknote size={12} /> },
};

export default function MyTasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [advancingId, setAdvancingId] = useState<string | null>(null);

  // Tracking Modal State
  const [trackingTask, setTrackingTask] = useState<Task | null>(null);
  const [seekerCoords, setSeekerCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loadingCoords, setLoadingCoords] = useState(false);
  const [coordsError, setCoordsError] = useState<string | null>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    fetchTasks();
  }, []);

  // Poll GPS coordinates while tracking modal is open
  useEffect(() => {
    if (trackingTask && trackingTask.seekerId) {
      fetchGPSCoordinates(trackingTask.seekerId);
      pollingRef.current = setInterval(() => {
        if (trackingTask.seekerId) {
          fetchGPSCoordinates(trackingTask.seekerId, true);
        }
      }, 30000);
    } else {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
        pollingRef.current = null;
      }
      setSeekerCoords(null);
      setCoordsError(null);
    }

    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current);
      }
    };
  }, [trackingTask]);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/tasks');
      if (!res.ok) throw new Error('Failed to fetch posted tasks.');
      const data = await res.json();
      setTasksList(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const fetchGPSCoordinates = async (seekerId: string, isSilent = false) => {
    if (!isSilent) setLoadingCoords(true);
    setCoordsError(null);
    try {
      const res = await fetch(`/api/gps?seekerId=${encodeURIComponent(seekerId)}`);
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 404) {
          throw new Error('Waiting for Seeker to enable location sharing.');
        }
        throw new Error(data.error || 'Failed to fetch tracking data.');
      }
      if (data.log) {
        setSeekerCoords({ latitude: data.log.latitude, longitude: data.log.longitude });
      }
    } catch (err: any) {
      setCoordsError(err.message || 'GPS offline.');
    } finally {
      if (!isSilent) setLoadingCoords(false);
    }
  };

  const handleAdvanceStep = async (taskId: string) => {
    setAdvancingId(taskId);
    setError(null);
    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADVANCE_STEP' }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to advance step.');
      // Update local state
      setTasksList((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, progressStep: result.task.progressStep, status: result.task.status } : t))
      );
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
      case 'OPEN':
        return <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">Open</span>;
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

  if (loading) {
    return (
      <div className="flex-grow flex items-center justify-center min-h-[500px]">
        <Loader2 className="animate-spin text-accent" size={32} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      
      {/* Back Button */}
      <div>
        <Link
          href="/poster/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>
      </div>

      {/* Page Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <Briefcase size={28} /> My Tasks
        </h1>
        <p className="text-slate-500 mt-1">Review all your posted gigs, track progress, and manage assignments</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Tasks Cards */}
      {tasksList.length === 0 ? (
        <div className="bg-white p-16 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm">
          <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="font-bold text-lg text-primary">No tasks found</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">You have not posted any tasks yet. Create one to find local seekers.</p>
          <Link
            href="/poster/post-task"
            className="mt-6 inline-flex items-center justify-center py-2.5 px-5 text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors"
          >
            Post a Task
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tasksList.map((task) => {
            const payInfo = PAYMENT_LABELS[task.paymentMethod] || PAYMENT_LABELS['CASH_ON_HAND'];
            const stepLabel = {
              POSTED: 'Application Posted',
              REVIEWING: 'Application Reviewing',
              ACCEPTED: 'Application Accepted',
              CONTACT_COORDINATION: 'Contact & Coordination',
              WORK_IN_PROGRESS: 'Work in Progress',
              TASK_COMPLETED: 'Completed',
              PAYMENT_PROCESSING: 'Payment Processing',
              FINISHED: 'Finished',
              FEEDBACK: 'Feedback',
            }[task.progressStep] || task.progressStep;

            return (
              <div key={task.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                {/* Header Row */}
                <div className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-3">
                  <div className="space-y-1 flex-grow">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/poster/my-tasks/${encodeURIComponent(task.id)}`}>
                        <h3 className="font-bold text-primary text-lg hover:text-accent hover:underline cursor-pointer">{task.title}</h3>
                      </Link>
                      {getStatusBadge(task.status)}
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-600 border border-slate-200">
                        {payInfo.icon} {payInfo.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {task.category} • <MapPin size={12} className="inline" /> {task.location} • Budget: <span className="font-bold text-primary">{task.budget.toLocaleString()} BDT</span> • Deadline: {formatDate(task.deadline)}
                    </p>
                    {task.seekerName && (
                      <p className="text-xs text-slate-500">
                        Assigned: <strong className="text-primary">{task.seekerName}</strong> ({task.seekerPhone})
                      </p>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex gap-2 flex-shrink-0">
                    {task.status === 'IN_PROGRESS' && task.seekerId && (
                      <button
                        onClick={() => setTrackingTask(task)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover text-xs font-bold rounded-lg transition-colors shadow-sm"
                      >
                        <MapPin size={12} className="text-accent" /> Track
                      </button>
                    )}
                    <Link
                      href={`/poster/my-tasks/${encodeURIComponent(task.id)}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition-colors shadow-sm"
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

      {/* --- TRACKING MODAL PANEL --- */}
      {trackingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
              <div>
                <h3 className="font-bold text-lg text-primary flex items-center gap-2">
                  <MapPin className="text-accent" size={20} /> Seeker Tracking
                </h3>
                <p className="text-xs text-slate-500 mt-0.5 truncate max-w-md">Task: {trackingTask.title}</p>
              </div>
              <button
                onClick={() => setTrackingTask(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all focus:outline-none"
              >
                <X size={20} />
              </button>
            </div>
            <div className="p-5 flex-grow overflow-y-auto space-y-4 flex flex-col min-h-[350px]">
              {loadingCoords && !seekerCoords && (
                <div className="flex-grow flex flex-col items-center justify-center text-slate-400 gap-2">
                  <Loader2 className="animate-spin text-accent" size={32} />
                  <span className="text-sm">Contacting tracking server...</span>
                </div>
              )}
              {coordsError && (
                <div className="flex-grow flex flex-col items-center justify-center text-center p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <AlertTriangle size={36} className="text-amber-500 mb-2" />
                  <p className="font-semibold text-primary">{coordsError}</p>
                  <button
                    onClick={() => trackingTask.seekerId && fetchGPSCoordinates(trackingTask.seekerId)}
                    className="mt-4 px-4 py-2 text-xs font-bold text-primary bg-accent hover:bg-accent-hover rounded-lg transition-colors"
                  >
                    Retry Connection
                  </button>
                </div>
              )}
              {seekerCoords && (
                <div className="flex-grow min-h-[350px] relative">
                  <TrackingMap
                    latitude={seekerCoords.latitude}
                    longitude={seekerCoords.longitude}
                    seekerName={trackingTask.seekerName || 'Seeker'}
                  />
                </div>
              )}
            </div>
            {seekerCoords && (
              <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-500 flex justify-between items-center">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  Polling active (updates every 30 seconds)
                </span>
                <span className="font-semibold text-slate-600">
                  Lat: {seekerCoords.latitude.toFixed(5)}, Lng: {seekerCoords.longitude.toFixed(5)}
                </span>
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  );
}
