"use client"

import { useState, useEffect } from "react"
import { ArrowRightLeft, CheckCircle2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { SwapRequestCard, type SwapRequestCardData } from "./swap-request-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import type { SwapStatus } from "@/types/rota"

interface LeaderSwapDashboardProps {
  className?: string
}

export function LeaderSwapDashboard({ className }: LeaderSwapDashboardProps) {
  const [pendingApprovals, setPendingApprovals] = useState<SwapRequestCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>("")

  async function fetchPendingApprovals() {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current user's profile ID
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) return
      
      const profileData = profile as { id: string; role: string }
      if (profileData.role !== "admin" && profileData.role !== "leader") {
        return
      }

      setCurrentUserId(profileData.id)

      // Get swap requests with "accepted" status (awaiting leader approval)
      const { data, error } = await supabase
        .from("swap_requests")
        .select(`
          id,
          status,
          reason,
          created_at,
          resolved_at,
          requester:profiles!swap_requests_requester_id_fkey(id, name, avatar_url),
          target_user:profiles!swap_requests_target_user_id_fkey(id, name, avatar_url),
          original_assignment:rota_assignments!swap_requests_original_assignment_id_fkey(
            id,
            rota:rotas(date, service:services(name)),
            position:positions(name, department:departments(name))
          )
        `)
        .eq("status", "accepted")
        .order("created_at", { ascending: true })

      if (error) throw error

      // Define the raw data type
      type SwapRequestRawData = {
        id: string
        status: string
        reason: string | null
        created_at: string
        resolved_at: string | null
        requester: { id: string; name: string; avatar_url: string | null } | null
        target_user: { id: string; name: string; avatar_url: string | null } | null
        original_assignment: {
          id: string
          rota: { date: string; service: { name: string } | null } | null
          position: { name: string; department: { name: string } | null } | null
        } | null
      }

      const rawData = (data || []) as SwapRequestRawData[]

      // Transform data
      const transformedData: SwapRequestCardData[] = rawData.map((item) => {
        return {
          id: item.id,
          status: item.status as SwapStatus,
          reason: item.reason,
          createdAt: item.created_at,
          resolvedAt: item.resolved_at,
          requester: item.requester ? {
            id: item.requester.id,
            name: item.requester.name,
            avatarUrl: item.requester.avatar_url,
          } : {
            id: "",
            name: "Unknown",
            avatarUrl: null,
          },
          targetUser: item.target_user ? {
            id: item.target_user.id,
            name: item.target_user.name,
            avatarUrl: item.target_user.avatar_url,
          } : null,
          assignment: {
            id: item.original_assignment?.id || "",
            date: item.original_assignment?.rota?.date || "",
            serviceName: item.original_assignment?.rota?.service?.name || "Unknown Service",
            positionName: item.original_assignment?.position?.name || "Unknown Position",
            departmentName: item.original_assignment?.position?.department?.name || "Unknown Department",
          },
        }
      })

      setPendingApprovals(transformedData)
    } catch (error) {
      console.error("Error fetching pending approvals:", error)
      toast.error("Failed to load pending approvals")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchPendingApprovals()
  }, [])

  async function handleApprove(id: string) {
    const response = await fetch("/api/rota/swaps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve" }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to approve request")
    }

    toast.success("Swap approved and assignments updated")
    fetchPendingApprovals()
  }

  async function handleReject(id: string) {
    const response = await fetch("/api/rota/swaps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "reject" }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to reject request")
    }

    toast.success("Swap request rejected")
    fetchPendingApprovals()
  }

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[1, 2].map((i) => (
            <Skeleton key={i} className="h-48 w-full rounded-lg" />
          ))}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            <CardTitle>Pending Swap Approvals</CardTitle>
          </div>
          {pendingApprovals.length > 0 && (
            <Badge variant="secondary">
              {pendingApprovals.length} pending
            </Badge>
          )}
        </div>
        <CardDescription>
          Swap requests that need your approval
        </CardDescription>
      </CardHeader>
      <CardContent>
        {pendingApprovals.length === 0 ? (
          <EmptyState
            icon={<CheckCircle2 className="h-6 w-6 text-muted-foreground" />}
            title="All caught up!"
            description="No swap requests are waiting for approval"
          />
        ) : (
          <div className="space-y-4">
            {pendingApprovals.map((request) => (
              <SwapRequestCard
                key={request.id}
                request={request}
                viewerRole="leader"
                currentUserId={currentUserId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
