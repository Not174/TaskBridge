'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { FilePlus, ArrowLeft, Loader2, ClipboardPlus } from 'lucide-react';
import Link from 'next/link';

const CATEGORIES = [
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

const taskSchema = z.object({
  title: z.string().min(5, { message: 'Title must be at least 5 characters long.' }).max(100, {
    message: 'Title must be less than 100 characters.',
  }),
  category: z.string().min(1, { message: 'Please select a category.' }),
  description: z.string().min(10, { message: 'Description must be at least 10 characters long.' }),
  location: z.string().min(1, { message: 'Location is required.' }),
  budget: z.coerce.number().positive({ message: 'Budget must be a positive number.' }),
  deadline: z.string().min(1, { message: 'Please pick a deadline.' }).refine(
    (val) => new Date(val) > new Date(),
    { message: 'Deadline must be a future date.' }
  ),
});

type TaskInputs = z.infer<typeof taskSchema>;

export default function PostTaskPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(taskSchema),
  });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.ok ? await res.json() : null;

      if (!res.ok) {
        const errorResult = await res.json();
        throw new Error(errorResult.error || 'Failed to create task.');
      }

      router.push('/poster/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-6">
      
      {/* Navigation Link Back */}
      <div>
        <Link
          href="/poster/dashboard"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-primary transition-colors group"
        >
          <ArrowLeft size={16} className="group-hover:-translate-x-0.5 transition-transform" />
          Back to Dashboard
        </Link>
      </div>

      {/* Header Title */}
      <div>
        <h1 className="text-3xl font-extrabold text-primary flex items-center gap-2">
          <FilePlus size={28} /> Post a Task
        </h1>
        <p className="text-slate-500 mt-1">Describe the gig details to connect with local task seekers</p>
      </div>

      {errorMsg && (
        <div className="bg-red-50 border border-red-100 p-4 rounded-xl text-red-700 font-medium">
          {errorMsg}
        </div>
      )}

      {/* Post Task Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-100 shadow-sm space-y-6">
        
        {/* Title */}
        <div>
          <label htmlFor="title" className="block text-sm font-semibold text-slate-700 mb-1">
            Task Title
          </label>
          <input
            id="title"
            type="text"
            placeholder="e.g. Clean 3-Bedroom Apartment in Dhanmondi"
            {...register('title')}
            className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
          />
          {errors.title && (
            <p className="mt-1 text-xs text-red-500">{errors.title.message}</p>
          )}
        </div>

        {/* Category & Budget Flex Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Category */}
          <div>
            <label htmlFor="category" className="block text-sm font-semibold text-slate-700 mb-1">
              Category
            </label>
            <select
              id="category"
              {...register('category')}
              className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all bg-white"
            >
              <option value="">Select a category</option>
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
            {errors.category && (
              <p className="mt-1 text-xs text-red-500">{errors.category.message}</p>
            )}
          </div>

          {/* Budget */}
          <div>
            <label htmlFor="budget" className="block text-sm font-semibold text-slate-700 mb-1">
              Budget (BDT)
            </label>
            <input
              id="budget"
              type="number"
              placeholder="e.g. 1500"
              {...register('budget')}
              className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
            {errors.budget && (
              <p className="mt-1 text-xs text-red-500">{errors.budget.message}</p>
            )}
          </div>
        </div>

        {/* Location & Deadline Flex Row */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Location */}
          <div>
            <label htmlFor="location" className="block text-sm font-semibold text-slate-700 mb-1">
              Location / Area
            </label>
            <input
              id="location"
              type="text"
              placeholder="e.g. Dhanmondi, Dhaka"
              {...register('location')}
              className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
            {errors.location && (
              <p className="mt-1 text-xs text-red-500">{errors.location.message}</p>
            )}
          </div>

          {/* Deadline */}
          <div>
            <label htmlFor="deadline" className="block text-sm font-semibold text-slate-700 mb-1">
              Deadline Date
            </label>
            <input
              id="deadline"
              type="datetime-local"
              {...register('deadline')}
              className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
            />
            {errors.deadline && (
              <p className="mt-1 text-xs text-red-500">{errors.deadline.message}</p>
            )}
          </div>
        </div>

        {/* Description */}
        <div>
          <label htmlFor="description" className="block text-sm font-semibold text-slate-700 mb-1">
            Task Description
          </label>
          <textarea
            id="description"
            rows={5}
            placeholder="Describe the details, requirements, or tools needed for this task..."
            {...register('description')}
            className="block w-full px-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all resize-none"
          ></textarea>
          {errors.description && (
            <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* Submit button */}
        <div className="pt-4">
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : <ClipboardPlus size={18} />}
            {loading ? 'Publishing Task...' : 'Publish Task'}
          </button>
        </div>

      </form>

    </div>
  );
}
