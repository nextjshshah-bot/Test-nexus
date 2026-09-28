/** URL-safe slugifier that keeps unicode letters (e.g. Indonesian accents). */
export function slugify(input: string): string {
  const base = input
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60)
    .replace(/^-|-$/g, '');

  return base.length > 0 ? base : 'project';
}

/**
 * Guarantees uniqueness of a slug inside an owner's namespace by appending a
 * short random suffix when the base slug is already taken.
 */
export function uniqueSuffix(length = 5): string {
  const alphabet = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let out = '';
  for (let i = 0; i < length; i += 1) {
    out += alphabet[Math.floor(Math.random() * alphabet.length)];
  }
  return out;
}
