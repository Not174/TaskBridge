'use client';

import { Check } from 'lucide-react';

const POSTER_STEPS = [
  'Application Accepted',
  'Contact & Coordination',
  'Work in Progress',
  'Completed',
  'Payment Processing',
  'Finished',
  'Feedback',
];

const SEEKER_STEPS = [
  'Assignment Accepted',
  'Review Details',
  'Contact the Applicant',
  'Work in Progress',
  'Task Completed',
  'Payment Processing',
  'Task Finished',
  'Feedback',
];

// Maps DB enum values to step index
const STEP_DB_MAP: Record<string, number> = {
  POSTED: 0,
  REVIEWING: 0,
  ACCEPTED: 0,
  CONTACT_COORDINATION: 1,
  WORK_IN_PROGRESS: 2,
  TASK_COMPLETED: 3,
  PAYMENT_PROCESSING: 4,
  FINISHED: 5,
  FEEDBACK: 6,
};

// For seeker, the DB steps map differently (seeker has 8 steps, offset from index 0)
const SEEKER_STEP_DB_MAP: Record<string, number> = {
  POSTED: 0,        // accepted
  REVIEWING: 1,     // review details
  ACCEPTED: 1,
  CONTACT_COORDINATION: 2,
  WORK_IN_PROGRESS: 3,
  TASK_COMPLETED: 4,
  PAYMENT_PROCESSING: 5,
  FINISHED: 6,
  FEEDBACK: 7,
};

interface ProgressBarProps {
  currentStep: string;
  role: 'POSTER' | 'SEEKER';
  isVertical?: boolean;
}

export default function ProgressBar({ currentStep, role, isVertical = false }: ProgressBarProps) {
  const steps = role === 'POSTER' ? POSTER_STEPS : SEEKER_STEPS;
  const stepMap = role === 'POSTER' ? STEP_DB_MAP : SEEKER_STEP_DB_MAP;
  const currentIndex = stepMap[currentStep] ?? 0;

  if (isVertical) {
    return (
      <div className="relative flex flex-col space-y-6">
        {/* Connecting line */}
        <div className="absolute left-4 top-4 bottom-4 w-0.5 bg-slate-100 -translate-x-1/2" />
        <div
          className="absolute left-4 top-4 w-0.5 bg-emerald-500 transition-all duration-500 -translate-x-1/2"
          style={{
            height: `calc(${Math.min(currentIndex / (steps.length - 1), 1) * 100}% - 1rem)`,
          }}
        />

        {steps.map((label, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={i} className="flex items-center gap-4 relative z-10">
              {/* Circle container (center is 16px/left-4) */}
              <div className="w-8 flex justify-center flex-shrink-0">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                    ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                    ${isCurrent ? 'bg-amber-400 border-amber-500 text-primary animate-pulse shadow-md shadow-amber-200' : ''}
                    ${isFuture ? 'bg-white border-slate-300 text-slate-400' : ''}
                  `}
                >
                  {isCompleted ? <Check size={14} strokeWidth={3} /> : i + 1}
                </div>
              </div>

              {/* Label Info */}
              <div className="flex flex-col">
                <span
                  className={`text-sm font-semibold transition-colors
                    ${isCompleted ? 'text-emerald-700' : ''}
                    ${isCurrent ? 'text-amber-600 font-bold' : ''}
                    ${isFuture ? 'text-slate-400 font-normal' : ''}
                  `}
                >
                  {label}
                </span>
                {isCurrent && (
                  <span className="text-[10px] text-amber-500 font-medium">
                    Current stage
                  </span>
                )}
                {isCompleted && (
                  <span className="text-[10px] text-emerald-600 font-medium">
                    Completed
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="w-full py-4">
      {/* Desktop: horizontal */}
      <div className="hidden sm:flex items-start justify-between relative">
        {/* Connecting line */}
        <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200" style={{ marginLeft: '1rem', marginRight: '1rem' }} />
        <div
          className="absolute top-4 left-0 h-0.5 bg-amber-400 transition-all duration-500"
          style={{
            marginLeft: '1rem',
            width: `calc(${Math.min(currentIndex / (steps.length - 1), 1) * 100}% - 2rem)`,
          }}
        />

        {steps.map((label, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={i} className="flex flex-col items-center z-10 flex-1 min-w-0">
              {/* Circle */}
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300
                  ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                  ${isCurrent ? 'bg-amber-400 border-amber-500 text-primary animate-pulse shadow-md shadow-amber-200' : ''}
                  ${isFuture ? 'bg-white border-slate-300 text-slate-400' : ''}
                `}
              >
                {isCompleted ? <Check size={14} strokeWidth={3} /> : i + 1}
              </div>
              {/* Label */}
              <span
                className={`mt-2 text-[9px] leading-tight text-center max-w-[72px] font-semibold transition-colors
                  ${isCompleted ? 'text-emerald-600' : ''}
                  ${isCurrent ? 'text-amber-600' : ''}
                  ${isFuture ? 'text-slate-400' : ''}
                `}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Mobile: vertical compact */}
      <div className="sm:hidden space-y-1">
        {steps.map((label, i) => {
          const isCompleted = i < currentIndex;
          const isCurrent = i === currentIndex;
          const isFuture = i > currentIndex;

          return (
            <div key={i} className="flex items-center gap-3">
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border-2 flex-shrink-0 transition-all
                  ${isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : ''}
                  ${isCurrent ? 'bg-amber-400 border-amber-500 text-primary animate-pulse' : ''}
                  ${isFuture ? 'bg-white border-slate-300 text-slate-400' : ''}
                `}
              >
                {isCompleted ? <Check size={10} strokeWidth={3} /> : i + 1}
              </div>
              <span
                className={`text-xs font-medium
                  ${isCompleted ? 'text-emerald-600' : ''}
                  ${isCurrent ? 'text-amber-600 font-bold' : ''}
                  ${isFuture ? 'text-slate-400' : ''}
                `}
              >
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
