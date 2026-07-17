import { pgTable, pgEnum, text, boolean, real, timestamp, integer } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Role & Status Enums
export const roleEnum = pgEnum('role', ['POSTER', 'SEEKER', 'ADMIN']);
export const statusEnum = pgEnum('task_status', ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

// Payment Method Enum
export const paymentMethodEnum = pgEnum('payment_method', ['ONLINE_PAYMENT', 'BANK_TRANSFER', 'CASH_ON_HAND']);

// Progress Step Enum (covers both poster and seeker views)
export const progressStepEnum = pgEnum('progress_step', [
  'POSTED',
  'REVIEWING',
  'ACCEPTED',
  'CONTACT_COORDINATION',
  'WORK_IN_PROGRESS',
  'TASK_COMPLETED',
  'PAYMENT_PROCESSING',
  'FINISHED',
  'FEEDBACK',
]);

// Users Table
export const users = pgTable('users', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  phone: text('phone').unique().notNull(),
  email: text('email').unique(),
  passwordHash: text('password_hash'),
  role: roleEnum('role').notNull(),
  name: text('name'),
  profilePicUrl: text('profile_pic_url'),
  location: text('location'),
  additionalPhone: text('additional_phone'),
  houseAddress: text('house_address'), // Seekers only
  isActive: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// OTP Verification Logs Table
export const otpLogs = pgTable('otp_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  phone: text('phone').notNull(),
  otpCode: text('otp_code').notNull(), // Stored hashed
  expiresAt: timestamp('expires_at').notNull(),
  used: boolean('used').default(false).notNull(),
});

// Email OTP Verification Table
export const emailOtps = pgTable('email_otps', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  email: text('email').notNull(),
  otpHash: text('otp_hash').notNull(), // bcrypt-hashed — never store plain OTP
  expiresAt: timestamp('expires_at').notNull(),
  attemptCount: integer('attempt_count').default(0).notNull(),
  resendCount: integer('resend_count').default(0).notNull(),
  resendWindowStart: timestamp('resend_window_start'), // tracks 15-min resend window
  verified: boolean('verified').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Tasks Table
export const tasks = pgTable('tasks', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  posterId: text('poster_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  seekerId: text('seeker_id').references(() => users.id, { onDelete: 'set null' }),
  title: text('title').notNull(),
  category: text('category').notNull(),
  description: text('description').notNull(),
  location: text('location').notNull(),
  budget: real('budget').notNull(), // Budget in BDT
  deadline: timestamp('deadline').notNull(),
  status: statusEnum('status').default('OPEN').notNull(),
  paymentMethod: paymentMethodEnum('payment_method').default('CASH_ON_HAND').notNull(),
  progressStep: progressStepEnum('progress_step').default('POSTED').notNull(),
  budgetChangedByPoster: boolean('budget_changed_by_poster').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// GPS Telemetry logs
export const gpsLogs = pgTable('gps_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});

// Notifications Table
export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  taskId: text('task_id').references(() => tasks.id, { onDelete: 'cascade' }),
  type: text('type').notNull(), // e.g. 'BUDGET_CHANGED', 'TASK_CANCELLED', etc.
  message: text('message').notNull(),
  isRead: boolean('is_read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// Applications Table (Seekers apply for tasks)
export const applications = pgTable('applications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  seekerId: text('seeker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
