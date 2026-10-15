/**
 * Parish multi-tenancy type and guard tests.
 * Run with: npx tsx lib/__tests__/parish-types.test.ts
 *
 * Tests the pure logic layer: role hierarchy, constants, type safety.
 * Server-side context/guard functions that call Supabase cannot be tested
 * here without mocking — those are validated via the API integration.
 */

import {
  PARISH_ROLES,
  PARISH_ROLE_LABELS,
  PARISH_ROLE_HIERARCHY,
  ORGANISATION_STATUSES,
  PARISH_STATUSES,
  MEMBERSHIP_STATUSES,
} from "../parish/types"

let passed = 0
let failed = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++
  } else {
    failed++
    console.error(`  FAIL: ${msg}`)
  }
}

function run() {
  console.log("--- Parish Multi-Tenancy Type Tests ---\n")

  // 1. Parish roles exist and are correct
  assert(PARISH_ROLES.PARISH_ADMIN === "parish_admin", "parish_admin role exists")
  assert(PARISH_ROLES.LEADER === "leader", "leader role exists")
  assert(PARISH_ROLES.OPERATOR === "operator", "operator role exists")
  assert(PARISH_ROLES.MEMBER === "member", "member role exists")

  // 2. All parish roles have labels
  const roles = Object.values(PARISH_ROLES)
  for (const role of roles) {
    assert(
      typeof PARISH_ROLE_LABELS[role] === "string" && PARISH_ROLE_LABELS[role].length > 0,
      `role ${role} has a label`,
    )
  }

  // 3. Parish role hierarchy is strictly ordered
  assert(
    PARISH_ROLE_HIERARCHY.parish_admin > PARISH_ROLE_HIERARCHY.leader,
    "parish_admin > leader",
  )
  assert(
    PARISH_ROLE_HIERARCHY.leader > PARISH_ROLE_HIERARCHY.operator,
    "leader > operator",
  )
  assert(
    PARISH_ROLE_HIERARCHY.operator > PARISH_ROLE_HIERARCHY.member,
    "operator > member",
  )
  assert(PARISH_ROLE_HIERARCHY.member === 1, "member is lowest at 1")
  assert(PARISH_ROLE_HIERARCHY.parish_admin === 4, "parish_admin is highest at 4")

  // 4. Parish roles are DISTINCT from platform roles
  const platformRoles = ["admin", "lead_developer", "developer"]
  for (const pr of platformRoles) {
    assert(
      !roles.includes(pr as typeof roles[number]),
      `platform role "${pr}" is NOT a parish role`,
    )
  }

  // 5. Organisation statuses
  assert(ORGANISATION_STATUSES.PENDING_REVIEW === "pending_review", "org pending_review")
  assert(ORGANISATION_STATUSES.ACTIVE === "active", "org active")
  assert(ORGANISATION_STATUSES.ARCHIVED === "archived", "org archived")

  // 6. Parish statuses
  assert(PARISH_STATUSES.PENDING_REVIEW === "pending_review", "parish pending_review")
  assert(PARISH_STATUSES.ACTIVE === "active", "parish active")
  assert(PARISH_STATUSES.SUSPENDED === "suspended", "parish suspended")
  assert(PARISH_STATUSES.ARCHIVED === "archived", "parish archived")

  // 7. Membership statuses
  assert(MEMBERSHIP_STATUSES.PENDING === "pending", "membership pending")
  assert(MEMBERSHIP_STATUSES.ACTIVE === "active", "membership active")
  assert(MEMBERSHIP_STATUSES.DECLINED === "declined", "membership declined")
  assert(MEMBERSHIP_STATUSES.SUSPENDED === "suspended", "membership suspended")

  // 8. Parish admin is NOT the same as platform admin
  assert((PARISH_ROLES.PARISH_ADMIN as string) !== "admin", "parish_admin !== admin (platform)")

  // 9. Parish role count is exactly 4
  assert(roles.length === 4, `exactly 4 parish roles, got ${roles.length}`)

  // 10. Organisation statuses count
  const orgStatuses = Object.values(ORGANISATION_STATUSES)
  assert(orgStatuses.length === 3, `3 org statuses, got ${orgStatuses.length}`)

  // 11. Parish statuses count (one more than org: suspended)
  const parishStatuses = Object.values(PARISH_STATUSES)
  assert(parishStatuses.length === 4, `4 parish statuses, got ${parishStatuses.length}`)

  // 12. Membership statuses count
  const memberStatuses = Object.values(MEMBERSHIP_STATUSES)
  assert(memberStatuses.length === 4, `4 membership statuses, got ${memberStatuses.length}`)

  // 13. Hierarchy values are all positive integers
  for (const role of roles) {
    const val = PARISH_ROLE_HIERARCHY[role]
    assert(Number.isInteger(val) && val > 0, `hierarchy for ${role} is positive integer: ${val}`)
  }

  // 14. No duplicate hierarchy values
  const hierarchyValues = Object.values(PARISH_ROLE_HIERARCHY)
  const uniqueValues = new Set(hierarchyValues)
  assert(
    uniqueValues.size === hierarchyValues.length,
    `all hierarchy values are unique (${uniqueValues.size} === ${hierarchyValues.length})`,
  )

  console.log(`\nResults: ${passed} passed, ${failed} failed`)
  if (failed > 0) process.exit(1)
}

run()
