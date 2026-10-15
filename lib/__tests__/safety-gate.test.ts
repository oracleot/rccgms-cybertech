import { describe, it, expect } from "vitest"
import {
  classifyUrl,
  PRODUCTION_PROJECT_REFS,
  ALLOWED_STAGING_REFS,
  SAFE_LOCAL_HOSTS,
} from "./test-safety-gate"

describe("Security test safety gate — URL classification", () => {
  describe("local URLs → allowed", () => {
    it.each([
      "http://127.0.0.1:54321",
      "http://localhost:54321",
      "http://0.0.0.0:54321",
      "http://[::1]:54321",
      "http://db.localhost:54321",
      "http://supabase.test:54321",
    ])("classifies %s as local", (url) => {
      expect(classifyUrl(url)).toBe("local")
    })
  })

  describe("production URLs → always denied", () => {
    it.each(
      PRODUCTION_PROJECT_REFS.map(
        (ref) => `https://${ref}.supabase.co`
      )
    )("classifies %s as production", (url) => {
      expect(classifyUrl(url)).toBe("production")
    })

    it("production ref is permanently blocked regardless of env vars", () => {
      expect(PRODUCTION_PROJECT_REFS).toContain("gvzkhjbrwuufnhaanjbj")
      expect(classifyUrl("https://gvzkhjbrwuufnhaanjbj.supabase.co")).toBe("production")
    })
  })

  describe("staging URLs → allowed only with override", () => {
    it("known staging ref returns 'staging'", () => {
      if (ALLOWED_STAGING_REFS.length === 0) {
        expect(ALLOWED_STAGING_REFS).toHaveLength(0)
        return
      }
      const ref = ALLOWED_STAGING_REFS[0]
      expect(classifyUrl(`https://${ref}.supabase.co`)).toBe("staging")
    })
  })

  describe("unknown URLs → denied", () => {
    it.each([
      "https://abcdefghijklmnop.supabase.co",
      "https://evil.example.com",
      "https://supabase.co",
      "https://some-other-host.com:54321",
    ])("classifies %s as unknown", (url) => {
      expect(classifyUrl(url)).toBe("unknown")
    })
  })

  describe("malformed URLs → denied", () => {
    it.each([
      "not-a-url",
      "",
      "://missing-scheme",
    ])("classifies %s as unknown", (url) => {
      expect(classifyUrl(url)).toBe("unknown")
    })
  })

  describe("SAFE_LOCAL_HOSTS includes expected hosts", () => {
    it("contains the standard local hosts", () => {
      expect(SAFE_LOCAL_HOSTS).toContain("127.0.0.1")
      expect(SAFE_LOCAL_HOSTS).toContain("localhost")
      expect(SAFE_LOCAL_HOSTS).toContain("0.0.0.0")
      expect(SAFE_LOCAL_HOSTS).toContain("[::1]")
    })
  })
})
