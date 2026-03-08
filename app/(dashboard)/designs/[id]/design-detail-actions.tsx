"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { MoreHorizontal, RefreshCw, UserCheck, UserX, CheckCircle, Send, Trash2, UserCog, GitBranch } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { ClaimModal } from "@/components/designs/claim-modal"
import { UpdateStatusModal } from "@/components/designs/update-status-modal"
import { CompleteModal } from "@/components/designs/complete-modal"
import { DeleteModal } from "@/components/designs/delete-modal"
import { ReassignModal } from "@/components/designs/reassign-modal"
import { RaiseSubIssueModal } from "@/components/designs/raise-sub-issue-modal"
import { approveRequest } from "@/app/(dashboard)/designs/actions"
import type { DesignRequestStatus, DesignPriority } from "@/types/designs"
import type { DeliverableFile } from "@/lib/validations/designs"
import { toast } from "sonner"

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
  const [showApproveDialog, setShowApproveDialog] = useState(false)
  const [isApproving, setIsApproving] = useState(false)

  const isTerminal = currentStatus === "completed" || currentStatus === "cancelled"
  const canApprove = ["admin", "lead_developer", "leader"].includes(currentUserRole)
  const canClaim = !isAssigned && !isTerminal
  
  // Submit for Review: assignee when in_progress or revision_requested
  const canSubmitForReview = isAssignee && (currentStatus === "in_progress" || currentStatus === "revision_requested")
  // Approve: senior roles when in review
  const canApproveRequest = canApprove && currentStatus === "review"
  // Unclaim: admin (free) or developer (with reason). No self-unclaim.
  const canUnclaim = isAssigned && !isTerminal && !isAssignee && (currentUserRole === "admin" || currentUserRole === "developer")
  // Update Status: assignee or admin/leader/lead_developer
  const canUpdateStatus = !isTerminal && (isAssignee || isAdminOrLeader)
  // Reassign: admin/leader/lead_developer/developer (only members cannot)
  const canReassign = !isTerminal && ["admin", "lead_developer", "leader", "developer"].includes(currentUserRole)
  // Raise Sub-issue: team members, not for sub-issues or terminal
  const canRaiseSubIssue = !parentId && !isTerminal && ["admin", "lead_developer", "leader", "developer"].includes(currentUserRole)

  const handleRefresh = () => {
    router.refresh()
  }

  const handleApprove = async () => {
    setIsApproving(true)
    try {
      const result = await approveRequest(requestId)
      if (result.success) {
        toast.success("Request approved and completed")
        setShowApproveDialog(false)
        handleRefresh()
      } else {
        toast.error(result.error || "Failed to approve")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsApproving(false)
    }
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

        {canSubmitForReview && (
          <Button
            variant="default"
            size="sm"
            onClick={() => setShowCompleteModal(true)}
          >
            <Send className="h-4 w-4 mr-2" />
            Submit for Review
          </Button>
        )}

        {canApproveRequest && (
          <Button
            variant="default"
            size="sm"
            className="bg-green-600 hover:bg-green-700"
            onClick={() => setShowApproveDialog(true)}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
        )}

        {canUpdateStatus && (
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

            {canReassign && (
              <DropdownMenuItem onClick={() => setShowReassignModal(true)}>
                <UserCog className="h-4 w-4 mr-2" />
                Reassign
              </DropdownMenuItem>
            )}

            {canRaiseSubIssue && (
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

      <AlertDialog open={showApproveDialog} onOpenChange={setShowApproveDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Approve Design Request</AlertDialogTitle>
            <AlertDialogDescription>
              This will mark &quot;{requestTitle}&quot; as completed and notify the requester
              that their design is ready. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isApproving}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleApprove}
              disabled={isApproving}
              className="bg-green-600 hover:bg-green-700"
            >
              {isApproving ? "Approving..." : "Approve & Complete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
