import crypto from 'crypto';
import bcrypt from 'bcryptjs';

const BCRYPT_SALT_ROUNDS = 12;

/**
 * Generates a cryptographically secure 6-digit OTP.
 * Uses crypto.randomInt (Node.js built-in) — NOT Math.random.
 */
export function generateSecureOtp(): string {
  // crypto.randomInt(min, max) returns a value where min <= result < max
  const otp = crypto.randomInt(100000, 1000000);
  return otp.toString();
}

/**
 * Hashes an OTP using bcrypt with a secure salt.
 * Never store the plain OTP — only store this hash.
 */
export async function hashOtp(otp: string): Promise<string> {
  const salt = await bcrypt.genSalt(BCRYPT_SALT_ROUNDS);
  return bcrypt.hash(otp, salt);
}

/**
 * Verifies a plain OTP against a bcrypt hash.
 */
export async function verifyOtpHash(otp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(otp, hash);
}
