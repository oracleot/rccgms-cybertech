/**
 * Security RLS integration tests — verifies parish isolation and role-based
 * authorization at the database level with REAL database operations.
 *
 * Prerequisites:
 *   1. Local Supabase running: npx supabase start
 *   2. Migrations applied:    npx supabase db reset
 *   3. Env vars available:    NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * Run:
 *   npx vitest run lib/__tests__/security-rls.test.ts
 *
 * These tests create real auth users, real profiles, real parish memberships,
 * and execute actual SELECT/INSERT/UPDATE/DELETE against RLS-protected tables.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { describe, it, expect, beforeAll, afterAll } from "vitest"

// ---------------------------------------------------------------------------
// Test environment — with production safety gate
// ---------------------------------------------------------------------------

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://127.0.0.1:54321"
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? ""

import { enforceTestSafetyGate } from "./test-safety-gate"

if (SERVICE_ROLE_KEY && ANON_KEY) {
  enforceTestSafetyGate(SUPABASE_URL)
}

function adminClient(): SupabaseClient {
  if (!SERVICE_ROLE_KEY) throw new Error("SUPABASE_SERVICE_ROLE_KEY not set")
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

function anonClient(): SupabaseClient {
  if (!ANON_KEY) throw new Error("NEXT_PUBLIC_SUPABASE_ANON_KEY not set")
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
}

async function authedClient(email: string, password: string): Promise<SupabaseClient> {
  const sb = anonClient()
  const { error } = await sb.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`Failed to sign in as ${email}: ${error.message}`)
  return sb
}

// ---------------------------------------------------------------------------
// Test data holders
// ---------------------------------------------------------------------------

interface TestUser {
  authId: string
  profileId: string
  email: string
  password: string
}

interface TestParish {
  id: string
  orgId: string
  name: string
}

let admin: SupabaseClient

let orgA: string
let parishA: TestParish
let parishB: TestParish

let devUser: TestUser
let adminUserA: TestUser
let leaderUserA: TestUser
let operatorUserA: TestUser
let memberUserA: TestUser
let memberUserB: TestUser
let unaffiliatedUser: TestUser

const createdAuthIds: string[] = []

async function createTestUser(
  email: string,
  password: string,
  platformRole: string = "member",
): Promise<TestUser> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (error) throw new Error(`createUser(${email}): ${error.message}`)
  const authId = data.user.id
  createdAuthIds.push(authId)

  // handle_new_user trigger creates the profile automatically — poll for it
  let profile: { id: string } | null = null
  for (let i = 0; i < 10; i++) {
    await new Promise((r) => setTimeout(r, 300))
    const { data: p } = await admin
      .from("profiles")
      .select("id")
      .eq("auth_user_id", authId)
      .single()
    if (p) { profile = p; break }
  }
  if (!profile) throw new Error(`No profile created for ${email}`)

  if (platformRole !== "member") {
    await admin.from("profiles").update({ role: platformRole }).eq("id", profile.id)
  }

  return { authId, profileId: profile.id, email, password }
}

async function addMembership(
  profileId: string,
  parishId: string,
  role: string,
  status: string = "active",
) {
  const { error } = await admin.from("parish_memberships").insert({
    profile_id: profileId,
    parish_id: parishId,
    role,
    status,
  })
  if (error) throw new Error(`addMembership: ${error.message}`)
}

const HAS_ENV = Boolean(SERVICE_ROLE_KEY && ANON_KEY)

describe.skipIf(!HAS_ENV)("RLS integration tests", () => {

// ---------------------------------------------------------------------------
// Setup & Teardown
// ---------------------------------------------------------------------------

beforeAll(async () => {
  admin = adminClient()

  const { data: org } = await admin
    .from("organisations")
    .insert({ name: "RLS Test Org", slug: `rls-test-${Date.now()}`, status: "active" })
    .select("id")
    .single()
  if (!org) throw new Error("Failed to create test org")
  orgA = org.id

  const { data: pA } = await admin
    .from("parishes")
    .insert({ organisation_id: orgA, name: "Parish Alpha", slug: `alpha-${Date.now()}`, country: "GB", status: "active" })
    .select("id")
    .single()
  if (!pA) throw new Error("Failed to create parish A")
  parishA = { id: pA.id, orgId: orgA, name: "Parish Alpha" }

  const { data: pB } = await admin
    .from("parishes")
    .insert({ organisation_id: orgA, name: "Parish Beta", slug: `beta-${Date.now()}`, country: "GB", status: "active" })
    .select("id")
    .single()
  if (!pB) throw new Error("Failed to create parish B")
  parishB = { id: pB.id, orgId: orgA, name: "Parish Beta" }

  const ts = Date.now()
  devUser = await createTestUser(`dev-${ts}@test.local`, "TestPass123!", "developer")
  adminUserA = await createTestUser(`admin-a-${ts}@test.local`, "TestPass123!")
  leaderUserA = await createTestUser(`leader-a-${ts}@test.local`, "TestPass123!")
  operatorUserA = await createTestUser(`operator-a-${ts}@test.local`, "TestPass123!")
  memberUserA = await createTestUser(`member-a-${ts}@test.local`, "TestPass123!")
  memberUserB = await createTestUser(`member-b-${ts}@test.local`, "TestPass123!")
  unaffiliatedUser = await createTestUser(`unaffiliated-${ts}@test.local`, "TestPass123!")

  await addMembership(adminUserA.profileId, parishA.id, "parish_admin")
  await addMembership(leaderUserA.profileId, parishA.id, "leader")
  await addMembership(operatorUserA.profileId, parishA.id, "operator")
  await addMembership(memberUserA.profileId, parishA.id, "member")
  await addMembership(memberUserB.profileId, parishB.id, "member")
}, 60_000)

afterAll(async () => {
  const profileIds = [
    adminUserA?.profileId, leaderUserA?.profileId, operatorUserA?.profileId,
    memberUserA?.profileId, memberUserB?.profileId, unaffiliatedUser?.profileId,
    devUser?.profileId,
  ].filter(Boolean)

  await admin.from("parish_memberships").delete().in("profile_id", profileIds)
  const parishIds = [parishA?.id, parishB?.id].filter(Boolean)
  await admin.from("departments").delete().in("parish_id", parishIds)
  await admin.from("availability").delete().in("parish_id", parishIds)
  await admin.from("services").delete().in("parish_id", parishIds)
  await admin.from("lyric_sets").delete().in("parish_id", parishIds)

  if (parishA?.id) await admin.from("parishes").delete().eq("id", parishA.id)
  if (parishB?.id) await admin.from("parishes").delete().eq("id", parishB.id)
  if (orgA) await admin.from("organisations").delete().eq("id", orgA)

  for (const id of createdAuthIds) {
    await admin.auth.admin.deleteUser(id)
  }
}, 30_000)

// ===========================================================================
// TESTS
// ===========================================================================

describe("SECURITY DEFINER helper functions", () => {
  it("fusion_current_profile_id() returns the caller's profile.id", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.rpc("fusion_current_profile_id")
    expect(data).toBe(memberUserA.profileId)
  })

  it("fusion_is_platform_developer() → true for developer role", async () => {
    const sb = await authedClient(devUser.email, devUser.password)
    const { data } = await sb.rpc("fusion_is_platform_developer")
    expect(data).toBe(true)
  })

  it("fusion_is_platform_developer() → false for non-developers", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.rpc("fusion_is_platform_developer")
    expect(data).toBe(false)
  })

  it("fusion_is_parish_member() → true for active members", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_member", { p_parish_id: parishA.id })
    expect(data).toBe(true)
  })

  it("fusion_is_parish_member() → false for non-members", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_member", { p_parish_id: parishB.id })
    expect(data).toBe(false)
  })

  it("fusion_is_parish_leader_or_above() → true for leader", async () => {
    const sb = await authedClient(leaderUserA.email, leaderUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_leader_or_above", { p_parish_id: parishA.id })
    expect(data).toBe(true)
  })

  it("fusion_is_parish_leader_or_above() → false for operator", async () => {
    const sb = await authedClient(operatorUserA.email, operatorUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_leader_or_above", { p_parish_id: parishA.id })
    expect(data).toBe(false)
  })

  it("fusion_is_parish_operator_or_above() → true for operator", async () => {
    const sb = await authedClient(operatorUserA.email, operatorUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_operator_or_above", { p_parish_id: parishA.id })
    expect(data).toBe(true)
  })

  it("fusion_is_parish_operator_or_above() → false for member", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_operator_or_above", { p_parish_id: parishA.id })
    expect(data).toBe(false)
  })

  it("fusion_is_parish_admin() → true for parish_admin", async () => {
    const sb = await authedClient(adminUserA.email, adminUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_admin", { p_parish_id: parishA.id })
    expect(data).toBe(true)
  })

  it("fusion_is_parish_admin() → false for leader", async () => {
    const sb = await authedClient(leaderUserA.email, leaderUserA.password)
    const { data } = await sb.rpc("fusion_is_parish_admin", { p_parish_id: parishA.id })
    expect(data).toBe(false)
  })
})

describe("Parish isolation — departments table", () => {
  let deptIdA: string
  let deptIdB: string

  beforeAll(async () => {
    const { data: dA } = await admin
      .from("departments")
      .insert({ name: `Test Dept A ${Date.now()}`, parish_id: parishA.id })
      .select("id")
      .single()
    deptIdA = dA!.id

    const { data: dB } = await admin
      .from("departments")
      .insert({ name: `Test Dept B ${Date.now()}`, parish_id: parishB.id })
      .select("id")
      .single()
    deptIdB = dB!.id
  })

  afterAll(async () => {
    if (deptIdA) await admin.from("departments").delete().eq("id", deptIdA)
    if (deptIdB) await admin.from("departments").delete().eq("id", deptIdB)
  })

  it("parish A member can SELECT departments in parish A", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data, error } = await sb.from("departments").select("id").eq("id", deptIdA)
    expect(error).toBeNull()
    expect(data).toHaveLength(1)
    expect(data![0].id).toBe(deptIdA)
  })

  it("parish A member CANNOT SELECT departments in parish B", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data, error } = await sb.from("departments").select("id").eq("id", deptIdB)
    expect(error).toBeNull()
    expect(data).toHaveLength(0)
  })

  it("parish B member can SELECT departments in parish B", async () => {
    const sb = await authedClient(memberUserB.email, memberUserB.password)
    const { data } = await sb.from("departments").select("id").eq("id", deptIdB)
    expect(data).toHaveLength(1)
  })

  it("parish B member CANNOT SELECT departments in parish A", async () => {
    const sb = await authedClient(memberUserB.email, memberUserB.password)
    const { data } = await sb.from("departments").select("id").eq("id", deptIdA)
    expect(data).toHaveLength(0)
  })

  it("platform developer CAN SELECT departments from both parishes", async () => {
    const sb = await authedClient(devUser.email, devUser.password)
    const { data: dA } = await sb.from("departments").select("id").eq("id", deptIdA)
    const { data: dB } = await sb.from("departments").select("id").eq("id", deptIdB)
    expect(dA).toHaveLength(1)
    expect(dB).toHaveLength(1)
  })

  it("unaffiliated user CANNOT SELECT any departments", async () => {
    const sb = await authedClient(unaffiliatedUser.email, unaffiliatedUser.password)
    const { data } = await sb.from("departments").select("id").in("id", [deptIdA, deptIdB])
    expect(data).toHaveLength(0)
  })

  it("leader CAN INSERT departments in their parish", async () => {
    const sb = await authedClient(leaderUserA.email, leaderUserA.password)
    const { data, error } = await sb
      .from("departments")
      .insert({ name: `Leader Created ${Date.now()}`, parish_id: parishA.id })
      .select("id")
      .single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    if (data) await admin.from("departments").delete().eq("id", data.id)
  })

  it("member CANNOT INSERT departments (requires leader+)", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { error } = await sb
      .from("departments")
      .insert({ name: `Member Attempt ${Date.now()}`, parish_id: parishA.id })
    expect(error).toBeTruthy()
  })

  it("operator CANNOT INSERT departments (requires leader+)", async () => {
    const sb = await authedClient(operatorUserA.email, operatorUserA.password)
    const { error } = await sb
      .from("departments")
      .insert({ name: `Operator Attempt ${Date.now()}`, parish_id: parishA.id })
    expect(error).toBeTruthy()
  })

  it("leader CANNOT INSERT departments in another parish", async () => {
    const sb = await authedClient(leaderUserA.email, leaderUserA.password)
    const { error } = await sb
      .from("departments")
      .insert({ name: `Cross-parish ${Date.now()}`, parish_id: parishB.id })
    expect(error).toBeTruthy()
  })
})

describe("Parish isolation — services table", () => {
  let serviceIdA: string

  beforeAll(async () => {
    const { data } = await admin
      .from("services")
      .insert({ name: `Test Service ${Date.now()}`, parish_id: parishA.id, day_of_week: 0 })
      .select("id")
      .single()
    serviceIdA = data!.id
  })

  afterAll(async () => {
    if (serviceIdA) await admin.from("services").delete().eq("id", serviceIdA)
  })

  it("parish A member can see parish A services", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.from("services").select("id").eq("id", serviceIdA)
    expect(data).toHaveLength(1)
  })

  it("parish B member CANNOT see parish A services", async () => {
    const sb = await authedClient(memberUserB.email, memberUserB.password)
    const { data } = await sb.from("services").select("id").eq("id", serviceIdA)
    expect(data).toHaveLength(0)
  })
})

describe("Self-service — availability table", () => {
  it("member can INSERT their own availability in their parish", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data, error } = await sb
      .from("availability")
      .insert({
        user_id: memberUserA.profileId,
        parish_id: parishA.id,
        date: "2099-01-01",
        is_available: true,
      })
      .select("id")
      .single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    if (data) await admin.from("availability").delete().eq("id", data.id)
  })

  it("member CANNOT INSERT availability for another user", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { error } = await sb.from("availability").insert({
      user_id: leaderUserA.profileId,
      parish_id: parishA.id,
      date: "2099-01-02",
      is_available: true,
    })
    expect(error).toBeTruthy()
  })

  it("member CANNOT INSERT availability in another parish", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { error } = await sb.from("availability").insert({
      user_id: memberUserA.profileId,
      parish_id: parishB.id,
      date: "2099-01-03",
      is_available: true,
    })
    expect(error).toBeTruthy()
  })
})

describe("Parish memberships RLS", () => {
  it("user can see their own memberships", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb
      .from("parish_memberships")
      .select("id, parish_id, role")
      .eq("profile_id", memberUserA.profileId)
    expect(data).toHaveLength(1)
    expect(data![0].role).toBe("member")
  })

  it("user CANNOT see another user's memberships (unless parish_admin)", async () => {
    const sb = await authedClient(memberUserB.email, memberUserB.password)
    const { data } = await sb
      .from("parish_memberships")
      .select("id")
      .eq("profile_id", memberUserA.profileId)
    expect(data).toHaveLength(0)
  })

  it("parish_admin CAN see memberships in their parish", async () => {
    const sb = await authedClient(adminUserA.email, adminUserA.password)
    const { data } = await sb
      .from("parish_memberships")
      .select("id")
      .eq("parish_id", parishA.id)
    expect(data!.length).toBeGreaterThanOrEqual(4)
  })

  it("self-join forces role='member' and status='pending'", async () => {
    const sb = await authedClient(unaffiliatedUser.email, unaffiliatedUser.password)

    // role='leader' → rejected
    const { error: leaderErr } = await sb.from("parish_memberships").insert({
      parish_id: parishA.id,
      profile_id: unaffiliatedUser.profileId,
      role: "leader",
      status: "pending",
    })
    expect(leaderErr).toBeTruthy()

    // status='active' → rejected
    const { error: activeErr } = await sb.from("parish_memberships").insert({
      parish_id: parishA.id,
      profile_id: unaffiliatedUser.profileId,
      role: "member",
      status: "active",
    })
    expect(activeErr).toBeTruthy()

    // Correct: role='member', status='pending'
    const { data, error } = await sb
      .from("parish_memberships")
      .insert({
        parish_id: parishA.id,
        profile_id: unaffiliatedUser.profileId,
        role: "member",
        status: "pending",
      })
      .select("id")
      .single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()

    if (data) await admin.from("parish_memberships").delete().eq("id", data.id)
  })

  it("parish_admin can approve memberships", async () => {
    const { data: pending } = await admin
      .from("parish_memberships")
      .insert({
        parish_id: parishA.id,
        profile_id: unaffiliatedUser.profileId,
        role: "member",
        status: "pending",
      })
      .select("id")
      .single()

    const sb = await authedClient(adminUserA.email, adminUserA.password)
    const { error } = await sb
      .from("parish_memberships")
      .update({ status: "active" })
      .eq("id", pending!.id)
    expect(error).toBeNull()

    await admin.from("parish_memberships").delete().eq("id", pending!.id)
  })

  it("member CANNOT approve memberships", async () => {
    const { data: pending } = await admin
      .from("parish_memberships")
      .insert({
        parish_id: parishA.id,
        profile_id: unaffiliatedUser.profileId,
        role: "member",
        status: "pending",
      })
      .select("id")
      .single()

    const sb = await authedClient(memberUserA.email, memberUserA.password)
    await sb
      .from("parish_memberships")
      .update({ status: "active" })
      .eq("id", pending!.id)
    // PostgREST returns no error on RLS-blocked updates — verify the row is unchanged
    const { data: check } = await admin
      .from("parish_memberships")
      .select("status")
      .eq("id", pending!.id)
      .single()
    expect(check?.status).toBe("pending")

    await admin.from("parish_memberships").delete().eq("id", pending!.id)
  })
})

describe("Profile visibility — parish-scoped", () => {
  it("user can see their own profile", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.from("profiles").select("id").eq("id", memberUserA.profileId)
    expect(data).toHaveLength(1)
  })

  it("member can see co-parish member profiles", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.from("profiles").select("id").eq("id", leaderUserA.profileId)
    expect(data).toHaveLength(1)
  })

  it("member CANNOT see profiles from another parish", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.from("profiles").select("id").eq("id", memberUserB.profileId)
    expect(data).toHaveLength(0)
  })

  it("platform developer CAN see all profiles", async () => {
    const sb = await authedClient(devUser.email, devUser.password)
    const { data } = await sb
      .from("profiles")
      .select("id")
      .in("id", [memberUserA.profileId, memberUserB.profileId])
    expect(data).toHaveLength(2)
  })
})

describe("Organisations and parishes visibility", () => {
  it("any authenticated user can see active organisations", async () => {
    const sb = await authedClient(unaffiliatedUser.email, unaffiliatedUser.password)
    const { data } = await sb.from("organisations").select("id").eq("id", orgA)
    expect(data).toHaveLength(1)
  })

  it("any authenticated user can see active parishes", async () => {
    const sb = await authedClient(unaffiliatedUser.email, unaffiliatedUser.password)
    const { data } = await sb.from("parishes").select("id").eq("id", parishA.id)
    expect(data).toHaveLength(1)
  })

  it("non-developer CANNOT create organisations", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { error } = await sb
      .from("organisations")
      .insert({ name: "Rogue Org", slug: `rogue-${Date.now()}`, status: "active" })
    expect(error).toBeTruthy()
  })

  it("non-developer CANNOT create parishes", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { error } = await sb
      .from("parishes")
      .insert({
        organisation_id: orgA,
        name: "Rogue Parish",
        slug: `rogue-${Date.now()}`,
        country: "GB",
        status: "active",
      })
    expect(error).toBeTruthy()
  })

  it("developer CAN create organisations", async () => {
    const sb = await authedClient(devUser.email, devUser.password)
    const { data, error } = await sb
      .from("organisations")
      .insert({ name: "Dev Test Org", slug: `dev-test-${Date.now()}`, status: "active" })
      .select("id")
      .single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    if (data) await admin.from("organisations").delete().eq("id", data.id)
  })
})

describe("Organisation & parish requests", () => {
  it("user can create an org request for themselves", async () => {
    const sb = await authedClient(unaffiliatedUser.email, unaffiliatedUser.password)
    const { data, error } = await sb
      .from("organisation_requests")
      .insert({ name: "New Org Request", requested_by: unaffiliatedUser.profileId })
      .select("id")
      .single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    if (data) await admin.from("organisation_requests").delete().eq("id", data.id)
  })

  it("user CANNOT create an org request for another user", async () => {
    const sb = await authedClient(unaffiliatedUser.email, unaffiliatedUser.password)
    const { error } = await sb.from("organisation_requests").insert({
      name: "Impersonation Request",
      requested_by: memberUserA.profileId,
    })
    expect(error).toBeTruthy()
  })

  it("user can only see their own org requests", async () => {
    const { data: req } = await admin
      .from("organisation_requests")
      .insert({ name: "Member A Request", requested_by: memberUserA.profileId })
      .select("id")
      .single()

    const sb = await authedClient(unaffiliatedUser.email, unaffiliatedUser.password)
    const { data } = await sb.from("organisation_requests").select("id").eq("id", req!.id)
    expect(data).toHaveLength(0)

    await admin.from("organisation_requests").delete().eq("id", req!.id)
  })

  it("developer can see all org requests", async () => {
    const { data: req } = await admin
      .from("organisation_requests")
      .insert({ name: "Visible to Dev", requested_by: memberUserA.profileId })
      .select("id")
      .single()

    const sb = await authedClient(devUser.email, devUser.password)
    const { data } = await sb.from("organisation_requests").select("id").eq("id", req!.id)
    expect(data).toHaveLength(1)

    await admin.from("organisation_requests").delete().eq("id", req!.id)
  })
})

describe("Anonymous access denial", () => {
  it("anonymous client CANNOT read departments", async () => {
    const sb = anonClient()
    const { data } = await sb.from("departments").select("id").limit(1)
    expect(data).toHaveLength(0)
  })

  it("anonymous client CANNOT read profiles", async () => {
    const sb = anonClient()
    const { data } = await sb.from("profiles").select("id").limit(1)
    expect(data).toHaveLength(0)
  })

  it("anonymous client CANNOT read parish_memberships", async () => {
    const sb = anonClient()
    const { data } = await sb.from("parish_memberships").select("id").limit(1)
    expect(data).toHaveLength(0)
  })

  it("anonymous client CANNOT write to departments", async () => {
    const sb = anonClient()
    const { error } = await sb.from("departments").insert({ name: "Anon dept", parish_id: parishA.id })
    expect(error).toBeTruthy()
  })

  it("anonymous client CANNOT write to broadcast_controllers", async () => {
    const sb = anonClient()
    const { error } = await sb
      .from("broadcast_controllers")
      .insert({ room_id: "TESTROOM", controller_id: "anon-ctrl" })
    expect(error).toBeTruthy()
  })
})

describe("broadcast_controllers — service-role only writes", () => {
  it("authenticated user CANNOT directly INSERT into broadcast_controllers", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { error } = await sb.from("broadcast_controllers").insert({
      room_id: "TESTCTRL",
      controller_id: "client-ctrl",
    })
    expect(error).toBeTruthy()
  })

  it("service role CAN INSERT into broadcast_controllers", async () => {
    const { data, error } = await admin
      .from("broadcast_controllers")
      .insert({ room_id: "SVCTEST1", controller_id: "svc-ctrl", parish_id: parishA.id })
      .select("room_id")
      .single()
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    if (data) await admin.from("broadcast_controllers").delete().eq("room_id", "SVCTEST1")
  })
})

describe("Feature entitlements RLS", () => {
  it("parish_feature_entitlements readable by parish members", async () => {
    // First get a feature_id from the features table
    const { data: feature } = await admin
      .from("features")
      .select("id")
      .eq("slug", "dashboard")
      .single()
    if (!feature) throw new Error("No dashboard feature found — seed.sql may not have run")

    const { data: ent } = await admin
      .from("parish_feature_entitlements")
      .insert({ parish_id: parishA.id, feature_id: feature.id, enabled: true })
      .select("id")
      .single()

    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb
      .from("parish_feature_entitlements")
      .select("id, feature_id")
      .eq("id", ent!.id)
    expect(data).toHaveLength(1)
    expect(data![0].feature_id).toBe(feature.id)

    const sbB = await authedClient(memberUserB.email, memberUserB.password)
    const { data: dataB } = await sbB
      .from("parish_feature_entitlements")
      .select("id")
      .eq("id", ent!.id)
    expect(dataB).toHaveLength(0)

    await admin.from("parish_feature_entitlements").delete().eq("id", ent!.id)
  })

  it("non-admin CANNOT modify parish_feature_entitlements", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data: feat } = await admin
      .from("features")
      .select("id")
      .eq("slug", "rota")
      .single()
    const { error } = await sb
      .from("parish_feature_entitlements")
      .insert({ parish_id: parishA.id, feature_id: feat!.id, enabled: true })
    expect(error).toBeTruthy()
  })
})

describe("Lyric sets — parish isolation", () => {
  let setIdA: string

  beforeAll(async () => {
    const { data } = await admin
      .from("lyric_sets")
      .insert({
        title: `RLS Test Set ${Date.now()}`,
        type: "song",
        parish_id: parishA.id,
      })
      .select("id")
      .single()
    setIdA = data!.id
  })

  afterAll(async () => {
    if (setIdA) await admin.from("lyric_sets").delete().eq("id", setIdA)
  })

  it("parish A member can SELECT lyric sets in parish A", async () => {
    const sb = await authedClient(memberUserA.email, memberUserA.password)
    const { data } = await sb.from("lyric_sets").select("id").eq("id", setIdA)
    expect(data).toHaveLength(1)
  })

  it("parish B member CANNOT SELECT lyric sets in parish A", async () => {
    const sb = await authedClient(memberUserB.email, memberUserB.password)
    const { data } = await sb.from("lyric_sets").select("id").eq("id", setIdA)
    expect(data).toHaveLength(0)
  })

  it("anonymous client CANNOT SELECT lyric sets", async () => {
    const sb = anonClient()
    const { data } = await sb.from("lyric_sets").select("id").eq("id", setIdA)
    expect(data).toHaveLength(0)
  })
})

}) // end describe.skipIf(!HAS_ENV)
