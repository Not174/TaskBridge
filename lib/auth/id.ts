import crypto from 'crypto';

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/**
 * Generates a permanent deterministic user ID based on phone number + role.
 * Format: #PO##### (Poster) or #SE##### (Seeker) or #AD##### (Admin)
 */
export function generateUserUniqueId(phone: string, role: 'POSTER' | 'SEEKER' | 'ADMIN'): string {
  const prefix = role === 'POSTER' ? '#PO' : role === 'SEEKER' ? '#SE' : '#AD';

  // Hash the phone number to get a deterministic value
  const hash = crypto.createHash('sha256').update(phone).digest('hex');

  let result = '';
  for (let i = 0; i < 5; i++) {
    const startIndex = i * 4;
    const sliceVal = parseInt(hash.substring(startIndex, startIndex + 4), 16);
    result += ALPHABET[sliceVal % ALPHABET.length];
  }

  return `${prefix}${result}`;
}

/**
 * Generates a random unique 6-character task ID.
 * Format: #XXXXX (# + 5 uppercase alphanumeric chars)
 */
export function generateTaskId(): string {
  const bytes = crypto.randomBytes(5);
  let result = '#';
  for (let i = 0; i < 5; i++) {
    result += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return result;
}
