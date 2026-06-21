'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { Phone, Lock, Loader2, ArrowRight, Shield } from 'lucide-react';

const loginSchema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/, {
    message: 'Invalid Bangladeshi phone number. Must match format 01XXXXXXXXX.',
  }),
  password: z.string().min(1, { message: 'Password is required.' }),
});

type LoginInputs = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginInputs) => {
    setLoading(true);
    setErrorMsg(null);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Login failed. Please check your credentials.');
      }

      // Check role and redirect
      const role = result.user.role;
      if (role === 'POSTER') {
        router.push('/poster/dashboard');
      } else if (role === 'SEEKER') {
        router.push('/seeker/jobs');
      } else if (role === 'ADMIN') {
        // Just in case an admin logs in here, direct to admin
        router.push('/admin/dashboard');
      }

      // Refresh layout to update navbar session
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
          <h2 className="text-3xl font-extrabold text-primary">Welcome Back</h2>
          <p className="text-sm text-slate-500">Sign in to your TaskBridge account</p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            
            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1">
                Mobile Number
              </label>
              <div className="relative rounded-lg shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  id="phone"
                  type="text"
                  placeholder="e.g. 01XXXXXXXXX"
                  {...register('phone')}
                  className="block w-full pl-10 pr-3 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder-slate-400 transition-all"
                />
              </div>
              {errors.phone && (
                <p className="mt-1 text-xs text-red-500">{errors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700">
                  Password
                </label>
              </div>
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
            className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
          >
            {loading ? <Loader2 className="animate-spin" size={18} /> : 'Sign In'}
            {!loading && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="space-y-4 pt-4 border-t border-slate-100 text-center">
          <p className="text-sm text-slate-500">
            Don't have an account?{' '}
            <Link href="/signup" className="font-bold text-accent hover:underline">
              Sign Up
            </Link>
          </p>

          <Link
            href="/admin/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 font-medium transition-colors"
          >
            <Shield size={12} /> Login as Administrator
          </Link>
        </div>

      </div>
    </div>
  );
}
