import { describe, it, expect } from "vitest"
import { readFileSync } from "fs"
import { resolve } from "path"
import { FEATURE_SLUGS } from "@/lib/features/types"

describe("Migration 052 feature catalog matches types.ts", () => {
  const migrationPath = resolve(
    process.cwd(),
    "supabase/migrations/052_feature_entitlements.sql"
  )
  const migrationSql = readFileSync(migrationPath, "utf-8")

  const typeSlugs = Object.values(FEATURE_SLUGS).sort()

  const migrationSlugs = Array.from(
    migrationSql.matchAll(/^\s*\('([a-z_]+)',/gm),
    (m) => m[1]
  ).sort()

  it("migration 052 seeds all 13 features from FEATURE_SLUGS", () => {
    expect(migrationSlugs).toHaveLength(typeSlugs.length)
  })

  it("every FEATURE_SLUGS value appears in the migration seed", () => {
    for (const slug of typeSlugs) {
      expect(migrationSlugs).toContain(slug)
    }
  })

  it("migration does not contain slugs absent from FEATURE_SLUGS", () => {
    for (const slug of migrationSlugs) {
      expect(typeSlugs).toContain(slug)
    }
  })
})
