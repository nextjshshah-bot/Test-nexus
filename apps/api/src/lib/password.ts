import bcrypt from 'bcryptjs';
import { BCRYPT_SALT_ROUNDS } from '../config/constants';

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, BCRYPT_SALT_ROUNDS);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plain, hash);
  } catch {
    return false;
  }
}

export interface PasswordStrength {
  score: number;
  label: 'very weak' | 'weak' | 'fair' | 'strong' | 'excellent';
  suggestions: string[];
}

/** Lightweight, dependency-free strength meter used by the API + UI. */
export function assessPasswordStrength(password: string): PasswordStrength {
  const suggestions: string[] = [];
  let score = 0;

  if (password.length >= 8) score += 1;
  else suggestions.push('Use at least 8 characters');

  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  else suggestions.push('Mix upper and lower case letters');

  if (/\d/.test(password)) score += 1;
  else suggestions.push('Add at least one number');

  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  else suggestions.push('Add at least one symbol');

  if (/(.)\1{2,}/.test(password)) {
    score -= 1;
    suggestions.push('Avoid repeating the same character');
  }

  const clamped = Math.max(0, Math.min(5, score));
  const labels: PasswordStrength['label'][] = ['very weak', 'very weak', 'weak', 'fair', 'strong', 'excellent'];

  return { score: clamped, label: labels[clamped], suggestions };
}
