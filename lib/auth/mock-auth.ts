import bcrypt from 'bcryptjs';
import { generateUserUniqueId } from './id';
import { signJWT } from './jose';

type MockRole = 'POSTER' | 'SEEKER' | 'ADMIN';

type MockUser = {
  id: string;
  phone: string;
  email: string | null;
  role: MockRole;
  name: string | null;
  passwordHash: string;
  isActive: boolean;
  createdAt: string;
};

type MockOtpRecord = {
  otpCode: string;
  expiresAt: Date;
  used: boolean;
};

const mockUsers = new Map<string, MockUser>();
const mockOtpRecords = new Map<string, MockOtpRecord>();

export function resetMockAuthStore() {
  mockUsers.clear();
  mockOtpRecords.clear();
}

export async function storeMockOtp(phone: string, rawOtp: string, expiresAt: Date) {
  const otpCode = await bcrypt.hash(rawOtp, 12);
  mockOtpRecords.set(phone, { otpCode, expiresAt, used: false });
  return rawOtp;
}

export async function verifyMockOtp(phone: string, otpCode: string) {
  const record = mockOtpRecords.get(phone);
  if (!record || record.used || record.expiresAt < new Date()) {
    return false;
  }

  const isValid = await bcrypt.compare(otpCode, record.otpCode);
  if (!isValid) {
    return false;
  }

  record.used = true;
  return true;
}

export async function createMockUser(phone: string, role: MockRole, password: string) {
  const existingUser = mockUsers.get(phone);
  if (existingUser) {
    return existingUser;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user: MockUser = {
    id: generateUserUniqueId(phone, role),
    phone,
    email: null,
    role,
    name: null,
    passwordHash,
    isActive: true,
    createdAt: new Date().toISOString(),
  };

  mockUsers.set(phone, user);
  return user;
}

export async function authenticateMockUser(phone: string, password: string) {
  const user = mockUsers.get(phone);
  if (!user) {
    return null;
  }

  const isValid = await bcrypt.compare(password, user.passwordHash);
  if (!isValid) {
    return null;
  }

  return user;
}

export async function createMockSession(user: MockUser) {
  const accessToken = await signJWT({ id: user.id, phone: user.phone, role: user.role }, '15m');
  const refreshToken = await signJWT({ id: user.id, phone: user.phone, role: user.role }, '7d');
  return { accessToken, refreshToken };
}
