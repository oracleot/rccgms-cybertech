"use client"

import { useMemo, useState } from "react"
import {
  Activity, ArrowDownRight, ArrowRight, Bell, BookOpen, Boxes, Braces, Building2,
  Clapperboard, Database, LockKeyhole, Minus, MonitorPlay, Plus, Radio,
  RotateCcw, Search, ShieldCheck, Timer, Users, Workflow,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

type NodeKind = "experience" | "platform" | "data" | "realtime"
type MapNode = {
  id: string
  title: string
  subtitle: string
  kind: NodeKind
  x: number
  y: number
  icon: typeof Boxes
  detail: string
  paths: string[]
}

const nodes: MapNode[] = [
  { id: "web", title: "Fusion web app", subtitle: "Next.js · member experience", kind: "experience", x: 40, y: 96, icon: Boxes, detail: "The authenticated web application provides the member, leader, admin, and developer experiences.", paths: ["app/(dashboard)", "components/layout"] },
  { id: "modules", title: "Ministry modules", subtitle: "Rota · meetings · designs · more", kind: "experience", x: 40, y: 246, icon: Building2, detail: "Feature areas include rota, meetings, rundown, livestream, worship library, designs, training, and parish administration.", paths: ["app/(dashboard)", "lib/features"] },
  { id: "worship", title: "Bible, lyrics & worship", subtitle: "Reading · lyrics · worship library", kind: "experience", x: 40, y: 396, icon: BookOpen, detail: "Bible reading and OBS display, lyrics, and worship-library content support the service workflow.", paths: ["app/(dashboard)/bible", "app/(dashboard)/lyrics", "app/(dashboard)/worship-library"] },
  { id: "notification-ui", title: "Notifications", subtitle: "In-app notification experience", kind: "experience", x: 40, y: 546, icon: Bell, detail: "In-app notification views surface user-facing updates and delivery status from notification services.", paths: ["app/(dashboard)/admin/notifications", "app/api/notifications"] },
  { id: "auth", title: "Auth & email callback", subtitle: "Sign-in · signup · magic links", kind: "platform", x: 302, y: 96, icon: LockKeyhole, detail: "Handles sign-in and signup callbacks, email confirmations, magic-link sessions, and profile-role checks.", paths: ["app/auth/callback", "lib/auth", "middleware.ts"] },
  { id: "tenant", title: "Parish & membership", subtitle: "Organisation · parish · role", kind: "platform", x: 302, y: 246, icon: Users, detail: "Resolves organisation membership, selected parish, and role scope for each request so users remain within their authorised organisation.", paths: ["lib/tenant", "lib/auth", "supabase/migrations"] },
  { id: "guards", title: "Feature & route guards", subtitle: "Entitlements · role checks · RLS", kind: "platform", x: 302, y: 396, icon: ShieldCheck, detail: "Combines feature entitlements, role checks, protected routes, and database policies to control access at multiple layers.", paths: ["lib/features", "lib/auth/guards.ts", "middleware.ts"] },
  { id: "api", title: "Application services", subtitle: "Server actions · API routes", kind: "platform", x: 302, y: 546, icon: Braces, detail: "Server-side services apply business rules and scope each operation to the signed-in user and active organisation.", paths: ["app/api", "lib"] },
  { id: "rundown", title: "Rundown builder", subtitle: "Service programme · timer setup", kind: "experience", x: 564, y: 96, icon: Clapperboard, detail: "A service rundown contains ordered programme items and the timer configuration used during a live service.", paths: ["app/(dashboard)/rundown", "components/rundown"] },
  { id: "timer", title: "Rundown timer controller", subtitle: "Start · pause · warning rules", kind: "platform", x: 564, y: 246, icon: Timer, detail: "The live controller tracks timer state and configured warning points/messages, then drives the live display as time changes.", paths: ["components/rundown/live-view.tsx", "lib/rundown", "types/rundown.ts"] },
  { id: "display", title: "Rundown display", subtitle: "Live timer · messages · current item", kind: "experience", x: 564, y: 396, icon: MonitorPlay, detail: "Display views render the current service item, timer, and any configured time warning for the congregation or production team.", paths: ["components/rundown/display-view.tsx", "app/(dashboard)/rundown"] },
  { id: "obs", title: "OBS docks", subtitle: "Bible · lyrics · rundown display", kind: "realtime", x: 564, y: 546, icon: Radio, detail: "OBS/CEF docks use parish-bound broadcast rooms without granting access to normal dashboard or administrative routes.", paths: ["app/bible/obs/dock", "app/lyrics/obs/dock", "app/api/lyrics/room/claim"] },
  { id: "auth-provider", title: "Supabase Auth & email", subtitle: "Identity provider · confirmations", kind: "data", x: 826, y: 96, icon: LockKeyhole, detail: "Managed identity and email delivery provide account confirmation and sign-in links to the application callback.", paths: ["lib/supabase", "app/auth/callback"] },
  { id: "postgres", title: "Postgres & RLS", subtitle: "Fusion data · tenant policies", kind: "data", x: 826, y: 246, icon: Database, detail: "Postgres stores Fusion records. Row-level security policies provide database-level enforcement for scoped data.", paths: ["supabase/migrations", "lib/supabase"] },
  { id: "realtime", title: "Realtime channels", subtitle: "Broadcasts · live state", kind: "realtime", x: 826, y: 396, icon: Radio, detail: "Realtime channels distribute supported live changes to connected displays and service workflows.", paths: ["app/api", "components/rundown", "app/(dashboard)/bible/obs"] },
  { id: "delivery", title: "Notification delivery", subtitle: "Events · preferences · providers", kind: "data", x: 826, y: 546, icon: Bell, detail: "Notification endpoints and delivery providers record and distribute user-facing system events.", paths: ["app/api/notifications", "app/(dashboard)/admin/notifications"] },
]

const edges = [
  ["web", "auth"], ["web", "tenant"], ["web", "guards"], ["web", "modules"],
  ["auth", "auth-provider"], ["tenant", "api"], ["tenant", "postgres"], ["guards", "api"], ["guards", "postgres"],
  ["modules", "api"], ["worship", "api"], ["notification-ui", "api"], ["api", "postgres"], ["api", "delivery"], ["api", "realtime"],
  ["rundown", "timer"], ["timer", "display"], ["timer", "realtime"], ["display", "obs"], ["display", "realtime"],
  ["worship", "obs"], ["obs", "realtime"], ["notification-ui", "delivery"],
] as const

const kindLabel: Record<NodeKind, string> = {
  experience: "Experience", platform: "Platform", data: "Data & identity", realtime: "Live systems",
}
const kindStyle: Record<NodeKind, string> = {
  experience: "border-violet-500/35 bg-violet-500/10 text-violet-700 dark:text-violet-200",
  platform: "border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-200",
  data: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-200",
  realtime: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-200",
}
const nodeWidth = 196
const nodeHeight = 82

/** Read-only, lightweight map of Fusion's primary application boundaries. */
export function ArchitectureMap() {
  const [selectedId, setSelectedId] = useState("web")
  const [query, setQuery] = useState("")
  const [scale, setScale] = useState(1)
  const selected = nodes.find((node) => node.id === selectedId) ?? nodes[0]
  const visibleIds = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return new Set(nodes.map((node) => node.id))
    return new Set(nodes.filter((node) => `${node.title} ${node.subtitle} ${node.detail} ${node.paths.join(" ")}`.toLowerCase().includes(term)).map((node) => node.id))
  }, [query])
  const connected = useMemo<Set<string>>(() => new Set(edges.flatMap(([from, to]) => from === selectedId ? [from, to] : to === selectedId ? [from, to] : [])), [selectedId])

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-3">
        <MapStat icon={Workflow} label="Mapped areas" value="16" detail="Core Fusion domains and workflows" />
        <MapStat icon={ArrowRight} label="Connections" value={String(edges.length)} detail="Request and live event pathways" />
        <MapStat icon={Activity} label="Map mode" value="Read only" detail="No actions or data writes" />
      </div>

      <Card className="overflow-hidden border-border/70 shadow-sm">
        <CardHeader className="gap-4 border-b bg-muted/20 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base"><Workflow className="h-4 w-4 text-violet-500" /> Fusion system map</CardTitle>
            <CardDescription className="mt-1">Select a node to inspect its role and related code areas.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <label className="relative min-w-[190px] flex-1 sm:flex-none">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a system area" className="h-9 pl-8 sm:w-[210px]" aria-label="Find a system area" />
            </label>
            <div className="flex items-center rounded-md border bg-background">
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom out" onClick={() => setScale((value) => Math.max(0.75, Math.round((value - 0.1) * 10) / 10))}><Minus className="h-3.5 w-3.5" /></Button>
              <span className="w-12 text-center text-xs tabular-nums text-muted-foreground">{Math.round(scale * 100)}%</span>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Zoom in" onClick={() => setScale((value) => Math.min(1.4, Math.round((value + 0.1) * 10) / 10))}><Plus className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Reset zoom" onClick={() => setScale(1)}><RotateCcw className="h-3.5 w-3.5" /></Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-auto bg-[radial-gradient(hsl(var(--muted-foreground)/.18)_1px,transparent_1px)] [background-size:20px_20px]" role="region" aria-label="Interactive Fusion system architecture map" tabIndex={0}>
            <div className="relative mx-auto h-[670px] min-w-[1080px]" style={{ width: `${1080 * scale}px`, height: `${670 * scale}px` }}>
              <div className="absolute left-0 top-0 origin-top-left" style={{ width: 1080, height: 670, transform: `scale(${scale})` }}>
                <div className="absolute left-10 right-10 top-6 grid grid-cols-4 text-[10px] font-semibold uppercase tracking-[.16em] text-muted-foreground">
                  <span>Fusion experience</span><span>Identity &amp; access</span><span>Service workflows</span><span>Data &amp; delivery</span>
                </div>
                <svg className="absolute inset-0 h-full w-full" viewBox="0 0 1080 670" aria-hidden="true">
                  <defs><marker id="fusion-map-arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" className="fill-muted-foreground/50" /></marker></defs>
                  {edges.map(([fromId, toId]) => {
                    const from = nodes.find((node) => node.id === fromId)!
                    const to = nodes.find((node) => node.id === toId)!
                    const sameColumn = from.x === to.x
                    const forward = from.x < to.x
                    const x1 = sameColumn ? from.x + nodeWidth / 2 : forward ? from.x + nodeWidth : from.x
                    const y1 = sameColumn ? from.y + nodeHeight : from.y + nodeHeight / 2
                    const x2 = sameColumn ? to.x + nodeWidth / 2 : forward ? to.x : to.x + nodeWidth
                    const y2 = sameColumn ? to.y : to.y + nodeHeight / 2
                    const bend = x1 + (x2 - x1) * 0.52
                    const path = sameColumn
                      ? `M ${x1} ${y1} C ${x1} ${y1 + 34}, ${x2} ${y2 - 34}, ${x2} ${y2}`
                      : `M ${x1} ${y1} C ${bend} ${y1}, ${bend} ${y2}, ${x2} ${y2}`
                    const active = connected.has(fromId) && connected.has(toId)
                    return <path key={`${fromId}-${toId}`} d={path} fill="none" stroke="currentColor" strokeWidth={active ? 2 : 1.5} strokeDasharray={active ? undefined : "5 5"} markerEnd="url(#fusion-map-arrow)" className={cn("text-muted-foreground/30 transition-colors", active && "text-violet-500/80")} />
                  })}
                </svg>
                {nodes.map((node) => {
                  const Icon = node.icon
                  const visible = visibleIds.has(node.id)
                  const active = connected.has(node.id)
                  return (
                    <button key={node.id} type="button" onClick={() => setSelectedId(node.id)} aria-pressed={selectedId === node.id} aria-label={`${node.title}: ${node.subtitle}`} className={cn("absolute flex h-[82px] w-[196px] flex-col justify-center rounded-xl border bg-card px-3 text-left shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500", selectedId === node.id ? "z-10 border-violet-500 shadow-md shadow-violet-500/10 ring-1 ring-violet-500/30" : active ? "border-violet-300 dark:border-violet-800" : "border-border/80", !visible && "pointer-events-none opacity-15 grayscale")} style={{ left: node.x, top: node.y }}>
                      <span className="flex items-center gap-2">
                        <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border", kindStyle[node.kind])}><Icon className="h-4 w-4" /></span>
                        <span className="min-w-0">
                          <span className="block truncate text-xs font-semibold">{node.title}</span>
                          <span className="mt-0.5 block truncate text-[10px] text-muted-foreground">{node.subtitle}</span>
                        </span>
                      </span>
                      <span className="mt-2 flex items-center justify-between">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground">{kindLabel[node.kind]}</span>
                        <ArrowDownRight className="h-3 w-3 text-muted-foreground/60" />
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
          <div className="flex flex-wrap gap-x-4 gap-y-2 border-t px-4 py-3">
            {(Object.keys(kindLabel) as NodeKind[]).map((kind) => <span key={kind} className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"><span className={cn("h-2 w-2 rounded-full", kind === "experience" ? "bg-violet-500" : kind === "platform" ? "bg-sky-500" : kind === "data" ? "bg-emerald-500" : "bg-amber-500")} />{kindLabel[kind]}</span>)}
          </div>
        </CardContent>
      </Card>

      <Card className="border-violet-500/20 bg-gradient-to-r from-violet-500/[.06] via-background to-sky-500/[.04]">
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:p-5">
          <div className="flex gap-3">
            <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl border", kindStyle[selected.kind])}><selected.icon className="h-5 w-5" /></span>
            <div>
              <div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold">{selected.title}</h3><Badge variant="outline" className="text-[10px]">{kindLabel[selected.kind]}</Badge></div>
              <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{selected.detail}</p>
            </div>
          </div>
          <div className="sm:max-w-[300px] sm:text-right">
            <p className="mb-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Related areas</p>
            <div className="flex flex-wrap gap-1.5 sm:justify-end">{selected.paths.map((path) => <code key={path} className="rounded-md border bg-background/80 px-2 py-1 text-[10px] text-muted-foreground">{path}</code>)}</div>
          </div>
        </CardContent>
      </Card>
      <p className="text-xs text-muted-foreground">The map shows major application boundaries; it is an architectural guide and does not expose credentials or provide database execution controls.</p>
    </div>
  )
}

function MapStat({ icon: Icon, label, value, detail }: { icon: typeof Boxes; label: string; value: string; detail: string }) {
  return <Card className="border-border/70 shadow-sm"><CardContent className="flex items-center gap-3 p-4"><span className="grid h-9 w-9 place-items-center rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300"><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs text-muted-foreground">{label}</span><span className="block truncate text-sm font-semibold">{value}</span><span className="block truncate text-[10px] text-muted-foreground">{detail}</span></span></CardContent></Card>
}
