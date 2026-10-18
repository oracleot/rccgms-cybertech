"use client"

import { useState, useEffect, useCallback, type FormEvent } from "react"
import {
  Building2,
  Church,
  Users,
  RefreshCw,
  Search,
  MapPin,
  Globe,
  ChevronDown,
  ChevronRight,
  Plus,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

interface Organisation {
  id: string
  name: string
  short_name: string | null
  slug: string
  status: string
  created_at: string
}

interface Parish {
  id: string
  organisation_id: string
  name: string
  spiritual_expression: string | null
  locality: string | null
  region: string | null
  country: string | null
  slug: string
  status: string
  created_at: string
}

interface Membership {
  id: string
  parish_id: string
  profile_id: string
  role: string
  status: string
  profiles?: { name: string; email: string } | null
}

export function ParishManager({ canCreate = true }: { canCreate?: boolean }) {
  const [orgs, setOrgs] = useState<Organisation[]>([])
  const [parishes, setParishes] = useState<Parish[]>([])
  const [members, setMembers] = useState<Record<string, Membership[]>>({})
  const [loading, setLoading] = useState(true)
  const [expandedOrg, setExpandedOrg] = useState<string | null>(null)
  const [expandedParish, setExpandedParish] = useState<string | null>(null)
  const [search, setSearch] = useState("")
  const [createMode, setCreateMode] = useState<"organisation" | "parish" | null>(null)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [form, setForm] = useState({
    name: "",
    short_name: "",
    slug: "",
    organisation_id: "",
    country: "United Kingdom",
    locality: "",
    region: "",
    spiritual_expression: "",
  })

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/developer/parishes")
      if (res.ok) {
        const data = await res.json()
        setOrgs(data.organisations ?? [])
        setParishes(data.parishes ?? [])
      }
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial data fetch on mount
    fetchData()
  }, [fetchData])

  const fetchMembers = async (parishId: string) => {
    if (members[parishId]) return
    try {
      const res = await fetch(`/api/admin/developer/parishes?parish_id=${parishId}&include=members`)
      if (res.ok) {
        const data = await res.json()
        setMembers((prev) => ({ ...prev, [parishId]: data.members ?? [] }))
      }
    } catch {
      // silent
    }
  }

  const toggleParish = (parishId: string) => {
    if (!canCreate) return
    if (expandedParish === parishId) {
      setExpandedParish(null)
    } else {
      setExpandedParish(parishId)
      fetchMembers(parishId)
    }
  }

  const openCreate = (mode: "organisation" | "parish") => {
    setCreateMode(mode)
    setMessage(null)
    setForm((current) => ({ ...current, name: "", short_name: "", slug: "", organisation_id: mode === "parish" ? (orgs[0]?.id ?? "") : "" }))
  }

  const createRecord = async (event: FormEvent) => {
    event.preventDefault()
    if (!createMode) return
    setSaving(true)
    setMessage(null)
    try {
      const response = await fetch("/api/admin/developer/parishes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: createMode, ...form }),
      })
      const result = await response.json().catch(() => null)
      if (!response.ok) throw new Error(result?.error ?? "Could not create record")
      setMessage(`${createMode === "organisation" ? "Organisation" : "Parish"} created.`)
      setCreateMode(null)
      await fetchData()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not create record")
    } finally {
      setSaving(false)
    }
  }

  const filteredOrgs = orgs.filter(
    (o) =>
      !search ||
      o.name.toLowerCase().includes(search.toLowerCase()) ||
      (o.short_name ?? "").toLowerCase().includes(search.toLowerCase()),
  )

  const parishesByOrg = (orgId: string) =>
    parishes.filter(
      (p) =>
        p.organisation_id === orgId &&
        (!search ||
          p.name.toLowerCase().includes(search.toLowerCase()) ||
          (p.locality ?? "").toLowerCase().includes(search.toLowerCase())),
    )

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending_review":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      case "archived":
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
      default:
        return ""
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                Organisations & Parishes
              </CardTitle>
              <CardDescription>
                {orgs.length} organisation{orgs.length !== 1 ? "s" : ""},{" "}
                {parishes.length} parish{parishes.length !== 1 ? "es" : ""}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
              Refresh
            </Button>
          </div>
          {canCreate && <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => openCreate("organisation")}>
              <Plus className="mr-1 h-4 w-4" /> New organisation
            </Button>
            <Button size="sm" variant="secondary" onClick={() => openCreate("parish")} disabled={orgs.length === 0}>
              <Plus className="mr-1 h-4 w-4" /> New parish
            </Button>
          </div>}
        </CardHeader>
        <CardContent>
          {canCreate && createMode && (
            <form onSubmit={createRecord} className="mb-5 rounded-lg border bg-muted/20 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Create {createMode === "organisation" ? "an organisation" : "a parish"}</p>
                  <p className="text-xs text-muted-foreground">This starts the record. Add members and entitlements separately.</p>
                </div>
                <Button type="button" variant="ghost" size="sm" onClick={() => setCreateMode(null)}>Cancel</Button>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input required placeholder="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                <Input required placeholder="Stable slug, e.g. morningstar" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]+/g, "-") })} />
                {createMode === "organisation" ? (
                  <Input placeholder="Short name (optional)" value={form.short_name} onChange={(e) => setForm({ ...form, short_name: e.target.value })} />
                ) : (
                  <select required className="h-10 rounded-md border bg-background px-3 text-sm" value={form.organisation_id} onChange={(e) => setForm({ ...form, organisation_id: e.target.value })}>
                    <option value="">Choose organisation</option>
                    {orgs.map((org) => <option key={org.id} value={org.id}>{org.name}</option>)}
                  </select>
                )}
                {createMode === "parish" && <>
                  <Input required placeholder="Country" value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
                  <Input placeholder="Locality (optional)" value={form.locality} onChange={(e) => setForm({ ...form, locality: e.target.value })} />
                  <Input placeholder="Region (optional)" value={form.region} onChange={(e) => setForm({ ...form, region: e.target.value })} />
                  <Input placeholder="Spiritual expression (optional)" value={form.spiritual_expression} onChange={(e) => setForm({ ...form, spiritual_expression: e.target.value })} />
                </>}
              </div>
              <Button type="submit" disabled={saving}>{saving ? "Creating..." : `Create ${createMode}`}</Button>
            </form>
          )}
          {message && <p className="mb-4 text-sm text-muted-foreground">{message}</p>}
          <div className="mb-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organisations or parishes..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {loading && orgs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">Loading...</div>
          ) : filteredOrgs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">No organisations found</div>
          ) : (
            <div className="space-y-2">
              {filteredOrgs.map((org) => (
                <div key={org.id} className="rounded-lg border">
                  <button
                    className="w-full flex items-center justify-between p-3 hover:bg-accent/50 transition-colors text-left"
                    onClick={() => setExpandedOrg(expandedOrg === org.id ? null : org.id)}
                  >
                    <div className="flex items-center gap-3">
                      {expandedOrg === org.id ? (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      )}
                      <Building2 className="h-4 w-4 text-violet-500" />
                      <div>
                        <span className="font-medium text-sm">{org.name}</span>
                        {org.short_name && (
                          <span className="text-xs text-muted-foreground ml-2">
                            ({org.short_name})
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={cn("text-xs", statusColor(org.status))}>
                        {org.status}
                      </Badge>
                      <Badge variant="secondary" className="text-xs">
                        {parishesByOrg(org.id).length} parishes
                      </Badge>
                    </div>
                  </button>

                  {expandedOrg === org.id && (
                    <div className="border-t px-3 pb-3">
                      {parishesByOrg(org.id).length === 0 ? (
                        <p className="text-sm text-muted-foreground py-3 pl-8">No parishes</p>
                      ) : (
                        <div className="space-y-1 pt-2">
                          {parishesByOrg(org.id).map((parish) => (
                            <div key={parish.id}>
                              <button
                                className="w-full flex items-center justify-between p-2 pl-8 rounded-md hover:bg-accent/30 transition-colors text-left"
                                onClick={() => toggleParish(parish.id)}
                                disabled={!canCreate}
                                aria-expanded={canCreate ? expandedParish === parish.id : undefined}
                              >
                                <div className="flex items-center gap-2">
                                  {canCreate && expandedParish === parish.id ? (
                                    <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : canCreate ? (
                                    <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                                  ) : null}
                                  <Church className="h-4 w-4 text-blue-500" />
                                  <div>
                                    <span className="text-sm font-medium">{parish.name}</span>
                                    {parish.spiritual_expression && (
                                      <span className="text-xs text-muted-foreground ml-1">
                                        — {parish.spiritual_expression}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  {parish.locality && (
                                    <span className="text-xs text-muted-foreground flex items-center gap-1">
                                      <MapPin className="h-3 w-3" />
                                      {parish.locality}
                                      {parish.region ? `, ${parish.region}` : ""}
                                    </span>
                                  )}
                                  <Badge className={cn("text-xs", statusColor(parish.status))}>
                                    {parish.status}
                                  </Badge>
                                </div>
                              </button>

                              {canCreate && expandedParish === parish.id && (
                                <div className="ml-14 mt-1 mb-2 rounded-md border bg-muted/30 p-3">
                                  <div className="text-xs text-muted-foreground space-y-1 mb-3">
                                    <div className="flex gap-2">
                                      <Globe className="h-3.5 w-3.5" />
                                      <span>
                                        {parish.country ?? "Unknown"} · slug: {parish.slug}
                                      </span>
                                    </div>
                                    <div className="font-mono text-[10px] opacity-60">
                                      ID: {parish.id}
                                    </div>
                                  </div>

                                  <div className="text-xs font-medium flex items-center gap-1 mb-2">
                                    <Users className="h-3.5 w-3.5" />
                                    Members
                                  </div>
                                  {!members[parish.id] ? (
                                    <div className="text-xs text-muted-foreground">Loading...</div>
                                  ) : members[parish.id].length === 0 ? (
                                    <div className="text-xs text-muted-foreground">No members</div>
                                  ) : (
                                    <div className="space-y-1">
                                      {members[parish.id].map((m) => (
                                        <div
                                          key={m.id}
                                          className="flex items-center justify-between text-xs"
                                        >
                                          <span>
                                            {m.profiles?.name ?? "Unknown"}{" "}
                                            <span className="text-muted-foreground">
                                              {m.profiles?.email ? `(${m.profiles.email})` : ""}
                                            </span>
                                          </span>
                                          <div className="flex items-center gap-1">
                                            <Badge variant="outline" className="text-[10px] py-0">
                                              {m.role}
                                            </Badge>
                                            <Badge
                                              className={cn(
                                                "text-[10px] py-0",
                                                statusColor(m.status),
                                              )}
                                            >
                                              {m.status}
                                            </Badge>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
