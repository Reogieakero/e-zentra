import { createCipheriv, createDecipheriv, randomBytes, createHash } from 'crypto';
import { config } from '../config/env';

const ALGO = 'aes-256-gcm';

function keyBytes(): Buffer {
  const key = config.backup.cipherKey;
  if (!key) throw new Error('CIPHER_KEY is required to encrypt backup OAuth tokens.');
  return createHash('sha256').update(key).digest();
}

export function encryptToken(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, keyBytes(), iv);
  const enc = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64');
}

export function decryptToken(payload: string): string {
  const buf = Buffer.from(payload, 'base64');
  const iv = buf.subarray(0, 12);
  const tag = buf.subarray(12, 28);
  const data = buf.subarray(28);
  const decipher = createDecipheriv(ALGO, keyBytes(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}