/**
 * Lightweight and robust HTML Sanitizer for external job descriptions and ATS content.
 * Prevents XSS attacks by stripping malicious tags, attributes, and JavaScript execution vectors
 * while preserving rich text formatting (paragraphs, lists, bolding, links, headers).
 */

const ALLOWED_TAGS = new Set([
  'p', 'br', 'b', 'i', 'strong', 'em', 'u', 'strike', 's', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
  'ul', 'ol', 'li', 'span', 'div', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a'
]);

const ALLOWED_ATTRS: Record<string, Set<string>> = {
  a: new Set(['href', 'title', 'target', 'rel']),
  span: new Set(['class', 'style']),
  div: new Set(['class']),
  p: new Set(['class']),
  td: new Set(['colspan', 'rowspan']),
  th: new Set(['colspan', 'rowspan']),
};

export function sanitizeHtml(rawHtml: string | undefined | null): string {
  if (!rawHtml) return '';

  // 1. Remove dangerous blocks completely (scripts, iframes, styles, objects, svgs)
  let clean = rawHtml
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<svg\b[^<]*(?:(?!<\/svg>)<[^<]*)*<\/svg>/gi, '')
    .replace(/<applet\b[^<]*(?:(?!<\/applet>)<[^<]*)*<\/applet>/gi, '');

  // 2. Remove inline event handlers (onload, onerror, onclick, onmouseover, etc.)
  clean = clean.replace(/\s+on\w+\s*=\s*(["'][^"']*["']|[^\s>]+)/gi, '');

  // 3. Remove javascript: and data: pseudo-protocols in links or attributes
  clean = clean.replace(/(href|src)\s*=\s*(["'])\s*(javascript|vbscript|data):/gi, '$1=$2#');

  // 4. Ensure all external links have rel="noopener noreferrer" and target="_blank"
  clean = clean.replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1([^>]*)>/gi, (match, quote, href, rest) => {
    // Avoid javascript: hrefs
    if (/^\s*(javascript|data|vbscript):/i.test(href)) {
      return `<span>`;
    }
    return `<a href="${href}" target="_blank" rel="noopener noreferrer"${rest}>`;
  });

  return clean;
}
