import { SignJWT, jwtVerify } from 'jose';

const getSecretKey = () => {
  const secret = process.env.JWT_SECRET || 'dev-taskbridge-secret-change-me';
  return new TextEncoder().encode(secret);
};

/**
 * Sign a payload into a HS256 JWT
 * @param payload Payload to sign
 * @param expirationTime Expiration string (e.g. '15m', '7d')
 */
export async function signJWT(payload: any, expirationTime: string | number) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .sign(getSecretKey());
}

/**
 * Verify a JWT string
 * @param token JWT token to verify
 * @returns Decoded payload or null if invalid/expired
 */
export async function verifyJWT(token: string) {
  try {
    const { payload } = await jwtVerify(token, getSecretKey());
    return payload;
  } catch (error) {
    return null;
  }
}
