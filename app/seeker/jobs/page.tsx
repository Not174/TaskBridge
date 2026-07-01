'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Briefcase, MapPin, Calendar, Star, DollarSign, Search, Filter, Loader2, CheckCircle2 } from 'lucide-react';

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
  hasApplied?: boolean;
}

const CATEGORIES = [
  'All',
  'Cleaning',
  'Delivery & Courier',
  'Home Repair',
  'Electrical Work',
  'Plumbing',
  'Painting',
  'Appliance Repair',
  'Gardening & Landscaping',
  'IT Support & Tech',
  'Other',
];

export default function SeekerJobBoard() {
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [locationQuery, setLocationQuery] = useState('');
  const [minBudget, setMinBudget] = useState('');
  const [maxBudget, setMaxBudget] = useState('');

  // Action states
  const [acceptingTaskId, setAcceptingTaskId] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchOpenTasks();
  }, [selectedCategory]);

  const fetchOpenTasks = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedCategory && selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }
      if (locationQuery.trim()) {
        params.append('location', locationQuery.trim());
      }
      if (minBudget) {
        params.append('minBudget', minBudget);
      }
      if (maxBudget) {
        params.append('maxBudget', maxBudget);
      }

      const res = await fetch(`/api/tasks?${params.toString()}`);
      if (!res.ok) throw new Error('Failed to fetch jobs.');
      const data = await res.json();
      setTasks(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  const handleFilterSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOpenTasks();
  };

  const handleClearFilters = () => {
    setSelectedCategory('All');
    setLocationQuery('');
    setMinBudget('');
    setMaxBudget('');
    // Delay slightly to allow states to clear
    setTimeout(() => {
      router.refresh();
    }, 100);
  };

  const handleAcceptTask = async (taskId: string) => {
    setAcceptingTaskId(taskId);
    setError(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`/api/tasks/${encodeURIComponent(taskId)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'APPLY' }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to submit application.');
      }

      setSuccessMsg('Application submitted successfully! Wait for administration review and assignment.');

      // Mark as applied in local state
      setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, hasApplied: true } : t)));

      // Auto-dismiss success alert
      setTimeout(() => {
        setSuccessMsg(null);
      }, 5000);
    } catch (err: any) {
      setError(err.message || 'An error occurred while applying.');
    } finally {
      setAcceptingTaskId(null);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">

      {/* Title Header */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <Briefcase size={28} /> Job Board
        </h1>
        <p className="text-slate-500 mt-1">Browse available gig-works, apply your skills, and earn money</p>
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

      {/* Filter Toolbar */}
      <form onSubmit={handleFilterSearch} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 mb-2">
          <Filter size={16} className="text-slate-400" />
          <span className="font-bold text-sm text-primary uppercase tracking-wider">Search Filters</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Category Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Category</label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent bg-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Location input */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Location / Area</label>
            <input
              type="text"
              placeholder="e.g. Dhanmondi, Dhaka"
              value={locationQuery}
              onChange={(e) => setLocationQuery(e.target.value)}
              className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          {/* Min Budget */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Min Budget (BDT)</label>
            <input
              type="number"
              placeholder="e.g. 500"
              value={minBudget}
              onChange={(e) => setMinBudget(e.target.value)}
              className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>

          {/* Max Budget */}
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Max Budget (BDT)</label>
            <input
              type="number"
              placeholder="e.g. 5000"
              value={maxBudget}
              onChange={(e) => setMaxBudget(e.target.value)}
              className="block w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={handleClearFilters}
            className="px-4 py-2 border border-slate-200 text-xs font-bold rounded-xl text-slate-500 hover:bg-slate-50 transition-colors"
          >
            Clear Filters
          </button>
          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-primary text-white hover:bg-primary-hover text-xs font-bold rounded-xl transition-colors shadow-sm"
          >
            <Search size={14} /> Search Gigs
          </button>
        </div>
      </form>

      {/* Jobs Grid */}
      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <Loader2 className="animate-spin text-accent" size={32} />
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white p-16 text-center text-slate-400 rounded-2xl border border-slate-100 shadow-sm">
          <Briefcase size={48} className="mx-auto text-slate-200 mb-3" />
          <p className="font-bold text-lg text-primary">No available jobs found</p>
          <p className="text-sm mt-1 max-w-sm mx-auto">Try altering your search filters or check back later for new task postings.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tasks.map((task) => {
            // Generate deterministic mock stats for ratings
            const mockRating = (4.3 + (task.title.charCodeAt(0) % 8) / 10).toFixed(1);
            const mockReviews = 5 + (task.title.charCodeAt(1) % 25);

            return (
              <div key={task.id} className="bg-white rounded-2xl border border-slate-100 shadow-sm flex flex-col hover:shadow-md transition-all duration-200 overflow-hidden">
                {/* Card Header Tag */}
                <div className="bg-slate-50 px-5 py-3 border-b border-slate-100 flex justify-between items-center">
                  <span className="px-2 py-0.5 rounded bg-primary/5 text-primary text-[10px] font-extrabold uppercase tracking-wider">{task.category}</span>
                  <div className="flex items-center gap-1 text-xs font-semibold text-slate-500">
                    <Star size={14} className="fill-amber-400 text-amber-400" />
                    <span>{mockRating}</span>
                    <span className="text-slate-400">({mockReviews})</span>
                  </div>
                </div>

                {/* Card Content */}
                <div className="p-5 flex-grow space-y-4">
                  <div>
                    <h3 className="font-bold text-primary text-lg leading-snug line-clamp-1 hover:text-accent transition-colors" title={task.title}>
                      {task.title}
                    </h3>
                    <p className="text-xs text-slate-400 mt-1">Posted by: {task.posterName || 'Verified Client'}</p>
                  </div>

                  <p className="text-sm text-slate-500 line-clamp-3 leading-relaxed">
                    {task.description}
                  </p>

                  <div className="space-y-2 pt-2 border-t border-slate-50 text-xs text-slate-500">
                    <div className="flex items-center gap-2">
                      <MapPin size={14} className="text-slate-400" />
                      <span>{task.location}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Calendar size={14} className="text-slate-400" />
                      <span>Deadline: {formatDate(task.deadline)}</span>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="px-5 py-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold">Budget</span>
                    <span className="text-lg font-black text-primary">{task.budget.toLocaleString()} BDT</span>
                  </div>

                  <button
                    onClick={() => !task.hasApplied && handleAcceptTask(task.id)}
                    disabled={acceptingTaskId !== null || task.hasApplied}
                    className={`px-4 py-2 font-bold text-xs rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-1 ${
                      task.hasApplied
                        ? 'bg-slate-200 text-slate-500 cursor-not-allowed shadow-none border border-slate-300/30'
                        : 'bg-accent hover:bg-accent-hover text-primary hover:shadow-md'
                    }`}
                  >
                    {acceptingTaskId === task.id ? (
                      <>
                        <Loader2 className="animate-spin" size={12} />
                        Applying...
                      </>
                    ) : task.hasApplied ? (
                      'Applied'
                    ) : (
                      'Apply for Task'
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
