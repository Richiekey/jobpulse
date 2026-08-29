/**
 * In-memory sliding window rate limiter for API endpoints (e.g. AI Copilot routes).
 */

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

/**
 * Check if an identifier (IP or User ID) has exceeded the rate limit.
 * @param identifier Unique identifier (e.g., client IP or Supabase user ID)
 * @param limit Maximum requests allowed in the window (default 20)
 * @param windowMs Window duration in milliseconds (default 60,000ms / 1 min)
 * @returns { success: boolean, remaining: number, resetInSeconds: number }
 */
export function checkRateLimit(
  identifier: string,
  limit: number = 20,
  windowMs: number = 60 * 1000
): { success: boolean; remaining: number; resetInSeconds: number } {
  const now = Date.now();
  const record = rateLimitMap.get(identifier);

  // Clean expired entries periodically
  if (rateLimitMap.size > 5000) {
    for (const [key, val] of rateLimitMap.entries()) {
      if (now > val.resetTime) {
        rateLimitMap.delete(key);
      }
    }
  }

  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });
    return {
      success: true,
      remaining: limit - 1,
      resetInSeconds: Math.ceil(windowMs / 1000),
    };
  }

  if (record.count >= limit) {
    return {
      success: false,
      remaining: 0,
      resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
    };
  }

  record.count += 1;
  return {
    success: true,
    remaining: limit - record.count,
    resetInSeconds: Math.ceil((record.resetTime - now) / 1000),
  };
}
