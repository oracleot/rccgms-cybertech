"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, RefreshCw, UserCheck, UserX, CheckCircle, Trash2, UserCog, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ClaimModal } from "@/components/designs/claim-modal"
import { UpdateStatusModal } from "@/components/designs/update-status-modal"
import { CompleteModal } from "@/components/designs/complete-modal"
import { DeleteModal } from "@/components/designs/delete-modal"
import { ReassignModal } from "@/components/designs/reassign-modal"
import { RaiseSubIssueModal } from "@/components/designs/raise-sub-issue-modal"
import type { DesignRequestStatus, DesignPriority } from "@/types/designs"
import type { DeliverableFile } from "@/lib/validations/designs"

interface DesignDetailActionsProps {
  requestId: string
  requestTitle: string
  currentStatus: DesignRequestStatus
  currentPriority: DesignPriority
  isAssigned: boolean
  isAssignee: boolean
  isAdminOrLeader: boolean
  currentUserRole: "admin" | "lead_developer" | "developer" | "leader" | "member"
  currentAssigneeId: string | null
  currentUserId: string
  existingFiles?: DeliverableFile[]
  currentAssignments?: Array<{ profile_id: string; is_lead: boolean }>
  currentDeadline?: string | null
  parentId?: string | null
}

export function DesignDetailActions({
  requestId,
  requestTitle,
  currentStatus,
  currentPriority,
  isAssigned,
  isAssignee,
  isAdminOrLeader,
  currentUserRole,
  currentAssigneeId,
  currentUserId,
  existingFiles = [],
  currentAssignments,
  currentDeadline,
  parentId,
}: DesignDetailActionsProps) {
  const router = useRouter()
  const [showClaimModal, setShowClaimModal] = useState(false)
  const [claimAction, setClaimAction] = useState<"claim" | "unclaim">("claim")
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [showCompleteModal, setShowCompleteModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [showReassignModal, setShowReassignModal] = useState(false)
  const [showSubIssueModal, setShowSubIssueModal] = useState(false)

  const isTerminal = currentStatus === "completed" || currentStatus === "cancelled"
  const canApprove = ["admin", "lead_developer", "leader"].includes(currentUserRole)
  const canComplete = (isAssignee || canApprove) && currentStatus === "review"
  const canClaim = !isAssigned && !isTerminal
  // Unclaim: admin (free) or developer (with reason). No self-unclaim.
  const canUnclaim = isAssigned && !isTerminal && (currentUserRole === "admin" || currentUserRole === "developer")

  const handleRefresh = () => {
    router.refresh()
  }

  return (
    <>
      <div className="flex items-center gap-2">
        {/* Quick actions for primary workflows */}
        {canClaim && (
          <Button
            variant="default"
            size="sm"
            onClick={() => {
              setClaimAction("claim")
              setShowClaimModal(true)
            }}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Claim
          </Button>
        )}

        {canComplete && (
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setShowCompleteModal(true)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Complete
          </Button>
        )}

        {!isTerminal && (isAssignee || isAdminOrLeader) && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowStatusModal(true)}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Update
          </Button>
        )}

        {/* More actions dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {canUnclaim && (
              <DropdownMenuItem
                onClick={() => {
                  setClaimAction("unclaim")
                  setShowClaimModal(true)
                }}
              >
                <UserX className="h-4 w-4 mr-2" />
                Unclaim
              </DropdownMenuItem>
            )}

            {isAdminOrLeader && !isTerminal && (
              <DropdownMenuItem onClick={() => setShowStatusModal(true)}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Update Status
              </DropdownMenuItem>
            )}

            {isAdminOrLeader && !isTerminal && (currentUserRole === "admin" || currentUserRole === "lead_developer" || currentUserRole === "developer" || currentUserRole === "leader") && (
              <DropdownMenuItem onClick={() => setShowReassignModal(true)}>
                <UserCog className="h-4 w-4 mr-2" />
                Reassign
              </DropdownMenuItem>
            )}

            {!parentId && !isTerminal && ["admin", "lead_developer", "leader", "developer"].includes(currentUserRole) && (
              <DropdownMenuItem onClick={() => setShowSubIssueModal(true)}>
                <GitBranch className="h-4 w-4 mr-2" />
                Raise Sub-issue
              </DropdownMenuItem>
            )}

            {isAdminOrLeader && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => setShowDeleteModal(true)}
                  className="text-red-600 focus:text-red-600"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Request
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Modals */}
      <ClaimModal
        requestId={requestId}
        requestTitle={requestTitle}
        action={claimAction}
        currentUserRole={currentUserRole}
        isOpen={showClaimModal}
        onClose={() => setShowClaimModal(false)}
        onSuccess={() => {
          setShowClaimModal(false)
          handleRefresh()
        }}
      />

      <UpdateStatusModal
        requestId={requestId}
        requestTitle={requestTitle}
        currentStatus={currentStatus}
        currentPriority={currentPriority}
        uploaderId={currentUserId}
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        onSuccess={() => {
          setShowStatusModal(false)
          handleRefresh()
        }}
      />

      <CompleteModal
        requestId={requestId}
        requestTitle={requestTitle}
        uploaderId={currentUserId}
        existingFiles={existingFiles}
        isOpen={showCompleteModal}
        onClose={() => setShowCompleteModal(false)}
        onSuccess={() => {
          setShowCompleteModal(false)
          handleRefresh()
        }}
      />

      <DeleteModal
        requestId={requestId}
        requestTitle={requestTitle}
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onSuccess={() => {
          setShowDeleteModal(false)
          router.push("/designs")
        }}
      />

      <ReassignModal
        requestId={requestId}
        requestTitle={requestTitle}
        currentAssigneeId={currentAssigneeId}
        currentUserRole={currentUserRole as "admin" | "leader" | "lead_developer" | "developer"}
        currentAssignments={currentAssignments}
        currentDeadline={currentDeadline}
        isOpen={showReassignModal}
        onClose={() => setShowReassignModal(false)}
        onSuccess={() => {
          setShowReassignModal(false)
          handleRefresh()
        }}
      />

      <RaiseSubIssueModal
        parentId={requestId}
        parentTitle={requestTitle}
        isOpen={showSubIssueModal}
        onClose={() => setShowSubIssueModal(false)}
        onSuccess={() => {
          setShowSubIssueModal(false)
          handleRefresh()
        }}
      />
    </>
  )
}
