"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Send, Trash2, User } from "lucide-react"
import { toast } from "sonner"

import { publishRota, deleteRota } from "@/app/(dashboard)/rota/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import type { RotaStatus, AssignmentStatus } from "@/types/rota"

interface Assignment {
  id: string
  status: AssignmentStatus
  user: {
    id: string
    name: string
    email: string
    avatar_url: string | null
  } | null
  position: {
    id: string
    name: string
    department: {
      id: string
      name: string
      color: string | null
    }
  }
}

interface RotaDetailClientProps {
  rotaId: string
  rotaStatus: RotaStatus
  assignments: Assignment[]
  canEdit: boolean
}

const statusColors: Record<AssignmentStatus, string> = {
  pending: "bg-yellow-500",
  confirmed: "bg-green-500",
  declined: "bg-red-500",
}

export function RotaDetailClient({
  rotaId,
  rotaStatus,
  assignments,
  canEdit,
}: RotaDetailClientProps) {
  const router = useRouter()
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  // Group assignments by department
  const assignmentsByDepartment = assignments.reduce((acc, assignment) => {
    const deptName = assignment.position.department.name
    if (!acc[deptName]) {
      acc[deptName] = {
        color: assignment.position.department.color,
        assignments: [],
      }
    }
    acc[deptName].assignments.push(assignment)
    return acc
  }, {} as Record<string, { color: string | null; assignments: Assignment[] }>)

  const handlePublish = async () => {
    setIsPublishing(true)
    try {
      const result = await publishRota({ rotaId, notifyMembers: true })
      if (result.success) {
        toast.success("Rota published successfully")
        router.refresh()
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to publish rota")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      const result = await deleteRota(rotaId)
      if (result.success) {
        toast.success("Rota deleted successfully")
        router.push("/rota")
      } else {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to delete rota")
    } finally {
      setIsDeleting(false)
    }
  }

  if (assignments.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No members have been assigned yet.
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Assignments by department */}
      <div className="space-y-6">
        {Object.entries(assignmentsByDepartment).map(([deptName, { color, assignments: deptAssignments }]) => (
          <div key={deptName}>
            <div className="flex items-center gap-2 mb-3">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color || "#6b7280" }}
              />
              <h3 className="font-medium">{deptName}</h3>
              <Badge variant="secondary" className="ml-auto">
                {deptAssignments.length}
              </Badge>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {deptAssignments.map((assignment) => (
                <div
                  key={assignment.id}
                  className="flex items-center gap-3 p-3 border rounded-lg"
                >
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={assignment.user?.avatar_url || undefined} />
                    <AvatarFallback>
                      <User className="h-5 w-5" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">
                      {assignment.user?.name || "Unassigned"}
                    </div>
                    <div className="text-sm text-muted-foreground truncate">
                      {assignment.position.name}
                    </div>
                  </div>
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      statusColors[assignment.status]
                    )}
                    title={assignment.status}
                  />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Action buttons for leaders */}
      {canEdit && rotaStatus === "draft" && (
        <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
          <Button onClick={handlePublish} disabled={isPublishing} className="flex-1">
            {isPublishing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Publish Rota
          </Button>
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="mr-2 h-4 w-4" />
                )}
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Rota</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this rota? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}
