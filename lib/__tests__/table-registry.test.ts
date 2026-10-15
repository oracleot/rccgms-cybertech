import { describe, it, expect } from "vitest"
import { PARISH_SCOPED_TABLES } from "@/lib/parish/table-registry"

describe("PARISH_SCOPED_TABLES canonical registry", () => {
  it("contains exactly 31 tables (3 from 051 + 28 from 053)", () => {
    expect(PARISH_SCOPED_TABLES).toHaveLength(31)
  })

  it("has no duplicate entries", () => {
    const unique = new Set(PARISH_SCOPED_TABLES)
    expect(unique.size).toBe(PARISH_SCOPED_TABLES.length)
  })

  it("includes all 3 worship library tables from migration 051", () => {
    const worship051 = ["broadcast_controllers", "lyric_sets", "lyric_backgrounds"]
    for (const t of worship051) {
      expect(PARISH_SCOPED_TABLES).toContain(t)
    }
  })

  it("includes all 8 previously-missing bootstrap tables", () => {
    const previouslyMissing = [
      "broadcast_controllers",
      "positions",
      "user_departments",
      "onboarding_steps",
      "member_progress",
      "step_completions",
      "design_request_assignments",
      "obs_access_codes",
    ]
    for (const t of previouslyMissing) {
      expect(PARISH_SCOPED_TABLES).toContain(t)
    }
  })

  it("includes all child/denormalized tables from migration 053", () => {
    const childTables = [
      "rota_assignments",
      "rundown_items",
      "equipment_checkouts",
      "equipment_maintenance",
      "meeting_attendees",
    ]
    for (const t of childTables) {
      expect(PARISH_SCOPED_TABLES).toContain(t)
    }
  })

  it("lists parent tables before child tables", () => {
    const parentChildPairs = [
      { parent: "rotas", child: "rota_assignments" },
      { parent: "rundowns", child: "rundown_items" },
      { parent: "equipment", child: "equipment_checkouts" },
      { parent: "equipment", child: "equipment_maintenance" },
      { parent: "meetings", child: "meeting_attendees" },
    ]
    for (const { parent, child } of parentChildPairs) {
      const parentIdx = PARISH_SCOPED_TABLES.indexOf(parent)
      const childIdx = PARISH_SCOPED_TABLES.indexOf(child)
      expect(parentIdx).toBeLessThan(childIdx)
    }
  })
})
