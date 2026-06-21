'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import Link from 'next/link';
import { ShieldCheck, Phone, UserCheck, Key, Lock, ArrowRight, Loader2, RefreshCw } from 'lucide-react';

// --- ZOD SCHEMAS ---
const step1Schema = z.object({
  phone: z.string().regex(/^01[3-9]\d{8}$/, {
    message: 'Invalid Bangladeshi phone number. Must match format 01XXXXXXXXX.',
  }),
  role: z.enum(['POSTER', 'SEEKER']),
});

const step3Schema = z.object({
  password: z.string().min(8, { message: 'Password must be at least 8 characters long.' }),
  confirmPassword: z.string().min(8, { message: 'Confirm password must be at least 8 characters long.' }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Passwords do not match.',
  path: ['confirmPassword'],
});

type Step1Input = z.infer<typeof step1Schema>;
type Step3Input = z.infer<typeof step3Schema>;

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') as 'POSTER' | 'SEEKER' | null;

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Registration state
  const [registeredPhone, setRegisteredPhone] = useState('');
  const [registeredRole, setRegisteredRole] = useState<'POSTER' | 'SEEKER'>('POSTER');
  const [tempToken, setTempToken] = useState('');
  
  // OTP code digits
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpTimer, setOtpTimer] = useState(300); // 5 minutes countdown
  
  // Mock OTP indicator for testing
  const [mockOtpShow, setMockOtpShow] = useState<string | null>(null);

  // --- REACT HOOK FORMS ---
  const {
    register: registerStep1,
    handleSubmit: handleSubmitStep1,
    formState: { errors: errorsStep1 },
    setValue: setValueStep1,
  } = useForm<Step1Input>({
    resolver: zodResolver(step1Schema),
    defaultValues: {
      role: initialRole || 'POSTER',
    },
  });

  const {
    register: registerStep3,
    handleSubmit: handleSubmitStep3,
    formState: { errors: errorsStep3 },
  } = useForm<Step3Input>({
    resolver: zodResolver(step3Schema),
  });

  // Pre-fill role if passed in query param
  useEffect(() => {
    if (initialRole) {
      setValueStep1('role', initialRole);
    }
  }, [initialRole, setValueStep1]);

  // Countdown timer for OTP
  useEffect(() => {
    if (step !== 2) return;
    const interval = setInterval(() => {
      setOtpTimer((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(interval);
  }, [step]);

  const formatTimer = () => {
    const mins = Math.floor(otpTimer / 60);
    const secs = otpTimer % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // --- OTP AUTO-FOCUS DIGITS HANDLERS ---
  const handleOtpChange = (value: string, index: number) => {
    if (isNaN(Number(value))) return;
    const newDigits = [...otpDigits];
    // Keep only last char (for copy paste or fast typing)
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);

    // Auto-focus next input
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
        // Clear previous digit and focus it
        const newDigits = [...otpDigits];
        newDigits[index - 1] = '';
        setOtpDigits(newDigits);
        otpRefs.current[index - 1]?.focus();
      } else {
        const newDigits = [...otpDigits];
        newDigits[index] = '';
        setOtpDigits(newDigits);
      }
    }
  };

  const handleOtpPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pasteData)) return;

    const newDigits = Array(6).fill('');
    for (let i = 0; i < pasteData.length; i++) {
      newDigits[i] = pasteData[i];
    }
    setOtpDigits(newDigits);
    
    // Focus last filled or next input
    const focusIndex = Math.min(pasteData.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  // --- API CALLS ---
  
  // Step 1: Send OTP
  const onStep1Submit = async (data: Step1Input) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Failed to send OTP.');
      }

      setRegisteredPhone(data.phone);
      setRegisteredRole(data.role);
      
      // In mock SMS mode, we display the OTP inside a toast so the developer doesn't need terminal access.
      if (result.otp) {
        setMockOtpShow(result.otp);
      }
      
      setOtpTimer(300); // reset 5 minutes
      setStep(2);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP helper
  const handleResendOtp = async () => {
    setErrorMsg(null);
    setMockOtpShow(null);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: registeredPhone, role: registeredRole }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to resend OTP.');
      
      if (result.otp) {
        setMockOtpShow(result.otp);
      }
      setOtpTimer(300);
      setOtpDigits(Array(6).fill(''));
      otpRefs.current[0]?.focus();
    } catch (err: any) {
      setErrorMsg(err.message || 'Resend failed.');
    }
  };

  // Step 2: Verify OTP
  const onVerifyOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the OTP.');
      return;
    }

    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: registeredPhone,
          otpCode: fullOtp,
          role: registeredRole,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'OTP verification failed.');
      }

      setTempToken(result.tempToken);
      setMockOtpShow(null);
      setStep(3);
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete registration and save password
  const onStep3Submit = async (data: Step3Input) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tempToken,
          password: data.password,
          confirmPassword: data.confirmPassword,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || 'Signup failed.');
      }

      // Successful signup. Redirect based on role
      router.push(registeredRole === 'POSTER' ? '/poster/dashboard' : '/seeker/jobs');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-8 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-100 relative overflow-hidden">
        
        {/* Step Indicator bar */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-slate-100 flex">
          <div className={`h-full bg-accent transition-all duration-300 ${step === 1 ? 'w-1/3' : step === 2 ? 'w-2/3' : 'w-full'}`}></div>
        </div>

        {/* Mock OTP Toast for developer testing */}
        {mockOtpShow && (
          <div className="bg-amber-50 border-l-4 border-accent p-4 rounded-lg mb-4 text-sm text-amber-800 flex flex-col gap-1">
            <span className="font-semibold flex items-center gap-1"><ShieldCheck size={16} /> [Development Mock SMS]</span>
            <span>OTP Code generated for {registeredPhone}: <strong className="text-lg text-primary tracking-widest">{mockOtpShow}</strong></span>
          </div>
        )}

        {/* Section Header */}
        <div className="text-center space-y-2">
          <h2 className="text-3xl font-extrabold text-primary">Create Account</h2>
          <p className="text-sm text-slate-500">
            {step === 1 && 'Enter your phone number to get started'}
            {step === 2 && `Enter the 6-digit code sent to ${registeredPhone}`}
            {step === 3 && 'Set a strong password to protect your account'}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 text-red-700 p-3 rounded-lg text-sm font-medium border border-red-100">
            {errorMsg}
          </div>
        )}

        {/* --- STEP 1: PHONE & ROLE SELECTION --- */}
        {step === 1 && (
          <form onSubmit={handleSubmitStep1(onStep1Submit)} className="space-y-6">
            <div className="space-y-4">
              {/* Role Radio Grid */}
              <div>
                <label className="block text-sm font-semibold text-slate-700 mb-2">I want to:</label>
                <div className="grid grid-cols-2 gap-4">
                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      <span className="text-sm font-bold text-primary">Post Tasks</span>
                    </span>
                    <input
                      type="radio"
                      value="POSTER"
                      {...registerStep1('role')}
                      className="w-4 h-4 text-accent border-slate-300 focus:ring-accent"
                    />
                  </label>
                  <label className="flex items-center justify-between p-4 rounded-xl border border-slate-200 cursor-pointer hover:bg-slate-50 transition-colors select-none">
                    <span className="flex items-center gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-accent"></span>
                      <span className="text-sm font-bold text-primary">Find Work</span>
                    </span>
                    <input
                      type="radio"
                      value="SEEKER"
                      {...registerStep1('role')}
                      className="w-4 h-4 text-accent border-slate-300 focus:ring-accent"
                    />
                  </label>
                </div>
                {errorsStep1.role && (
                  <p className="mt-1 text-xs text-red-500">{errorsStep1.role.message}</p>
                )}
              </div>

              {/* Phone input */}
              <div>
                <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1">
                  Bangladeshi Mobile Number
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Phone size={18} />
                  </div>
                  <input
                    id="phone"
                    type="text"
                    placeholder="e.g. 017XXXXXXXX"
                    {...registerStep1('phone')}
                    className="block w-full pl-10 pr-3 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent placeholder-slate-400 transition-all"
                  />
                </div>
                {errorsStep1.phone && (
                  <p className="mt-1 text-xs text-red-500">{errorsStep1.phone.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Send OTP Code'}
              {!loading && <ArrowRight size={16} />}
            </button>
          </form>
        )}

        {/* --- STEP 2: OTP VERIFICATION --- */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">
                Enter Verification Code
              </label>
              
              {/* Digit Input Grid */}
              <div className="flex justify-between gap-2 max-w-xs mx-auto" onPaste={handleOtpPaste}>
                {otpDigits.map((digit, index) => (
                  <input
                    key={index}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    ref={(el) => { otpRefs.current[index] = el; }}
                    onChange={(e) => handleOtpChange(e.target.value, index)}
                    onKeyDown={(e) => handleOtpKeyDown(e, index)}
                    className="w-12 h-12 text-center text-xl font-bold border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                ))}
              </div>
            </div>

            {/* Countdown timer */}
            <div className="flex items-center justify-between text-xs text-slate-400 px-4">
              <span>Code expires in: <strong className="text-slate-600 font-semibold">{formatTimer()}</strong></span>
              <button
                type="button"
                onClick={handleResendOtp}
                disabled={otpTimer > 0}
                className="flex items-center gap-1 text-accent font-bold hover:underline disabled:opacity-40 disabled:hover:no-underline"
              >
                <RefreshCw size={12} /> Resend OTP
              </button>
            </div>

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => {
                  setStep(1);
                  setMockOtpShow(null);
                }}
                className="w-1/3 py-3 border border-slate-200 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={loading}
                className="w-2/3 flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify Code'}
              </button>
            </div>
          </div>
        )}

        {/* --- STEP 3: SET PASSWORD --- */}
        {step === 3 && (
          <form onSubmit={handleSubmitStep3(onStep3Submit)} className="space-y-6">
            <div className="space-y-4">
              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                  New Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    id="password"
                    type="password"
                    placeholder="Min. 8 characters"
                    {...registerStep3('password')}
                    className="block w-full pl-10 pr-3 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
                {errorsStep3.password && (
                  <p className="mt-1 text-xs text-red-500">{errorsStep3.password.message}</p>
                )}
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1">
                  Confirm Password
                </label>
                <div className="relative rounded-lg shadow-sm">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock size={18} />
                  </div>
                  <input
                    id="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    {...registerStep3('confirmPassword')}
                    className="block w-full pl-10 pr-3 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/20 focus:border-accent transition-all"
                  />
                </div>
                {errorsStep3.confirmPassword && (
                  <p className="mt-1 text-xs text-red-500">{errorsStep3.confirmPassword.message}</p>
                )}
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? <Loader2 className="animate-spin" size={18} /> : 'Complete Registration'}
            </button>
          </form>
        )}

        {/* Toggle link */}
        <div className="text-center pt-4 border-t border-slate-100">
          <p className="text-sm text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-accent hover:underline">
              Log In
            </Link>
          </p>
        </div>

      </div>
    </div>
  );
}
