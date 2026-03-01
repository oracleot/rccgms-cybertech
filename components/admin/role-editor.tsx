"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Shield, Loader2, Star, Building2, Beaker } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useTestMode } from "@/contexts/test-mode-context"
import type { Profile, Department, UserDepartment } from "@/types/auth"
import type { UserRole } from "@/lib/constants"
import { updateUserRole } from "./actions"

interface UserWithDepartments extends Profile {
  department: Department | null
  user_departments?: (UserDepartment & { department: Department })[]
}

interface RoleEditorModalProps {
  userId: string
  users: UserWithDepartments[]
  departments: Department[]
  currentUserRole: UserRole // Add current user's role for permission checks
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const roleDescriptions: Record<string, string> = {
  admin: "Full access to all features including user management and system settings",
  developer: "Technical/backend access with content management and read-only user viewing",
  leader: "Can manage rotas, equipment, rundowns, and approve swap requests",
  member: "Can view schedules, submit availability, and request swaps",
}

interface DepartmentAssignment {
  departmentId: string
  isPrimary: boolean
}

export function RoleEditorModal({
  userId,
  users,
  departments,
  currentUserRole,
}: RoleEditorModalProps) {
  const router = useRouter()
  const user = users.find((u) => u.id === userId)
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<UserRole>(user?.role as UserRole || "member")
  const { isTestMode, simulateRoleChange } = useTestMode()
  
  // Initialize department assignments from user_departments or fallback to legacy
  const getInitialAssignments = (): DepartmentAssignment[] => {
    if (user?.user_departments && user.user_departments.length > 0) {
      return user.user_departments.map(ud => ({
        departmentId: ud.department_id,
        isPrimary: ud.is_primary,
      }))
    }
    // Fallback to legacy department_id
    if (user?.department_id) {
      return [{ departmentId: user.department_id, isPrimary: true }]
    }
    return []
  }
  
  const [assignments, setAssignments] = useState<DepartmentAssignment[]>(getInitialAssignments())

  if (!user) {
    return null
  }

  // Permission checks for UI
  const isTargetUserAdmin = user.role === "admin"
  const isCurrentUserLeader = currentUserRole === "leader"
  const isDeveloper = currentUserRole === "developer"
  const canEditThisUser = !(isCurrentUserLeader && isTargetUserAdmin)

  // Available roles based on current user's permissions
  const availableRoles: { value: UserRole; label: string; description: string }[] = [
    {
      value: "member",
      label: "Member",
      description: roleDescriptions.member,
    },
    {
      value: "leader",
      label: "Leader",
      description: roleDescriptions.leader,
    },
  ]

  // Only admins can see/assign admin and developer roles
  if (currentUserRole === "admin") {
    availableRoles.push(
      {
        value: "developer",
        label: "Developer",
        description: roleDescriptions.developer,
      },
      {
        value: "admin",
        label: "Admin",
        description: roleDescriptions.admin,
      }
    )
  }

  const handleClose = () => {
    router.push("/admin/users")
  }

  const toggleDepartment = (departmentId: string) => {
    setAssignments(prev => {
      const exists = prev.find(a => a.departmentId === departmentId)
      if (exists) {
        const remaining = prev.filter(a => a.departmentId !== departmentId)
        if (exists.isPrimary && remaining.length > 0) {
          remaining[0].isPrimary = true
        }
        return remaining
      } else {
        return [...prev, { departmentId, isPrimary: prev.length === 0 }]
      }
    })
  }

  const setPrimaryDepartment = (departmentId: string) => {
    setAssignments(prev => 
      prev.map(a => ({
        ...a,
        isPrimary: a.departmentId === departmentId,
      }))
    )
  }

  const handleSave = () => {
    // If developer in test mode, simulate the change
    if (isDeveloper && isTestMode) {
      const previousRole = user.role as UserRole
      simulateRoleChange(user.id, user.name, previousRole, role)
      toast.success("Change simulated", {
        description: "This is a test simulation - no changes were made to the database",
      })
      handleClose()
      return
    }

    // Developer without test mode cannot make changes
    if (isDeveloper && !isTestMode) {
      toast.error("Read-only access", {
        description: "Developers can only make changes in test mode",
      })
      return
    }

    startTransition(async () => {
      // First update role and primary department
      const primaryDept = assignments.find(a => a.isPrimary)
      const result = await updateUserRole({
        userId: user.id,
        role,
        departmentId: primaryDept?.departmentId || null,
      })

      if (!result.success) {
        toast.error(result.error || "Failed to update user")
        return
      }

      // Then update department assignments via API
      try {
        const response = await fetch("/api/admin/user-departments", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId: user.id,
            departments: assignments,
          }),
        })

        if (!response.ok) {
          const data = await response.json()
          throw new Error(data.error || "Failed to update departments")
        }

        toast.success("User updated successfully")
        handleClose()
        router.refresh()
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Failed to update departments")
      }
    })
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit User Role & Departments
            {isDeveloper && isTestMode && (
              <Badge variant="outline" className="ml-auto gap-1 text-orange-600 border-orange-300">
                <Beaker className="h-3 w-3" />
                Test Mode
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {isDeveloper && isTestMode 
              ? "Changes will be simulated only - not applied to production database"
              : "Change role and department assignments for this user"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* User Info */}
          <div className="flex items-center gap-3 rounded-lg border p-3">
            <Avatar>
              <AvatarImage src={user.avatar_url || undefined} />
              <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
            </Avatar>
            <div>
              <div className="font-medium">{user.name}</div>
              <div className="text-sm text-muted-foreground">{user.email}</div>
            </div>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">Role</Label>
            {!canEditThisUser ? (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                <p className="font-medium">Cannot modify admin users</p>
                <p className="text-xs mt-1">Leaders cannot change roles for admin users.</p>
              </div>
            ) : (
              <>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as UserRole)}
                  disabled={!canEditThisUser}
                >
                  <SelectTrigger id="role">
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableRoles.map((roleOption) => (
                      <SelectItem key={roleOption.value} value={roleOption.value}>
                        {roleOption.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {roleDescriptions[role]}
                </p>
                {isCurrentUserLeader && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    As a leader, you can assign member and leader roles only.
                  </p>
                )}
              </>
            )}
          </div>

          <Separator />

          {/* Department Selection - Multi-select */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <Label>Departments</Label>
            </div>
            <p className="text-xs text-muted-foreground">
              Select departments for this user. Click the star to set primary.
            </p>
            <ScrollArea className="h-[180px] rounded-md border p-3">
              <div className="space-y-2">
                {departments.map((dept) => {
                  const assignment = assignments.find(a => a.departmentId === dept.id)
                  const isSelected = !!assignment
                  const isPrimary = assignment?.isPrimary || false

                  return (
                    <div
                      key={dept.id}
                      className={`flex items-center gap-3 rounded-lg border p-2 transition-colors ${
                        isSelected ? "bg-muted/50 border-primary/50" : "hover:bg-muted/30"
                      }`}
                    >
                      <Checkbox
                        id={`role-dept-${dept.id}`}
                        checked={isSelected}
                        onCheckedChange={() => toggleDepartment(dept.id)}
                      />
                      <Label
                        htmlFor={`role-dept-${dept.id}`}
                        className="flex-1 font-medium cursor-pointer"
                      >
                        {dept.name}
                      </Label>
                      {isSelected && (
                        <Button
                          type="button"
                          variant={isPrimary ? "default" : "ghost"}
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setPrimaryDepartment(dept.id)}
                          title={isPrimary ? "Primary department" : "Set as primary"}
                        >
                          <Star
                            className={`h-3 w-3 ${isPrimary ? "fill-current" : ""}`}
                          />
                        </Button>
                      )}
                    </div>
                  )
                })}
              </div>
            </ScrollArea>
            
            {/* Selected Departments Summary */}
            {assignments.length > 0 && (
              <div className="flex flex-wrap gap-1 pt-2">
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
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={isPending}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={isPending || (!canEditThisUser && !(isDeveloper && isTestMode))}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isDeveloper && isTestMode ? "Simulate Change" : "Save Changes"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
