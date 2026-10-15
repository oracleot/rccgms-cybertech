import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { PARISH_SCOPED_TABLES } from "@/lib/parish/table-registry"
import { FEATURE_SLUGS } from "@/lib/features/types"
import { isMaintenanceMode } from "@/lib/maintenance"

export const runtime = "nodejs"
export const maxDuration = 60

// An authenticated browser can submit this during maintenance without exposing
// tokens or requiring access to the otherwise blocked developer dashboard.
export async function GET() {
  const supabase = await createClient()
  const { data, error } = await supabase.auth.getUser()
  if (error || !data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const profile = await supabase.from("profiles").select("role").eq("auth_user_id", data.user.id).single()
  if (profile.error || !profile.data || !["developer", "lead_developer"].includes(profile.data.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 })
  }
  if (!isMaintenanceMode()) return NextResponse.json({ error: "Bootstrap requires maintenance mode" }, { status: 409 })
  return new NextResponse('<!doctype html><html lang="en"><meta charset="utf-8"><title>MorningStar bootstrap</title><main><h1>MorningStar bootstrap</h1><p>Apply or resume the approved MorningStar memberships, parish backfills and feature entitlements. Keep maintenance enabled until verification is complete.</p><form method="post"><button type="submit">Run MorningStar bootstrap</button></form></main></html>', {
    headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store", "Content-Security-Policy": "default-src 'none'; form-action 'self'; frame-ancestors 'none'" },
  })
}

type Step = { name: string; status: "complete" | "failed"; result?: unknown; error?: string }
type Profile = { id: string; auth_user_id: string; email: string; name: string }
type Membership = { profile_id: string; role: string; status: string }
type Entitlement = { feature_id: string; enabled: boolean; expires_at: string | null }

/** Resumable bootstrap: every write is checked and every completed run is verified.
 * Maintenance excludes concurrent ordinary app writes; unique conflict keys make
 * retries safe even when a prior request stopped after committing an individual step.
 * Platform roles are never changed here.
 */
export async function POST() {
  const steps: Step[] = []
  async function step<T>(name: string, action: () => Promise<T>): Promise<T> {
    try {
      const result = await action()
      steps.push({ name, status: "complete", result })
      return result
    } catch (error) {
      steps.push({ name, status: "failed", error: error instanceof Error ? error.message : "Unknown failure" })
      throw error
    }
  }
  function checked<T>(result: { data: T; error: { message: string } | null }): T {
    if (result.error) throw new Error(result.error.message)
    return result.data
  }
  try {
    const supabase = await createClient()
    const auth = await supabase.auth.getUser()
    if (auth.error || !auth.data.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const actorResult = await supabase.from("profiles").select("id, role").eq("auth_user_id", auth.data.user.id).single()
    if (actorResult.error || !actorResult.data || !["developer", "lead_developer"].includes(actorResult.data.role)) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }
    if (!isMaintenanceMode()) return NextResponse.json({ error: "Bootstrap requires maintenance mode" }, { status: 409 })
    const actor = actorResult.data
    const admin = createAdminClient()
    async function rows<T>(table: string, columns: string): Promise<T[]> {
      const all: T[] = []
      for (let offset = 0; ; offset += 500) {
        const page = checked(await admin.from(table).select(columns).order("id").range(offset, offset + 499)) as T[] | null
        if (!page) throw new Error(`No data returned for ${table}`)
        all.push(...page)
        if (page.length < 500) return all
      }
    }
    async function count(table: string, nullParish = false): Promise<number> {
      let query = admin.from(table).select("*", { count: "exact", head: true })
      if (nullParish) query = query.is("parish_id", null)
      const result = await query
      checked(result)
      if (result.count === null) throw new Error(`Missing exact count for ${table}`)
      return result.count
    }
    const profiles = await rows<Profile>("profiles", "id, auth_user_id, email, name")
    const roles = new Map<string, string>(profiles.map(p => [p.id, "member"]))
    await step("validate_approved_identities", async () => {
      const approved = [
        ["joelogunniyi07", "operator"], ["damiuxcodes", "operator"],
        ["akinwunmi.awoyode", "leader"], ["doduronbi", "leader"], ["rccgms.cybertech", "parish_admin"],
      ] as const
      for (const [account, role] of approved) {
        const matches = profiles.filter(p => p.email.toLowerCase().split("@")[0] === account)
        if (matches.length !== 1 || !matches[0].auth_user_id) throw new Error(`Expected exactly one authenticated profile for ${account}`)
        if (account === "rccgms.cybertech" && matches[0].name !== "RCCGMS") throw new Error("RCCGMS identity mismatch")
        roles.set(matches[0].id, role)
      }
      return { profiles: profiles.length, approvedAccounts: approved.length }
    })
    const orgs = await rows<{id:string;slug:string;status:string}>("organisations", "id, slug, status")
    const parishes = await rows<{id:string;slug:string;organisation_id:string;status:string}>("parishes", "id, slug, organisation_id, status")
    const features = await rows<{id:string;slug:string}>("features", "id, slug")
    const baseline: Record<string, number> = {}
    await step("preflight_schema_and_scope", async () => {
      if (orgs.some(o => o.slug !== "rccg" || o.status !== "active")) throw new Error("Unexpected organisation; initial bootstrap only")
      if (parishes.some(p => p.slug !== "morningstar-kirknewton" || p.status !== "active" || p.organisation_id !== orgs[0]?.id)) throw new Error("Unexpected parish; initial bootstrap only")
      if (features.length !== Object.keys(FEATURE_SLUGS).length || Object.values(FEATURE_SLUGS).some(slug => !features.some(f => f.slug === slug))) throw new Error("Feature catalog mismatch")
      for (const table of PARISH_SCOPED_TABLES) {
        baseline[table] = await count(table)
        await count(table, true) // Requires migrated parish_id even for empty tables.
        let foreign = admin.from(table).select("*", {count:"exact",head:true}).not("parish_id", "is", null)
        if (parishes[0]) foreign = foreign.neq("parish_id", parishes[0].id)
        const result = await foreign
        checked(result)
        if (result.count !== 0) throw new Error(`Unexpected existing parish assignment in ${table}`)
      }
      return { rowCounts: baseline, features: features.length }
    })
    const org = await step("organisation", async () => {
      if (orgs[0]) return orgs[0]
      const value = checked(await admin.from("organisations").upsert({name:"The Redeemed Christian Church of God",short_name:"RCCG",slug:"rccg",status:"active",created_by:actor.id},{onConflict:"slug"}).select("id, slug, status").single())
      if (!value) throw new Error("Organisation write returned no row")
      return value as {id:string;slug:string;status:string}
    })
    const parish = await step("parish", async () => {
      if (parishes[0]) return parishes[0]
      const value = checked(await admin.from("parishes").upsert({organisation_id:org.id,name:"MorningStar Parish",spiritual_expression:"City of Love",locality:"Kirknewton",region:"Scotland",country:"United Kingdom",slug:"morningstar-kirknewton",status:"active",created_by:actor.id},{onConflict:"organisation_id,slug"}).select("id, slug, organisation_id, status").single())
      if (!value) throw new Error("Parish write returned no row")
      return value as {id:string;slug:string;organisation_id:string;status:string}
    })
    await step("organisation_alias", async () => {
      checked(await admin.from("organisation_aliases").upsert({organisation_id:org.id,alias:"RCCG"},{onConflict:"organisation_id,alias",ignoreDuplicates:true}))
      return { verified: true }
    })
    await step("memberships", async () => {
      const existing = checked(await admin.from("parish_memberships").select("profile_id, role, status").eq("parish_id",parish.id)) as Membership[] | null
      if (!existing) throw new Error("Membership read returned no data")
      const changes = profiles.filter(p => !existing.some(m => m.profile_id===p.id && m.role===roles.get(p.id) && m.status==="active"))
      if (changes.length) checked(await admin.from("parish_memberships").upsert(changes.map(p=>({parish_id:parish.id,profile_id:p.id,role:roles.get(p.id),status:"active",approved_at:new Date().toISOString(),approved_by:actor.id})),{onConflict:"parish_id,profile_id"}))
      return { changed: changes.length, expected: profiles.length }
    })
    for (const table of PARISH_SCOPED_TABLES) {
      await step(`backfill:${table}`, async () => {
        const result = await admin.from(table).update({parish_id:parish.id},{count:"exact"}).is("parish_id",null)
        checked(result)
        if (result.count === null) throw new Error(`Missing affected-row count for ${table}`)
        if (await count(table,true) !== 0 || await count(table) !== baseline[table]) throw new Error(`Backfill verification failed for ${table}`)
        return { changed: result.count, total: baseline[table], nullParish: 0 }
      })
    }
    await step("entitlements", async () => {
      const existing=checked(await admin.from("parish_feature_entitlements").select("feature_id, enabled, expires_at").eq("parish_id",parish.id)) as Entitlement[] | null
      if (!existing) throw new Error("Entitlement read returned no data")
      const missing=features.filter(f=>!existing.some(e=>e.feature_id===f.id&&e.enabled&&e.expires_at===null))
      if (missing.length) checked(await admin.from("parish_feature_entitlements").upsert(missing.map(f=>({parish_id:parish.id,feature_id:f.id,enabled:true,expires_at:null,granted_by:actor.id})),{onConflict:"parish_id,feature_id"}))
      return { changed: missing.length, expected: features.length }
    })
    await step("verify_completion", async () => {
      const memberships=checked(await admin.from("parish_memberships").select("profile_id, role, status").eq("parish_id",parish.id)) as Membership[] | null
      const entitlements=checked(await admin.from("parish_feature_entitlements").select("feature_id, enabled, expires_at").eq("parish_id",parish.id)) as Entitlement[] | null
      if (!memberships || memberships.length!==profiles.length || profiles.some(p=>!memberships.some(m=>m.profile_id===p.id&&m.role===roles.get(p.id)&&m.status==="active"))) throw new Error("Membership verification failed")
      if (!entitlements || entitlements.length!==features.length || features.some(f=>!entitlements.some(e=>e.feature_id===f.id&&e.enabled&&e.expires_at===null))) throw new Error("Entitlement verification failed")
      if (await count("profiles")!==profiles.length) throw new Error("Profiles changed during bootstrap")
      return { memberships:memberships.length, features:entitlements.length }
    })
    return NextResponse.json({message:"Bootstrap complete",organisation:{id:org.id},parish:{id:parish.id},profileCount:profiles.length,steps})
  } catch (error) {
    if (!steps.some(s=>s.status==="failed")) steps.push({name:"database_read",status:"failed",error:error instanceof Error?error.message:"Unknown failure"})
    return NextResponse.json({error:"Bootstrap incomplete; keep maintenance enabled and retry after resolving the failed step",steps},{status:500})
  }
}

