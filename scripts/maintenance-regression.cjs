const assert = require('node:assert/strict')
const fs = require('node:fs')
const ts = require('typescript')
function load(file, mocks) {
  const exports = {}
  const code = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText
  new Function('require', 'exports', code)(name => mocks[name] ?? require(name), exports)
  return exports
}
const maintenance = load('lib/maintenance.ts', {})
const { middleware } = load('middleware.ts', {
  'next/server': { NextResponse: { next: () => ({ status: 200 }), redirect: url => ({ status: 307, location: url.pathname }) } },
  '@supabase/ssr': { createServerClient: () => ({ auth: { getUser: async () => ({ data: { user: null } }) } }) },
  '@/lib/auth/next-url': { currentPathWithQuery: u => u.pathname + u.search },
  '@/lib/obs-access': { isObsDockPath: () => false, sanitizeDockNext: () => null },
  '@/lib/maintenance': maintenance,
})
function request(path) {
  const url = new URL(path, 'https://fusion.test')
  url.clone = () => new URL(url)
  return { nextUrl: url, url: url.href, cookies: { getAll: () => [] } }
}
;(async () => {
  for (const mode of ['false', 'true']) {
    process.env.FUSION_MAINTENANCE_MODE = mode
    assert.equal((await middleware(request('/maintenance'))).status, 200, `anonymous maintenance with mode=${mode}`)
  }
  for (const path of ['/login', '/dashboard', '/api/cron/send-reminders', '/api/cron/publish-scheduled-posts']) {
    assert.equal((await middleware(request(path))).location, '/maintenance', path)
  }
  process.env.FUSION_MAINTENANCE_MODE = 'false'
  assert.equal((await middleware(request('/dashboard'))).location,
    process.env.EXPECT_RELEASE_MAINTENANCE === 'true' ? '/maintenance' : '/login')
  console.log('PASS: anonymous maintenance, login, cron blocking, and protected dashboard')
})().catch(error => { console.error(error); process.exitCode = 1 })
