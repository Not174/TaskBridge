'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { ArrowLeft, Briefcase, MapPin, X, Loader2, AlertTriangle, Play, HelpCircle } from 'lucide-react';
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
  seekerId: string | null;
  seekerName: string | null;
  seekerPhone: string | null;
}

export default function MyTasksPage() {
  const [tasksList, setTasksList] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
      // Fetch immediately
      fetchGPSCoordinates(trackingTask.seekerId);

      // Start 30s polling interval
      pollingRef.current = setInterval(() => {
        if (trackingTask.seekerId) {
          fetchGPSCoordinates(trackingTask.seekerId, true); // silent reload
        }
      }, 30000);
    } else {
      // Clear interval when closed
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
      const res = await fetch(`/api/gps?seekerId=${seekerId}`);
      const data = await res.json();

      if (!res.ok) {
        // If 404, the seeker hasn't logged coordinates yet
        if (res.status === 404) {
          throw new Error('Waiting for Seeker to enable location sharing. No coordinates recorded yet.');
        }
        throw new Error(data.error || 'Failed to fetch tracking data.');
      }

      if (data.log) {
        setSeekerCoords({
          latitude: data.log.latitude,
          longitude: data.log.longitude,
        });
      }
    } catch (err: any) {
      setCoordsError(err.message || 'GPS offline.');
    } finally {
      if (!isSilent) setLoadingCoords(false);
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
        <p className="text-slate-500 mt-1">Review all your posted gigs, check applicant assignments, and track live routes</p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium">
          {error}
        </div>
      )}

      {/* Tasks Table */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {tasksList.length === 0 ? (
          <div className="p-16 text-center text-slate-400">
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
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="px-6 py-4">Task Details</th>
                  <th className="px-6 py-4">Budget</th>
                  <th className="px-6 py-4">Deadline</th>
                  <th className="px-6 py-4">Assigned Worker</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {tasksList.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-6 py-4 max-w-xs">
                      <div className="font-bold text-primary truncate">{task.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{task.category} • {task.location}</div>
                    </td>
                    <td className="px-6 py-4 font-bold text-primary">{task.budget.toLocaleString()} BDT</td>
                    <td className="px-6 py-4 text-slate-500 whitespace-nowrap">{formatDate(task.deadline)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {task.seekerName ? (
                        <div>
                          <div className="font-semibold text-slate-700">{task.seekerName}</div>
                          <div className="text-xs text-slate-400">{task.seekerPhone}</div>
                        </div>
                      ) : (
                        <span className="text-slate-400 italic">Unassigned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">{getStatusBadge(task.status)}</td>
                    <td className="px-6 py-4 text-right whitespace-nowrap">
                      {task.status === 'IN_PROGRESS' && task.seekerId ? (
                        <button
                          onClick={() => setTrackingTask(task)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary text-white hover:bg-primary-hover text-xs font-bold rounded-lg transition-colors shadow-sm"
                        >
                          <MapPin size={12} className="text-accent" />
                          Track Seeker
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400 italic">-</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* --- TRACKING MODAL PANEL --- */}
      {trackingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white w-full max-w-2xl rounded-2xl shadow-xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
            
            {/* Modal Header */}
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

            {/* Modal Body / Map Container */}
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
                  <p className="text-xs text-slate-400 mt-1 max-w-sm">
                    Live maps will center automatically once the seeker switches on location sharing in their profile setting.
                  </p>
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

            {/* Modal Footer Info */}
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
