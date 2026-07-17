import * as z from 'zod';

// ─── Step 1: Email & Role ────────────────────────────────────────────────────

export const emailStepSchema = z.object({
  email: z
    .string()
    .min(1, { message: 'Email address is required.' })
    .email({ message: 'Please enter a valid email address.' })
    .max(254, { message: 'Email address is too long.' }),
  role: z.enum(['POSTER', 'SEEKER'], {
    message: 'Please select a role (Post Tasks or Find Work).',
  }),
});

export type EmailStepInput = z.infer<typeof emailStepSchema>;

// ─── Step 2: OTP Code ────────────────────────────────────────────────────────

export const otpStepSchema = z.object({
  otpCode: z
    .string()
    .length(6, { message: 'Please enter all 6 digits.' })
    .regex(/^\d{6}$/, { message: 'OTP must be 6 numeric digits.' }),
});

export type OtpStepInput = z.infer<typeof otpStepSchema>;

// ─── Step 3: Phone & Password ────────────────────────────────────────────────

export const registrationStepSchema = z
  .object({
    phone: z
      .string()
      .min(1, { message: 'Phone number is required.' })
      .regex(/^01[3-9]\d{8}$/, {
        message: 'Invalid Bangladeshi phone number. Must match format 01XXXXXXXXX.',
      }),
    password: z
      .string()
      .min(8, { message: 'Password must be at least 8 characters long.' })
      .regex(/[A-Z]/, { message: 'Password must contain at least one uppercase letter.' })
      .regex(/[0-9]/, { message: 'Password must contain at least one number.' }),
    confirmPassword: z
      .string()
      .min(1, { message: 'Please confirm your password.' }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match.',
    path: ['confirmPassword'],
  });

export type RegistrationStepInput = z.infer<typeof registrationStepSchema>;

// ─── Server-side: Send OTP Request ──────────────────────────────────────────

export const sendOtpRequestSchema = z.object({
  email: z.string().email(),
  role: z.enum(['POSTER', 'SEEKER']),
});

// ─── Server-side: Verify OTP Request ─────────────────────────────────────────

export const verifyOtpRequestSchema = z.object({
  email: z.string().email(),
  otpCode: z.string().length(6).regex(/^\d{6}$/),
  role: z.enum(['POSTER', 'SEEKER']).optional(),
});

// ─── Server-side: Signup Request ─────────────────────────────────────────────

export const signupRequestSchema = z.object({
  tempToken: z.string().min(1),
  phone: z.string().regex(/^01[3-9]\d{8}$/),
  password: z.string().min(8),
  confirmPassword: z.string().min(1),
});
