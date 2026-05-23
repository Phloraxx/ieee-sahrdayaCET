/**
 * HTML-encode special characters for safe rendering
 */
export function stripHtml(str: string): string {
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Sanitize user-provided strings for safe HTML rendering.
 * Removes HTML tags and encodes special characters.
 */
export function sanitizeUserInput(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  return stripHtml(str);
}
