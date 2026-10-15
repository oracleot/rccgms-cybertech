import { getActiveParishId } from "@/lib/parish/context"
import { hasFeature } from "./guards"
import type { FeatureSlug } from "./types"

const FEATURE_UNAVAILABLE = "This feature is not available"

/**
 * Server-side feature entitlement check.
 *
 * Resolves the active parish (or accepts a pre-resolved parishId) and
 * verifies the feature is enabled for that parish.
 *
 * Returns `null` when the feature is allowed, or an error string when
 * access should be denied. Callers wrap the string in their own response
 * shape (ActionResult for server actions, NextResponse for API routes).
 *
 * Usage in a server action:
 *   const denied = await enforceFeature("rota", parishId)
 *   if (denied) return { success: false, error: denied }
 *
 * Usage in an API route:
 *   const denied = await enforceFeature("rota", parishId)
 *   if (denied) return NextResponse.json({ error: denied }, { status: 403 })
 */
export async function enforceFeature(
  featureSlug: FeatureSlug,
  parishId?: string | null,
): Promise<string | null> {
  const id = parishId ?? (await getActiveParishId())
  if (!id) return "No active parish"
  const allowed = await hasFeature(id, featureSlug)
  return allowed ? null : FEATURE_UNAVAILABLE
}
