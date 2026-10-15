const SAFE_LOCAL_HOSTS = ["127.0.0.1", "localhost", "0.0.0.0", "[::1]"]

const PRODUCTION_PROJECT_REFS = ["gvzkhjbrwuufnhaanjbj"]

const ALLOWED_STAGING_REFS: string[] = []

type UrlClassification = "local" | "production" | "staging" | "unknown"

function classifyUrl(url: string): UrlClassification {
  try {
    const parsed = new URL(url)
    const host = parsed.hostname
    if (SAFE_LOCAL_HOSTS.includes(host) || host.endsWith(".localhost") || host.endsWith(".test")) {
      return "local"
    }
    const supabaseMatch = host.match(/^([a-z0-9]+)\.supabase\.co$/)
    if (supabaseMatch) {
      const ref = supabaseMatch[1]
      if (PRODUCTION_PROJECT_REFS.includes(ref)) return "production"
      if (ALLOWED_STAGING_REFS.includes(ref)) return "staging"
    }
    return "unknown"
  } catch {
    return "unknown"
  }
}

function enforceTestSafetyGate(supabaseUrl: string): void {
  const classification = classifyUrl(supabaseUrl)

  if (classification === "production") {
    throw new Error(
      `SAFETY GATE: RLS integration tests ABSOLUTELY REFUSE to run against production.\n` +
      `  Target URL: ${supabaseUrl}\n` +
      `  Production project refs are permanently blocked: ${PRODUCTION_PROJECT_REFS.join(", ")}\n` +
      `  No override flag can bypass this. Run against local Supabase only.`
    )
  }

  if (classification === "staging") {
    if (process.env.FUSION_ALLOW_SECURITY_TESTS !== "true") {
      throw new Error(
        `SAFETY GATE: RLS integration tests require FUSION_ALLOW_SECURITY_TESTS=true for staging.\n` +
        `  Target URL: ${supabaseUrl}\n` +
        `  Set FUSION_ALLOW_SECURITY_TESTS=true to run against this staging instance.`
      )
    }
    console.warn(
      `⚠ Running security tests against STAGING: ${supabaseUrl}`
    )
  }

  if (classification === "unknown") {
    throw new Error(
      `SAFETY GATE: RLS integration tests REFUSE to run against unrecognized Supabase URL.\n` +
      `  Target URL: ${supabaseUrl}\n` +
      `  Only local hosts and explicitly allowlisted staging refs are permitted.\n` +
      `  Local: ${SAFE_LOCAL_HOSTS.join(", ")}\n` +
      `  Staging: ${ALLOWED_STAGING_REFS.length ? ALLOWED_STAGING_REFS.join(", ") : "(none configured)"}`
    )
  }
}

export {
  classifyUrl,
  enforceTestSafetyGate,
  PRODUCTION_PROJECT_REFS,
  ALLOWED_STAGING_REFS,
  SAFE_LOCAL_HOSTS,
}
