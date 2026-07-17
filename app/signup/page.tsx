'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import {
  Mail,
  Phone,
  Lock,
  ArrowRight,
  Loader2,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  Eye,
  EyeOff,
  AlertCircle,
} from 'lucide-react';
import {
  emailStepSchema,
  registrationStepSchema,
  type EmailStepInput,
  type RegistrationStepInput,
} from '@/lib/validators/signup';

// ─── Step Indicator ──────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ['Email', 'Verify', 'Details'];
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {steps.map((label, i) => {
        const stepNum = i + 1;
        const isDone = current > stepNum;
        const isActive = current === stepNum;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 ${
                  isDone
                    ? 'bg-success text-white'
                    : isActive
                    ? 'bg-primary text-white ring-4 ring-primary/20'
                    : 'bg-slate-100 text-slate-400'
                }`}
              >
                {isDone ? <CheckCircle2 size={18} /> : stepNum}
              </div>
              <span
                className={`text-xs font-semibold transition-colors ${
                  isActive ? 'text-primary' : isDone ? 'text-success' : 'text-slate-400'
                }`}
              >
                {label}
              </span>
            </div>
            {i < steps.length - 1 && (
              <div
                className={`w-16 h-0.5 mb-4 mx-1 transition-all duration-500 ${
                  current > stepNum ? 'bg-success' : 'bg-slate-200'
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Password Strength Bar ────────────────────────────────────────────────────

function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Min. 8 characters', pass: password.length >= 8 },
    { label: 'Uppercase letter', pass: /[A-Z]/.test(password) },
    { label: 'Number', pass: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.pass).length;
  const colors = ['bg-slate-200', 'bg-error', 'bg-warning', 'bg-success'];
  const labels = ['', 'Weak', 'Fair', 'Strong'];

  if (!password) return null;

  return (
    <div className="mt-2 space-y-2">
      <div className="flex gap-1">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
              i <= score ? colors[score] : 'bg-slate-200'
            }`}
          />
        ))}
        <span className={`text-xs font-semibold ml-1 ${score === 3 ? 'text-success' : score === 2 ? 'text-warning' : 'text-error'}`}>
          {labels[score]}
        </span>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-1">
        {checks.map((c) => (
          <span key={c.label} className={`text-xs flex items-center gap-1 ${c.pass ? 'text-success' : 'text-slate-400'}`}>
            {c.pass ? '✓' : '○'} {c.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── Main Signup Page ─────────────────────────────────────────────────────────

export default function SignupPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialRole = searchParams.get('role') as 'POSTER' | 'SEEKER' | null;

  // Step state
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Registration state persisted across steps
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [registeredRole, setRegisteredRole] = useState<'POSTER' | 'SEEKER'>('POSTER');
  const [tempToken, setTempToken] = useState('');
  const [resendCount, setResendCount] = useState(0);
  const [resendLimit] = useState(3);

  // OTP digit inputs
  const [otpDigits, setOtpDigits] = useState<string[]>(Array(6).fill(''));
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [otpTimer, setOtpTimer] = useState(300); // 5 min

  // Dev mode OTP display
  const [devOtp, setDevOtp] = useState<string | null>(null);

  // Password visibility
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordValue, setPasswordValue] = useState('');

  // ─── Forms ────────────────────────────────────────────────────────────────

  const {
    register: regEmail,
    handleSubmit: handleEmailSubmit,
    formState: { errors: emailErrors },
    setValue: setEmailValue,
  } = useForm<EmailStepInput>({
    resolver: zodResolver(emailStepSchema),
    defaultValues: { role: initialRole || 'POSTER' },
  });

  const {
    register: regDetails,
    handleSubmit: handleDetailsSubmit,
    formState: { errors: detailErrors },
    watch: watchDetails,
  } = useForm<RegistrationStepInput>({
    resolver: zodResolver(registrationStepSchema),
  });

  const watchedPassword = watchDetails('password') || '';

  // Pre-fill role from query param
  useEffect(() => {
    if (initialRole) setEmailValue('role', initialRole);
  }, [initialRole, setEmailValue]);

  // Countdown timer — runs only on step 2
  useEffect(() => {
    if (step !== 2) return;
    setOtpTimer(300);
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

  // ─── OTP Input Handlers ───────────────────────────────────────────────────

  const handleOtpChange = (value: string, index: number) => {
    if (!/^\d*$/.test(value)) return;
    const newDigits = [...otpDigits];
    newDigits[index] = value.slice(-1);
    setOtpDigits(newDigits);
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
    if (e.key === 'Backspace') {
      if (!otpDigits[index] && index > 0) {
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

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (!pasteData) return;
    const newDigits = Array(6).fill('');
    for (let i = 0; i < pasteData.length; i++) newDigits[i] = pasteData[i];
    setOtpDigits(newDigits);
    const focusIndex = Math.min(pasteData.length, 5);
    otpRefs.current[focusIndex]?.focus();
  };

  // ─── API Calls ────────────────────────────────────────────────────────────

  // Step 1: Send OTP
  const onEmailSubmit = async (data: EmailStepInput) => {
    setLoading(true);
    setErrorMsg(null);
    setDevOtp(null);
    try {
      const res = await fetch('/api/auth/email-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to send verification code.');

      setRegisteredEmail(data.email);
      setRegisteredRole(data.role);
      setResendCount(result.resendCount || 1);
      if (result.otp) setDevOtp(result.otp); // dev mode
      setOtpDigits(Array(6).fill(''));
      setStep(2);
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Resend OTP
  const handleResendOtp = useCallback(async () => {
    if (resendCount >= resendLimit) return;
    setErrorMsg(null);
    setDevOtp(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/email-otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, role: registeredRole }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Failed to resend verification code.');

      setResendCount(result.resendCount || resendCount + 1);
      if (result.otp) setDevOtp(result.otp);
      setOtpDigits(Array(6).fill(''));
      setOtpTimer(300);
      setSuccessMsg('A new verification code has been sent to your email.');
      setTimeout(() => { setSuccessMsg(null); otpRefs.current[0]?.focus(); }, 2500);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Resend failed.');
    } finally {
      setLoading(false);
    }
  }, [registeredEmail, registeredRole, resendCount, resendLimit]);

  // Step 2: Verify OTP
  const onVerifyOtp = async () => {
    const fullOtp = otpDigits.join('');
    if (fullOtp.length !== 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/email-otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: registeredEmail, otpCode: fullOtp, role: registeredRole }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Verification failed.');

      setTempToken(result.tempToken);
      setDevOtp(null);
      setStep(3);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete Registration
  const onDetailsSubmit = async (data: RegistrationStepInput) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tempToken, phone: data.phone, password: data.password, confirmPassword: data.confirmPassword }),
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error || 'Registration failed.');

      router.push(registeredRole === 'POSTER' ? '/poster/dashboard' : '/seeker/jobs');
      router.refresh();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'An error occurred.');
    } finally {
      setLoading(false);
    }
  };

  // ─── Render ───────────────────────────────────────────────────────────────

  const canResend = otpTimer === 0 && resendCount < resendLimit;
  const resendBlocked = resendCount >= resendLimit;

  return (
    <div className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-md w-full space-y-6 bg-white p-8 sm:p-10 rounded-2xl shadow-sm border border-slate-100">

        {/* Page title */}
        <div className="text-center space-y-1">
          <h1 className="text-3xl font-extrabold text-primary tracking-tight">Create Account</h1>
          <p className="text-sm text-slate-500">
            {step === 1 && 'Enter your email to get started'}
            {step === 2 && (
              <span>
                Enter the code sent to{' '}
                <strong className="text-primary font-semibold">{registeredEmail}</strong>
              </span>
            )}
            {step === 3 && 'Almost there — complete your profile'}
          </p>
        </div>

        {/* Step indicator */}
        <StepIndicator current={step} />

        {/* Dev mode OTP toast */}
        {devOtp && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
            <ShieldCheck size={18} className="text-amber-600 mt-0.5 shrink-0" />
            <div className="text-sm">
              <p className="font-semibold text-amber-800">[Dev Mode] Email OTP</p>
              <p className="text-amber-700 mt-0.5">
                Code for <span className="font-medium">{registeredEmail}</span>:{' '}
                <strong className="text-2xl font-mono tracking-widest text-primary">{devOtp}</strong>
              </p>
            </div>
          </div>
        )}

        {/* Error banner */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-100 text-red-700 p-3 rounded-xl text-sm font-medium flex gap-2 items-start">
            <AlertCircle size={16} className="mt-0.5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* Success banner */}
        {successMsg && (
          <div className="bg-green-50 border border-green-100 text-green-700 p-3 rounded-xl text-sm font-medium flex gap-2 items-center">
            <CheckCircle2 size={16} className="shrink-0" />
            {successMsg}
          </div>
        )}

        {/* ── STEP 1: EMAIL + ROLE ── */}
        {step === 1 && (
          <form onSubmit={handleEmailSubmit(onEmailSubmit)} className="space-y-5">

            {/* Role selector */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">I want to:</label>
              <div className="grid grid-cols-2 gap-3">
                {(['POSTER', 'SEEKER'] as const).map((r) => (
                  <label
                    key={r}
                    className="relative flex items-center justify-between p-4 rounded-xl border-2 cursor-pointer hover:bg-slate-50 transition-all select-none border-slate-200 has-[:checked]:border-primary has-[:checked]:bg-primary/5"
                  >
                    <span className="flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${r === 'POSTER' ? 'bg-primary' : 'bg-accent'}`} />
                      <span className="text-sm font-bold text-primary">
                        {r === 'POSTER' ? 'Post Tasks' : 'Find Work'}
                      </span>
                    </span>
                    <input
                      type="radio"
                      value={r}
                      {...regEmail('role')}
                      className="w-4 h-4 text-primary border-slate-300 focus:ring-primary/30"
                    />
                  </label>
                ))}
              </div>
              {emailErrors.role && (
                <p className="mt-1 text-xs text-red-500">{emailErrors.role.message}</p>
              )}
            </div>

            {/* Email input */}
            <div>
              <label htmlFor="email" className="block text-sm font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  {...regEmail('email')}
                  className="block w-full pl-10 pr-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 transition-all"
                />
              </div>
              {emailErrors.email && (
                <p className="mt-1 text-xs text-red-500">{emailErrors.email.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>Send Verification Code <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}

        {/* ── STEP 2: OTP VERIFICATION ── */}
        {step === 2 && (
          <div className="space-y-5">

            {/* OTP digit grid */}
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-3 text-center">
                Enter 6-Digit Verification Code
              </label>
              <div
                className="flex justify-center gap-2"
                onPaste={handleOtpPaste}
              >
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
                    className={`w-12 h-14 text-center text-2xl font-bold border-2 rounded-xl focus:outline-none transition-all ${
                      digit
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'border-slate-300 focus:border-primary focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
                ))}
              </div>
            </div>

            {/* Timer + resend */}
            <div className="flex items-center justify-between text-xs px-1">
              <span className="text-slate-500">
                {otpTimer > 0 ? (
                  <>
                    Expires in:{' '}
                    <strong
                      className={`font-mono text-sm ${otpTimer < 60 ? 'text-error' : 'text-slate-700'}`}
                    >
                      {formatTimer()}
                    </strong>
                  </>
                ) : (
                  <span className="text-error font-medium">Code expired</span>
                )}
              </span>
              <div className="flex flex-col items-end gap-0.5">
                <button
                  type="button"
                  onClick={handleResendOtp}
                  disabled={!canResend || loading}
                  className="flex items-center gap-1 text-accent font-bold hover:underline disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <RefreshCw size={12} />
                  Resend Code
                </button>
                {resendBlocked ? (
                  <span className="text-error" style={{ fontSize: '10px' }}>Resend limit reached</span>
                ) : (
                  <span className="text-slate-400" style={{ fontSize: '10px' }}>
                    {resendLimit - resendCount} resend(s) left
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => { setStep(1); setDevOtp(null); setErrorMsg(null); }}
                className="w-1/3 py-3 border-2 border-slate-200 text-sm font-bold rounded-xl text-slate-600 hover:bg-slate-50 transition-colors"
              >
                Back
              </button>
              <button
                type="button"
                onClick={onVerifyOtp}
                disabled={loading || otpDigits.join('').length !== 6}
                className="w-2/3 flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
              >
                {loading ? <Loader2 className="animate-spin" size={18} /> : 'Verify Code'}
                {!loading && <ArrowRight size={16} />}
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: PHONE + PASSWORD ── */}
        {step === 3 && (
          <form onSubmit={handleDetailsSubmit(onDetailsSubmit)} className="space-y-5">

            {/* Email verified badge */}
            <div className="flex items-center gap-2 bg-green-50 border border-green-100 rounded-xl px-4 py-3">
              <CheckCircle2 size={18} className="text-success shrink-0" />
              <div>
                <p className="text-xs text-slate-500">Verified email</p>
                <p className="text-sm font-semibold text-primary">{registeredEmail}</p>
              </div>
            </div>

            {/* Phone Number */}
            <div>
              <label htmlFor="phone" className="block text-sm font-semibold text-slate-700 mb-1">
                Bangladeshi Mobile Number
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Phone size={18} />
                </div>
                <input
                  id="phone"
                  type="tel"
                  autoComplete="tel"
                  placeholder="e.g. 017XXXXXXXX"
                  {...regDetails('phone')}
                  className="block w-full pl-10 pr-4 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 transition-all"
                />
              </div>
              {detailErrors.phone && (
                <p className="mt-1 text-xs text-red-500">{detailErrors.phone.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-semibold text-slate-700 mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Min. 8 characters"
                  {...regDetails('password', {
                    onChange: (e) => setPasswordValue(e.target.value),
                  })}
                  className="block w-full pl-10 pr-10 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label="Toggle password visibility"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {detailErrors.password && (
                <p className="mt-1 text-xs text-red-500">{detailErrors.password.message}</p>
              )}
              <PasswordStrength password={watchedPassword || passwordValue} />
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-semibold text-slate-700 mb-1">
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={18} />
                </div>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  placeholder="Re-enter your password"
                  {...regDetails('confirmPassword')}
                  className="block w-full pl-10 pr-10 py-3 text-base border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary placeholder-slate-400 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600"
                  tabIndex={-1}
                  aria-label="Toggle confirm password visibility"
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
              {detailErrors.confirmPassword && (
                <p className="mt-1 text-xs text-red-500">{detailErrors.confirmPassword.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 text-sm font-bold rounded-xl text-primary bg-accent hover:bg-accent-hover transition-colors shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={18} />
              ) : (
                <>Complete Registration <ArrowRight size={16} /></>
              )}
            </button>
          </form>
        )}

        {/* Footer link */}
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
