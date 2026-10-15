import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { isMaintenanceMode, isMaintenanceExcluded } from "@/lib/maintenance"

describe("isMaintenanceMode", () => {
  const original = process.env.FUSION_MAINTENANCE_MODE

  afterEach(() => {
    if (original === undefined) {
      delete process.env.FUSION_MAINTENANCE_MODE
    } else {
      process.env.FUSION_MAINTENANCE_MODE = original
    }
  })

  it("returns false when env var is not set", () => {
    delete process.env.FUSION_MAINTENANCE_MODE
    expect(isMaintenanceMode()).toBe(false)
  })

  it("returns false when env var is empty", () => {
    process.env.FUSION_MAINTENANCE_MODE = ""
    expect(isMaintenanceMode()).toBe(false)
  })

  it("returns false when env var is 'false'", () => {
    process.env.FUSION_MAINTENANCE_MODE = "false"
    expect(isMaintenanceMode()).toBe(false)
  })

  it("returns true when env var is 'true'", () => {
    process.env.FUSION_MAINTENANCE_MODE = "true"
    expect(isMaintenanceMode()).toBe(true)
  })
})

describe("isMaintenanceExcluded", () => {
  it("excludes /maintenance itself (no redirect loop)", () => {
    expect(isMaintenanceExcluded("/maintenance")).toBe(true)
  })

  it("excludes /_next/ static assets", () => {
    expect(isMaintenanceExcluded("/_next/static/chunks/app.js")).toBe(true)
    expect(isMaintenanceExcluded("/_next/image?url=test")).toBe(true)
  })

  it("excludes the bootstrap endpoint", () => {
    expect(isMaintenanceExcluded("/api/admin/developer/parish-bootstrap")).toBe(true)
  })

  it("excludes health check", () => {
    expect(isMaintenanceExcluded("/api/health")).toBe(true)
  })

  it("BLOCKS cron routes during maintenance", () => {
    expect(isMaintenanceExcluded("/api/cron/send-reminders")).toBe(false)
    expect(isMaintenanceExcluded("/api/cron/cleanup-events")).toBe(false)
    expect(isMaintenanceExcluded("/api/cron/publish-scheduled-posts")).toBe(false)
  })

  it("excludes static file extensions", () => {
    expect(isMaintenanceExcluded("/logo.png")).toBe(true)
    expect(isMaintenanceExcluded("/icons/icon-192.webp")).toBe(true)
    expect(isMaintenanceExcluded("/fonts/inter.woff2")).toBe(true)
    expect(isMaintenanceExcluded("/style.css")).toBe(true)
  })

  it("excludes favicon and manifest", () => {
    expect(isMaintenanceExcluded("/favicon.ico")).toBe(true)
    expect(isMaintenanceExcluded("/manifest.webmanifest")).toBe(true)
    expect(isMaintenanceExcluded("/sw.js")).toBe(true)
  })

  it("does NOT exclude dashboard routes", () => {
    expect(isMaintenanceExcluded("/dashboard")).toBe(false)
    expect(isMaintenanceExcluded("/lyrics")).toBe(false)
    expect(isMaintenanceExcluded("/rota")).toBe(false)
    expect(isMaintenanceExcluded("/admin")).toBe(false)
  })

  it("does NOT exclude login/auth routes (they should show maintenance)", () => {
    expect(isMaintenanceExcluded("/login")).toBe(false)
    expect(isMaintenanceExcluded("/signup")).toBe(false)
  })

  it("does NOT exclude general API routes (they should return 503)", () => {
    expect(isMaintenanceExcluded("/api/rota/overlap")).toBe(false)
    expect(isMaintenanceExcluded("/api/social/content")).toBe(false)
  })
})
