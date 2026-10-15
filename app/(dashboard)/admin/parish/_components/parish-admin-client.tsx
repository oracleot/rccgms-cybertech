"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Users,
  UserPlus,
  Church,
  Shield,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  MapPin,
  Inbox,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

interface Member {
  id: string
  parish_id: string
  profile_id: string
  role: string
  status: string
  requested_at: string | null
  approved_at: string | null
  profiles?: { name: string; email: string } | null
}

interface ParishInfo {
  id: string
  name: string
  spiritual_expression: string | null
  locality: string | null
  region: string | null
  country: string | null
  slug: string
  status: string
  organisation?: { name: string; short_name: string | null } | null
}

interface FeatureInfo {
  slug: string
  name: string
  category: string
  is_default: boolean
  enabled: boolean
}

interface ParishAdminClientProps {
  profileId: string
  profileRole: string
}

export function ParishAdminClient({ profileId: _profileId, profileRole: _profileRole }: ParishAdminClientProps) {
  const [parish, setParish] = useState<ParishInfo | null>(null)
  const [members, setMembers] = useState<Member[]>([])
  const [pendingMembers, setPendingMembers] = useState<Member[]>([])
  const [features, setFeatures] = useState<FeatureInfo[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/admin/parish")
      if (res.ok) {
        const data = await res.json()
        setParish(data.parish ?? null)
        setMembers(data.members ?? [])
        setPendingMembers(data.pendingMembers ?? [])
        setFeatures(data.features ?? [])
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

  const handleMembership = async (membershipId: string, action: "approve" | "decline") => {
    if (!parish) return
    setActionLoading(membershipId)
    try {
      await fetch(`/api/parishes/${parish.id}/memberships`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          membershipId,
          action,
        }),
      })
      await fetchData()
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const requestFeature = async (featureSlug: string) => {
    if (!parish) return
    setActionLoading(featureSlug)
    try {
      const featureRes = await fetch("/api/admin/developer/features")
      if (featureRes.ok) {
        const featureData = await featureRes.json()
        const feature = (featureData.features ?? []).find(
          (f: { slug: string }) => f.slug === featureSlug,
        )
        if (feature) {
          await fetch("/api/admin/developer/features/requests", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "create",
              parish_id: parish.id,
              feature_id: feature.id,
            }),
          })
          await fetchData()
        }
      }
    } catch {
      // silent
    } finally {
      setActionLoading(null)
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
      case "declined":
      case "suspended":
        return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"
      default:
        return ""
    }
  }

  const roleColor = (role: string) => {
    switch (role) {
      case "parish_admin":
        return "bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200"
      case "leader":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
      case "operator":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200"
    }
  }

  if (loading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Loading parish data...
      </div>
    )
  }

  if (!parish) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8 text-muted-foreground">
            <Church className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No parish found</p>
            <p className="text-sm mt-1">
              You need an active parish membership to manage a parish.
              Run the bootstrap endpoint if this is a fresh installation.
            </p>
          </div>
        </CardContent>
      </Card>
    )
  }

  const activeMembers = members.filter((m) => m.status === "active")
  const roleBreakdown = activeMembers.reduce<Record<string, number>>((acc, m) => {
    acc[m.role] = (acc[m.role] ?? 0) + 1
    return acc
  }, {})

  return (
    <Tabs defaultValue="members" className="space-y-4">
      <TabsList>
        <TabsTrigger value="members" className="flex items-center gap-1 text-xs sm:text-sm">
          <Users className="h-4 w-4" />
          <span className="hidden sm:inline">Members</span>
          <Badge variant="secondary" className="ml-1 text-xs">
            {activeMembers.length}
          </Badge>
        </TabsTrigger>
        <TabsTrigger value="requests" className="flex items-center gap-1 text-xs sm:text-sm">
          <Inbox className="h-4 w-4" />
          <span className="hidden sm:inline">Requests</span>
          {pendingMembers.length > 0 && (
            <Badge variant="destructive" className="ml-1 text-xs">
              {pendingMembers.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="profile" className="flex items-center gap-1 text-xs sm:text-sm">
          <Church className="h-4 w-4" />
          <span className="hidden sm:inline">Profile</span>
        </TabsTrigger>
        <TabsTrigger value="features" className="flex items-center gap-1 text-xs sm:text-sm">
          <Shield className="h-4 w-4" />
          <span className="hidden sm:inline">Features</span>
        </TabsTrigger>
      </TabsList>

      {/* Members Tab */}
      <TabsContent value="members" className="space-y-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-sm font-medium">Active Members</CardTitle>
                <CardDescription>
                  {activeMembers.length} member{activeMembers.length !== 1 ? "s" : ""} in{" "}
                  {parish.name}
                </CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={fetchData}>
                <RefreshCw className="h-4 w-4 mr-1" />
                Refresh
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {/* Role breakdown */}
            <div className="flex flex-wrap gap-2 mb-4">
              {Object.entries(roleBreakdown).map(([role, count]) => (
                <Badge key={role} className={cn("text-xs", roleColor(role))}>
                  {role.replace("_", " ")}: {count}
                </Badge>
              ))}
            </div>

            <div className="space-y-2">
              {activeMembers.map((member) => (
                <div
                  key={member.id}
                  className="flex items-center justify-between rounded-md border p-3"
                >
                  <div>
                    <div className="text-sm font-medium">
                      {member.profiles?.name ?? "Unknown"}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {member.profiles?.email ?? ""}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cn("text-xs", roleColor(member.role))}>
                      {member.role.replace("_", " ")}
                    </Badge>
                    {member.approved_at && (
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        Joined {new Date(member.approved_at).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
              ))}
              {activeMembers.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  No active members
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Membership Requests Tab */}
      <TabsContent value="requests" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <UserPlus className="h-4 w-4" />
              Pending Membership Requests
            </CardTitle>
            <CardDescription>
              People who signed up and selected your parish
            </CardDescription>
          </CardHeader>
          <CardContent>
            {pendingMembers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground text-sm">
                <Inbox className="h-8 w-8 mx-auto mb-2 opacity-30" />
                No pending requests
              </div>
            ) : (
              <div className="space-y-2">
                {pendingMembers.map((member) => (
                  <div
                    key={member.id}
                    className="flex items-center justify-between rounded-md border border-amber-200 dark:border-amber-900 p-3"
                  >
                    <div>
                      <div className="text-sm font-medium">
                        {member.profiles?.name ?? "Unknown"}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {member.profiles?.email ?? ""}
                      </div>
                      {member.requested_at && (
                        <div className="text-[10px] text-muted-foreground flex items-center gap-1 mt-1">
                          <Clock className="h-3 w-3" />
                          Requested {new Date(member.requested_at).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-green-600 hover:text-green-700 h-7 text-xs"
                        disabled={actionLoading === member.id}
                        onClick={() => handleMembership(member.id, "approve")}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-600 hover:text-red-700 h-7 text-xs"
                        disabled={actionLoading === member.id}
                        onClick={() => handleMembership(member.id, "decline")}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Decline
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>

      {/* Parish Profile Tab */}
      <TabsContent value="profile" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Church className="h-4 w-4" />
              Parish Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Name</label>
                  <p className="text-sm font-medium">{parish.name}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">
                    Spiritual Expression
                  </label>
                  <p className="text-sm">{parish.spiritual_expression ?? "—"}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Organisation</label>
                  <p className="text-sm">
                    {parish.organisation?.name ?? "—"}
                    {parish.organisation?.short_name && (
                      <span className="text-muted-foreground ml-1">
                        ({parish.organisation.short_name})
                      </span>
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Status</label>
                  <div>
                    <Badge className={cn("text-xs", statusColor(parish.status))}>
                      {parish.status}
                    </Badge>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Location</label>
                  <p className="text-sm flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5 text-muted-foreground" />
                    {[parish.locality, parish.region, parish.country]
                      .filter(Boolean)
                      .join(", ") || "—"}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground">Slug</label>
                  <p className="text-sm font-mono text-muted-foreground">{parish.slug}</p>
                </div>
              </div>
              <div className="pt-2 border-t">
                <label className="text-xs font-medium text-muted-foreground">Parish ID</label>
                <p className="text-xs font-mono text-muted-foreground">{parish.id}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      {/* Features Tab */}
      <TabsContent value="features" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Feature Access
            </CardTitle>
            <CardDescription>
              Features your parish has access to. Contact a platform developer to
              enable additional features.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {features.map((feature) => (
                <div
                  key={feature.slug}
                  className={cn(
                    "flex items-center justify-between rounded-md border p-3",
                    feature.enabled
                      ? "border-green-200/50 dark:border-green-900/50"
                      : "border-muted opacity-60",
                  )}
                >
                  <div className="flex items-center gap-2">
                    {feature.enabled ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="text-sm font-medium">{feature.name}</span>
                    <Badge variant="secondary" className="text-[10px] py-0">
                      {feature.category}
                    </Badge>
                    {feature.is_default && (
                      <Badge variant="outline" className="text-[10px] py-0">
                        included
                      </Badge>
                    )}
                  </div>
                  <div>
                    {feature.enabled ? (
                      <span className="text-xs text-green-600 dark:text-green-400">Active</span>
                    ) : (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs"
                        disabled={actionLoading === feature.slug}
                        onClick={() => requestFeature(feature.slug)}
                      >
                        Request Access
                      </Button>
                    )}
                  </div>
                </div>
              ))}
              {features.length === 0 && (
                <div className="text-center py-6 text-muted-foreground text-sm">
                  Feature data not yet available. Apply the migrations first.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  )
}
