import { type NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { checkRateLimit } from "@/lib/rate-limit"
import { isValidRoomId } from "@/lib/lyrics/room"

/**
 * Background image upload for the Lyrics OBS dock.
 *
 * The dock is a public surface (no login), so it cannot write to Storage
 * directly — the bucket denies anonymous writes. This route writes with the
 * service role after validating the file AND verifying that the requester is
 * the registered controller for the given Broadcast Room.
 *
 * Controller verification: the dock upserts into `broadcast_controllers` when
 * it claims control. This route reads that table (service role, bypassing RLS)
 * and checks that the supplied controllerId matches the registered controller
 * and the claim is recent. An attacker must guess a valid 8-char room ID
 * (24^8 ≈ 110B possibilities) AND actively register as controller (which
 * disrupts the real session — visible to all participants).
 *
 * Rate limiting uses the project's shared in-memory limiter. On Vercel
 * serverless each instance has its own Map, so the limit is per-instance and
 * best-effort — it constrains a single instance being hammered but does not
 * provide global rate limiting. The project does not have a shared store (e.g.
 * Redis/Upstash) for rate limiting; the controller verification is the primary
 * gate, and the rate limiter is defense in depth.
 */

export const runtime = "nodejs"

const BUCKET = "lyric-backgrounds"
const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

const MAX_CLAIM_AGE_MS = 8 * 60 * 60 * 1000

function magicMatches(mime: string, bytes: Uint8Array): boolean {
  if (mime === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
  if (mime === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47
  if (mime === "image/webp")
    return (
      bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50
    )
  return false
}

function err(code: string, status: number) {
  return NextResponse.json({ error: code }, { status })
}

export async function POST(request: NextRequest) {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown"
  const { allowed } = checkRateLimit(`bg-upload:${ip}`, 30, 10 * 60 * 1000)
  if (!allowed) return err("RATE_LIMITED", 429)

  const contentLength = Number(request.headers.get("content-length") || 0)
  if (contentLength > MAX_BYTES + 1024 * 1024) return err("TOO_LARGE", 413)

  let file: File | null = null
  let roomId: string | null = null
  let controllerId: string | null = null
  try {
    const form = await request.formData()
    const f = form.get("file")
    if (f instanceof File) file = f
    const r = form.get("roomId")
    if (typeof r === "string") roomId = r
    const c = form.get("controllerId")
    if (typeof c === "string") controllerId = c
  } catch {
    return err("UPLOAD_FAILED", 400)
  }
  if (!file) return err("NO_FILE", 400)

  // --- controller verification -------------------------------------------
  if (!roomId || !isValidRoomId(roomId)) return err("INVALID_ROOM", 403)
  if (!controllerId) return err("NOT_CONTROLLER", 403)

  const lowerName = file.name.toLowerCase()
  const inferredMime =
    ALLOWED[file.type]
      ? file.type
      : lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")
        ? "image/jpeg"
        : lowerName.endsWith(".png")
          ? "image/png"
          : lowerName.endsWith(".webp")
            ? "image/webp"
            : ""
  const ext = ALLOWED[inferredMime]
  if (!ext) return err("UNSUPPORTED_TYPE", 415)
  if (file.size > MAX_BYTES) return err("TOO_LARGE", 413)
  if (file.size === 0) return err("UPLOAD_FAILED", 400)

  const bytes = new Uint8Array(await file.arrayBuffer())
  if (!magicMatches(inferredMime, bytes)) return err("UNSUPPORTED_TYPE", 415)

  let admin
  try {
    admin = createAdminClient()
  } catch {
    console.error("[background upload] admin client unavailable — check SUPABASE_SERVICE_ROLE_KEY")
    return err("STORAGE_UNAVAILABLE", 500)
  }

  // Verify the controller claim in the server-side registry. The admin client
  // bypasses RLS (anonymous users cannot SELECT this table).
  try {
    const { data: claim, error: claimError } = await admin
      .from("broadcast_controllers")
      .select("controller_id, claimed_at")
      .eq("room_id", roomId)
      .single()

    if (claimError || !claim) {
      console.error("[background upload] no controller claim for room:", roomId)
      return err("INVALID_ROOM", 403)
    }
    if (claim.controller_id !== controllerId) {
      console.error("[background upload] controllerId mismatch for room:", roomId)
      return err("NOT_CONTROLLER", 403)
    }
    const age = Date.now() - new Date(claim.claimed_at).getTime()
    if (age > MAX_CLAIM_AGE_MS) {
      console.error("[background upload] stale controller claim for room:", roomId, "age:", Math.round(age / 60000), "min")
      return err("NOT_CONTROLLER", 403)
    }
  } catch (e) {
    console.error("[background upload] controller verification error:", e)
    return err("STORAGE_UNAVAILABLE", 500)
  }

  // --- file upload -------------------------------------------------------
  const path = `${crypto.randomUUID()}.${ext}`
  const doUpload = () =>
    admin!.storage.from(BUCKET).upload(path, bytes, { contentType: inferredMime, upsert: false })

  let { error } = await doUpload()
  if (error && /bucket not found/i.test(error.message)) {
    await admin.storage.createBucket(BUCKET, {
      public: true,
      fileSizeLimit: MAX_BYTES,
      allowedMimeTypes: Object.keys(ALLOWED),
    })
    ;({ error } = await doUpload())
  }

  if (error) {
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
