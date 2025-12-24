"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Building2, Loader2, Star, Trash2, Plus } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import type { Profile, Department, UserDepartment } from "@/types/auth"

interface UserWithDepartments extends Profile {
  department: Department | null
  user_departments: (UserDepartment & { department: Department })[]
}

interface UserDepartmentsModalProps {
  userId: string
  users: UserWithDepartments[]
  departments: Department[]
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

interface DepartmentAssignment {
  departmentId: string
  isPrimary: boolean
}

export function UserDepartmentsModal({
  userId,
  users,
  departments,
}: UserDepartmentsModalProps) {
  const router = useRouter()
  const user = users.find((u) => u.id === userId)
  const [isPending, startTransition] = useTransition()
  
  // Initialize with current department assignments
  const initialAssignments: DepartmentAssignment[] = user?.user_departments?.map(ud => ({
    departmentId: ud.department_id,
    isPrimary: ud.is_primary,
  })) || []
  
  // Fallback: if no user_departments but has department_id, use that
  const fallbackAssignments: DepartmentAssignment[] = 
    initialAssignments.length === 0 && user?.department_id 
      ? [{ departmentId: user.department_id, isPrimary: true }]
      : initialAssignments
  
  const [assignments, setAssignments] = useState<DepartmentAssignment[]>(fallbackAssignments)

  if (!user) {
    return null
  }

  const handleClose = () => {
    router.push("/admin/users")
  }

  const toggleDepartment = (departmentId: string) => {
    setAssignments(prev => {
      const exists = prev.find(a => a.departmentId === departmentId)
      if (exists) {
        // Remove if unchecking
        const remaining = prev.filter(a => a.departmentId !== departmentId)
        // If we removed the primary, make the first one primary
        if (exists.isPrimary && remaining.length > 0) {
          remaining[0].isPrimary = true
        }
        return remaining
      } else {
        // Add new department
        return [...prev, { departmentId, isPrimary: prev.length === 0 }]
      }
    })
  }

  const setPrimary = (departmentId: string) => {
    setAssignments(prev => 
      prev.map(a => ({
        ...a,
        isPrimary: a.departmentId === departmentId,
      }))
    )
  }

  const handleSave = async () => {
    startTransition(async () => {
      try {
        const response = await fetch("/api/admin/user-departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            departments: assignments,
          }),
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || "Failed to update departments")
        }

        toast.success("Departments updated successfully")
        handleClose()
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update departments")
      }
    })
  }

  const selectedCount = assignments.length

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Manage Departments
          </DialogTitle>
          <DialogDescription>
            Assign this user to one or more departments. The primary department is used for
            scheduling and notifications.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar>
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
            {selectedCount > 0 && (
              <Badge variant="secondary">
                {selectedCount} department{selectedCount !== 1 ? "s" : ""}
              </Badge>
            )}
          </div>

          <Separator />

          {/* Department Selection */}
          <div className="space-y-2">
            <Label>Departments</Label>
            <p className="text-xs text-muted-foreground mb-3">
              Check the departments this user belongs to. Click the star to set as primary.
            </p>
            <ScrollArea className="h-[280px] rounded-md border p-3">
              <div className="space-y-2">
                {departments.map((dept) => {
                  const assignment = assignments.find(a => a.departmentId === dept.id)
                  const isSelected = !!assignment
                  const isPrimary = assignment?.isPrimary || false

                  return (
                    <div
                      key={dept.id}
                      className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                        isSelected ? "bg-muted/50 border-primary/50" : "hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        id={`dept-${dept.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleDepartment(dept.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <Label
                          htmlFor={`dept-${dept.id}`}
                          className="font-medium cursor-pointer"
                        >
                          {dept.name}
                        </Label>
                        {dept.description && (
                          <p className="text-xs text-muted-foreground truncate">
                            {dept.description}
                          </p>
                        )}
                      </div>
                      {isSelected && (
                        <Button
                          type="button"
                          variant={isPrimary ? "default" : "ghost"}
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => setPrimary(dept.id)}
                          title={isPrimary ? "Primary department" : "Set as primary"}
                        >
                          <Star
                            className={`h-4 w-4 ${isPrimary ? "fill-current" : ""}`}
                          />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
          </div>

          {/* Current Assignments Summary */}
          {assignments.length > 0 && (
            <div className="space-y-2">
              <Label className="text-xs text-muted-foreground">Current assignments:</Label>
              <div className="flex flex-wrap gap-2">
                {assignments.map((a) => {
                  const dept = departments.find(d => d.id === a.departmentId)
                  return (
                    <Badge 
                      key={a.departmentId} 
                      variant={a.isPrimary ? "default" : "secondary"}
                      className="gap-1"
                    >
                      {a.isPrimary && <Star className="h-3 w-3 fill-current" />}
                      {dept?.name || "Unknown"}
                    </Badge>
                  )
                })}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isPending}>
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
