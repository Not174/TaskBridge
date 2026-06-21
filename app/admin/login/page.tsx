'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Mail, Lock, Loader2, ShieldCheck, ArrowRight } from 'lucide-react';

const adminLoginSchema = z.object({
  email: z.string().email({ message: 'Invalid email address format.' }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type AdminLoginInputs = z.infer<typeof adminLoginSchema>;

export default function AdminLoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AdminLoginInputs>({
    resolver: zodResolver(adminLoginSchema),
  });

  const onSubmit = async (data: AdminLoginInputs) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data), // Sends email instead of phone
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Authentication failed. Please check your credentials.');
      }

      router.push('/admin/dashboard');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-100">
        
        <div className="text-center space-y-2">
          <div className="mx-auto h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ShieldCheck size={28} className="text-primary" />
          </div>
          <h2 className="text-3xl font-extrabold text-primary">Admin Control Panel</h2>
          <p className="text-sm text-slate-500 font-medium">Authentication required for administrative tools</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            
            {/* Email Address */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
                Admin Email Address
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="text"
                  placeholder="admin@taskbridge.com"
                  {...register('email')}
                  className="block w-full pl-10 pr-3 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder-slate-400 transition-all"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  {...register('password')}
                  className="block w-full pl-10 pr-3 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder-slate-400 transition-all"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>
              )}
            </div>

          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-white bg-primary hover:bg-primary-hover transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Authenticate'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="text-center pt-4 border-t border-slate-100">
          <Link href="/login" className="text-xs text-slate-400 hover:text-slate-600 font-semibold transition-colors">
            Return to User Login
          </Link>
        </div>

      </div>
    </div>
  );
}
