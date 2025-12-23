"use client"

import { useRouter } from "next/navigation"
import { useState, useTransition } from "react"
import { Shield, Loader2 } from "lucide-react"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import type { Profile, Department } from "@/types/auth"
import type { UserRole } from "@/lib/constants"
import { updateUserRole } from "./actions"

interface UserWithDepartment extends Profile {
  department: Department | null
}

interface RoleEditorModalProps {
  userId: string
  users: UserWithDepartment[]
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

const roleDescriptions: Record<string, string> = {
  admin: "Full access to all features including user management and system settings",
  leader: "Can manage rotas, equipment, rundowns, and approve swap requests",
  volunteer: "Can view schedules, submit availability, and request swaps",
}

export function RoleEditorModal({
  userId,
  users,
  departments,
}: RoleEditorModalProps) {
  const router = useRouter()
  const user = users.find((u) => u.id === userId)
  const [isPending, startTransition] = useTransition()
  const [role, setRole] = useState<UserRole>(user?.role as UserRole || "volunteer")
  const [departmentId, setDepartmentId] = useState<string>(
    user?.department_id || ""
  )

  if (!user) {
    return null
  }

  const handleClose = () => {
    router.push("/admin/users")
  }

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateUserRole({
        userId: user.id,
        role,
        departmentId: departmentId || null,
      })

      if (result.success) {
        toast.success("User updated successfully")
        handleClose()
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update user")
      }
    })
  }

  return (
    <Dialog open onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Edit User Role
          </DialogTitle>
          <DialogDescription>
            Change role and department assignment for this user
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
            <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
              <SelectTrigger id="role">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="leader">Leader</SelectItem>
                <SelectItem value="volunteer">Volunteer</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {roleDescriptions[role]}
            </p>
          </div>

          {/* Department Selection */}
          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select value={departmentId} onValueChange={setDepartmentId}>
              <SelectTrigger id="department">
                <SelectValue placeholder="Select department" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No Department</SelectItem>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
