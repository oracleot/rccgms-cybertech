import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Background image upload for the Lyrics OBS dock.
 *
 * The dock is a public surface (no login), so it cannot — and must not — write
 * to Storage directly: the lyric-backgrounds bucket denies anonymous writes,
 * which is why a direct upload from the dock failed. Instead the dock POSTs the
 * file here and this trusted server route writes it with the service role,
 * after validating it. That keeps the bucket closed to client writes while
 * still letting a public dock upload a background.
 *
 * Constraints enforced here (defense in depth — the bucket also enforces the
 * type/size allowlist): image MIME only, ≤10MB, a random safe filename so
 * nothing can be overwritten, and create-only (this route never deletes or
 * lists). The bucket is created on demand if missing, because creating it via
 * SQL migration proved unreliable (the storage schema isn't owned by the
 * migration role).
 */

export const runtime = "nodejs"

const BUCKET = "lyric-backgrounds"
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

// A light per-IP limiter so a public write endpoint can't be used to spam the
// bucket. In-memory, best-effort — same approach as the magic-link route.
const rate = new Map<string, { count: number; reset: number }>()
function rateLimited(ip: string): boolean {
  const now = Date.now()
  const windowMs = 10 * 60 * 1000
  const max = 30
  const rec = rate.get(ip)
  if (!rec || now > rec.reset) {
    rate.set(ip, { count: 1, reset: now + windowMs })
    return false
  }
  if (rec.count >= max) return true
  rec.count++
  return false
}

/** Confirms the bytes really are the image type they claim, so a spoofed type can't slip through. */
function magicMatches(mime: string, bytes: Uint8Array): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (mime === "image/webp")
    return (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 && // RIFF
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50 // WEBP
    )
  return false
}

function err(code: string, status: number) {
  return NextResponse.json({ error: code }, { status })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  if (rateLimited(ip)) return err("RATE_LIMITED", 429)

  // Reject an oversized body before parsing it — a very large multipart body
  // otherwise fails to parse and would report a generic error instead of the
  // real "too large" reason. 1MB of slack covers multipart framing overhead;
  // the exact file.size check below is still authoritative.
  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > MAX_BYTES + 1024 * 1024) return err("TOO_LARGE", 413)

  let file: File | null = null
  try {
    const form = await request.formData()
    const f = form.get("file")
    if (f instanceof File) file = f
  } catch {
    return err("UPLOAD_FAILED", 400)
  }
  if (!file) return err("NO_FILE", 400)

  const ext = ALLOWED[file.type]
  if (!ext) return err("UNSUPPORTED_TYPE", 415)
  if (file.size > MAX_BYTES) return err("TOO_LARGE", 413)
  if (file.size === 0) return err("UPLOAD_FAILED", 400)

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!magicMatches(file.type, bytes)) return err("UNSUPPORTED_TYPE", 415)

  let admin
  try {
    admin = createAdminClient()
  } catch {
    // Missing service-role config — a deployment problem, not the operator's.
    console.error("[background upload] admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY")
    return err("STORAGE_UNAVAILABLE", 500)
  }

  const path = `${crypto.randomUUID()}.${ext}`
  const doUpload = () =>
    admin!.storage.from(BUCKET).upload(path, bytes, { contentType: file!.type, upsert: false })

  let { error } = await doUpload()
  if (error && /bucket not found/i.test(error.message)) {
    // Self-heal: create the bucket (idempotent) and retry once.
    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Object.keys(ALLOWED),
    })
    ;({ error } = await doUpload())
  }

  if (error) {
    // Full technical detail in the server log; never the raw message to the UI.
    console.error("[background upload] storage error:", error.name, error.message)
    const msg = error.message.toLowerCase()
    if (/row-level security|permission|not authorized/.test(msg)) return err("PERMISSION_DENIED", 403)
    if (/exceeded|too large|maximum size/.test(msg)) return err("TOO_LARGE", 413)
    if (/mime|content type|not supported/.test(msg)) return err("UNSUPPORTED_TYPE", 415)
    if (/bucket not found|not found/.test(msg)) return err("STORAGE_UNAVAILABLE", 503)
    return err("UPLOAD_FAILED", 502)
  }

  const { data } = admin.storage.from(BUCKET).getPublicUrl(path)
  return NextResponse.json({ url: data.publicUrl })
}
