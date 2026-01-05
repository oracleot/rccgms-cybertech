/**
 * Rate limiting implementation using in-memory Map
 * 
 * Suitable for low-volume applications. For high-traffic scenarios,
 * consider using Redis or Upstash Rate Limit.
 */

interface RateLimitRecord {
  count: number
  resetTime: number
}

const rateLimitMap = new Map<string, RateLimitRecord>()

// Cleanup interval to prevent memory leaks
const CLEANUP_THRESHOLD = 10000 // Clean up when map exceeds 10k entries
const _CLEANUP_INTERVAL = 3600000 // 1 hour

interface RateLimitResult {
  allowed: boolean
  remaining: number
  resetIn: number
}

/**
 * Check if a request from a given identifier is allowed based on rate limits
 * 
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param limit - Maximum number of requests allowed in the window
 * @param windowMs - Time window in milliseconds (default: 1 hour)
 * @returns Rate limit result with allowed status and metadata
 */
export function checkRateLimit(
  identifier: string,
  limit = 3,
  windowMs = 3600000 // 1 hour default
): RateLimitResult {
  const now = Date.now()
  const record = rateLimitMap.get(identifier)

  // Periodic cleanup to prevent memory leaks
  if (rateLimitMap.size > CLEANUP_THRESHOLD) {
    for (const [key, value] of rateLimitMap.entries()) {
      if (now > value.resetTime) {
        rateLimitMap.delete(key)
      }
    }
  }

  // No record or window expired - allow and create new record
  if (!record || now > record.resetTime) {
    rateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    })
    return {
      allowed: true,
      remaining: limit - 1,
      resetIn: windowMs,
    }
  }

  // Rate limit exceeded
  if (record.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetIn: record.resetTime - now,
    }
  }

  // Increment count and allow
  record.count++
  return {
    allowed: true,
    remaining: limit - record.count,
    resetIn: record.resetTime - now,
  }
}

/**
 * Reset rate limit for a specific identifier
 * Useful for manual overrides or testing
 */
export function resetRateLimit(identifier: string): void {
  rateLimitMap.delete(identifier)
}

/**
 * Clear all rate limit records
 * Useful for testing or maintenance
 */
export function clearAllRateLimits(): void {
  rateLimitMap.clear()
}
