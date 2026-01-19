"use client"

import { useState, useEffect, useCallback } from "react"
import { ArrowRightLeft, Inbox, Users, ShieldCheck } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import { createClient } from "@/lib/supabase/client"
import { SwapRequestCard, type SwapRequestCardData } from "./swap-request-card"
import { EmptyState } from "@/components/shared/empty-state"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import type { SwapStatus } from "@/types/rota"

interface PendingSwapsProps {
  className?: string
  showTabs?: boolean
  limit?: number
  onSwapAction?: () => void
}

type TabValue = "open" | "incoming" | "outgoing" | "approval"

export function PendingSwaps({
  className,
  showTabs = true,
  limit,
  onSwapAction,
}: PendingSwapsProps) {
  const [requests, setRequests] = useState<SwapRequestCardData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [currentUserId, setCurrentUserId] = useState<string>("")
  const [currentUserRole, setCurrentUserRole] = useState<string>("")
  const [activeTab, setActiveTab] = useState<TabValue>("open")

  const fetchSwapRequests = useCallback(async () => {
    setIsLoading(true)
    const supabase = createClient()

    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      // Get current user's profile ID and role
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("auth_user_id", user.id)
        .single()

      if (!profile) return

      const profileData = profile as { id: string; role: string }
      setCurrentUserId(profileData.id)
      setCurrentUserRole(profileData.role)

      // Build query for swap requests
      let query = supabase
        .from("swap_requests")
        .select(`
          id,
          status,
          reason,
          decline_reason,
          created_at,
          resolved_at,
          requester:profiles!swap_requests_requester_id_fkey(id, name, avatar_url),
          target_user:profiles!swap_requests_target_user_id_fkey(id, name, avatar_url),
          original_assignment:rota_assignments!swap_requests_original_assignment_id_fkey(
            id,
            rota:rotas(
              date,
              service:services(name)
            ),
            position:positions(
              name,
              department:departments(name)
            )
          )
        `)
        .order("created_at", { ascending: false })

      if (limit) {
        query = query.limit(limit)
      }

      const { data, error } = await query

      if (error) throw error

      // Define the raw data type
      type SwapRequestRawData = {
        id: string
        status: string
        reason: string | null
        decline_reason: string | null
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

      // Transform data to match SwapRequestCardData
      const transformedData: SwapRequestCardData[] = rawData.map((item) => {
        return {
          id: item.id,
          status: item.status as SwapStatus,
          reason: item.reason,
          declineReason: item.decline_reason,
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

      setRequests(transformedData)
    } catch (error) {
      console.error("Error fetching swap requests:", error)
      toast.error("Failed to load swap requests")
    } finally {
      setIsLoading(false)
    }
  }, [limit])

  useEffect(() => {
    fetchSwapRequests()
  }, [fetchSwapRequests])

  async function handleAccept(id: string) {
    const response = await fetch("/api/rota/swaps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "accept" }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to accept request")
    }

    toast.success("Swap request accepted")
    fetchSwapRequests()
    onSwapAction?.()
  }

  async function handleDecline(id: string, reason?: string) {
    const response = await fetch("/api/rota/swaps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "decline", reason }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to decline request")
    }

    toast.success("Swap request declined")
    fetchSwapRequests()
    onSwapAction?.()
  }

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
    fetchSwapRequests()
    onSwapAction?.()
  }

  async function handleReject(id: string, reason?: string) {
    const response = await fetch("/api/rota/swaps", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "reject", reason }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Failed to reject request")
    }

    toast.success("Swap request rejected")
    fetchSwapRequests()
    onSwapAction?.()
  }

  function getViewerRole(request: SwapRequestCardData): "requester" | "target" | "leader" {
    if (request.requester.id === currentUserId) return "requester"
    if (request.targetUser?.id === currentUserId) return "target"
    return "leader"
  }

  // Filter requests based on tab
  // Open requests: no target user, pending status, not requested by current user
  const openRequests = requests.filter(r => 
    r.targetUser === null && 
    r.status === "pending" &&
    r.requester.id !== currentUserId
  )
  // Incoming: targeted at current user
  const incomingRequests = requests.filter(r => 
    r.targetUser?.id === currentUserId && r.status === "pending"
  )
  // Outgoing: requested by current user
  const outgoingRequests = requests.filter(r => 
    r.requester.id === currentUserId
  )
  // Pending approval: accepted requests awaiting leader approval (leaders only)
  const pendingApprovalRequests = requests.filter(r => 
    r.status === "accepted"
  )

  const isLeader = currentUserRole === "admin" || currentUserRole === "leader"

  if (isLoading) {
    return (
      <div className={cn("space-y-4", className)}>
        {[1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-48 w-full rounded-lg" />
        ))}
      </div>
    )
  }

  if (!showTabs) {
    // Simple list without tabs
    if (requests.length === 0) {
      return (
        <EmptyState
          icon={<Inbox className="h-6 w-6 text-muted-foreground" />}
          title="No swap requests"
          description="You don't have any swap requests at the moment"
          className={className}
        />
      )
    }

    return (
      <div className={cn("space-y-4", className)}>
        {requests.map((request) => (
          <SwapRequestCard
            key={request.id}
            request={request}
            viewerRole={getViewerRole(request)}
            currentUserId={currentUserId}
            onAccept={handleAccept}
            onDecline={handleDecline}
            onApprove={handleApprove}
            onReject={handleReject}
          />
        ))}
      </div>
    )
  }

  return (
    <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as TabValue)} className={className}>
      <TabsList className={cn("grid w-full", isLeader ? "grid-cols-4" : "grid-cols-3")}>
        <TabsTrigger value="open" className="flex items-center gap-2">
          <Users className="h-4 w-4 hidden sm:inline" />
          Open
          {openRequests.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {openRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="incoming" className="flex items-center gap-2">
          Incoming
          {incomingRequests.length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {incomingRequests.length}
            </Badge>
          )}
        </TabsTrigger>
        <TabsTrigger value="outgoing" className="flex items-center gap-2">
          Outgoing
          {outgoingRequests.filter(r => ["pending", "accepted"].includes(r.status)).length > 0 && (
            <Badge variant="secondary" className="ml-1">
              {outgoingRequests.filter(r => ["pending", "accepted"].includes(r.status)).length}
            </Badge>
          )}
        </TabsTrigger>
        {isLeader && (
          <TabsTrigger value="approval" className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 hidden sm:inline" />
            Approve
            {pendingApprovalRequests.length > 0 && (
              <Badge variant="destructive" className="ml-1">
                {pendingApprovalRequests.length}
              </Badge>
            )}
          </TabsTrigger>
        )}
      </TabsList>

      <TabsContent value="open" className="mt-4 space-y-4">
        {openRequests.length === 0 ? (
          <EmptyState
            icon={<Users className="h-6 w-6 text-muted-foreground" />}
            title="No open requests"
            description="No open swap requests available to accept"
          />
        ) : (
          openRequests.map((request) => (
            <SwapRequestCard
              key={request.id}
              request={request}
              viewerRole="target"
              currentUserId={currentUserId}
              onAccept={handleAccept}
              onDecline={handleDecline}
              isOpenRequest={true}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="incoming" className="mt-4 space-y-4">
        {incomingRequests.length === 0 ? (
          <EmptyState
            icon={<ArrowRightLeft className="h-6 w-6 text-muted-foreground" />}
            title="No incoming requests"
            description="No one has requested to swap duties with you directly"
          />
        ) : (
          incomingRequests.map((request) => (
            <SwapRequestCard
              key={request.id}
              request={request}
              viewerRole="target"
              currentUserId={currentUserId}
              onAccept={handleAccept}
              onDecline={handleDecline}
            />
          ))
        )}
      </TabsContent>

      <TabsContent value="outgoing" className="mt-4 space-y-4">
        {outgoingRequests.length === 0 ? (
          <EmptyState
            icon={<ArrowRightLeft className="h-6 w-6 text-muted-foreground" />}
            title="No outgoing requests"
            description="You haven't made any swap requests"
          />
        ) : (
          outgoingRequests.map((request) => (
            <SwapRequestCard
              key={request.id}
              request={request}
              viewerRole="requester"
              currentUserId={currentUserId}
            />
          ))
        )}
      </TabsContent>

      {isLeader && (
        <TabsContent value="approval" className="mt-4 space-y-4">
          {pendingApprovalRequests.length === 0 ? (
            <EmptyState
              icon={<ShieldCheck className="h-6 w-6 text-muted-foreground" />}
              title="No pending approvals"
              description="No swap requests awaiting your approval"
            />
          ) : (
            pendingApprovalRequests.map((request) => (
              <SwapRequestCard
                key={request.id}
                request={request}
                viewerRole="leader"
                currentUserId={currentUserId}
                onApprove={handleApprove}
                onReject={handleReject}
              />
            ))
          )}
        </TabsContent>
      )}
    </Tabs>
  )
}
