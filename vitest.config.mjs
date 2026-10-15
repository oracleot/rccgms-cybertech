import { fileURLToPath } from "url"
import { readFileSync } from "fs"
import path from "path"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

try {
  const envLocal = readFileSync(path.resolve(__dirname, ".env.local"), "utf8")
  for (const line of envLocal.split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const eq = trimmed.indexOf("=")
    if (eq < 0) continue
    const key = trimmed.slice(0, eq)
    if (key && !(key in process.env)) {
      process.env[key] = trimmed.slice(eq + 1)
    }
  }
} catch {}

const config = {
  test: {
    include: ["lib/__tests__/**/*.test.ts"],
    exclude: [
      "lib/__tests__/parish-types.test.ts",
      "lib/__tests__/obs-dock-flow.test.ts",
    ],
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      "@": __dirname,
    },
  },
}

export default config
