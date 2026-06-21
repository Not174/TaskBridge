import { pgTable, pgEnum, text, boolean, real, timestamp } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

// Role & Status Enums
export const roleEnum = pgEnum('role', ['POSTER', 'SEEKER', 'ADMIN']);
export const statusEnum = pgEnum('task_status', ['OPEN', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']);

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
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

// GPS Telemetry logs
export const gpsLogs = pgTable('gps_logs', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  seekerId: text('seeker_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  latitude: real('latitude').notNull(),
  longitude: real('longitude').notNull(),
  recordedAt: timestamp('recorded_at').defaultNow().notNull(),
});
