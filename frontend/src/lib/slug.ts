/**
 * URL Slug generation and decoding utilities
 */

export function toCompanySlug(name: string): string {
  if (!name) return 'unknown';
  return encodeURIComponent(name.trim());
}

export function fromCompanySlug(slug: string): string {
  if (!slug) return '';
  try {
    return decodeURIComponent(slug);
  } catch {
    return slug;
  }
}
