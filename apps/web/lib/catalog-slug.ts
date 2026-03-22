/** URL-safe slug from a display string (lowercase, hyphens). */
export function slugifyDisplayName(s: string): string {
  const out = s
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return out.length > 0 ? out : 'item';
}
