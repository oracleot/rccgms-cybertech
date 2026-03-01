"use client"

import { useState, useEffect } from "react"
import { Loader2, UserCog } from "lucide-react"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { reassignRequest } from "@/app/(dashboard)/designs/actions"
import { createClient } from "@/lib/supabase/client"

interface User {
  id: string
  name: string
  role: string
  email: string
}

interface ReassignModalProps {
  requestId: string
  requestTitle: string
  currentAssigneeId: string | null
  currentUserRole: "admin" | "leader"
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function ReassignModal({
  requestId,
  requestTitle,
  currentAssigneeId,
  currentUserRole,
  isOpen,
  onClose,
  onSuccess,
}: ReassignModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedUserId, setSelectedUserId] = useState<string>("")
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)

  // Load eligible users
  useEffect(() => {
    if (!isOpen) return

    const loadUsers = async () => {
      setIsLoadingUsers(true)
      try {
        const supabase = createClient()
        
        // Fetch users based on current user's role
        let query = supabase
          .from("profiles")
          .select("id, name, email, role")
          .order("name", { ascending: true })

        // Leaders can only see members and other leaders (not admins)
        if (currentUserRole === "leader") {
          query = query.in("role", ["member", "leader"])
        }
        // Admins can see members and leaders (not other admins for design assignment)
        else if (currentUserRole === "admin") {
          query = query.in("role", ["member", "leader"])
        }

        const { data, error } = await query

        if (error) {
          console.error("Error loading users:", error)
          setError("Failed to load users")
          return
        }

        setUsers(data as User[])
        
        // Pre-select current assignee if exists
        if (currentAssigneeId) {
          setSelectedUserId(currentAssigneeId)
        }
      } catch (err) {
        console.error("Error loading users:", err)
        setError("Failed to load users")
      } finally {
        setIsLoadingUsers(false)
      }
    }

    loadUsers()
  }, [isOpen, currentAssigneeId, currentUserRole])

  const handleSubmit = async () => {
    if (!selectedUserId) {
      setError("Please select a user")
      return
    }

    if (selectedUserId === currentAssigneeId) {
      setError("This request is already assigned to this user")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const result = await reassignRequest(requestId, selectedUserId)

      if (!result.success) {
        throw new Error(result.error)
      }

      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  const selectedUser = users.find((u) => u.id === selectedUserId)

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-600" />
            Reassign Design Request
          </DialogTitle>
          <DialogDescription>
            Assign <span className="font-semibold">&quot;{requestTitle}&quot;</span> to a team member.
            {currentUserRole === "leader" && (
              <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400">
                As a leader, you can assign to members and other leaders only.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* User Selection */}
          <div className="space-y-2">
            <Label htmlFor="assignee">Assign to</Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Select
                value={selectedUserId}
                onValueChange={setSelectedUserId}
                disabled={isSubmitting}
              >
                <SelectTrigger id="assignee">
                  <SelectValue placeholder="Select a team member" />
                </SelectTrigger>
                <SelectContent>
                  {users.map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      <div className="flex items-center gap-2">
                        <span>{user.name}</span>
                        <span className="text-xs text-muted-foreground capitalize">
                          ({user.role})
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Selected User Preview */}
          {selectedUser && (
            <div className="rounded-lg border p-3">
              <div className="flex items-center gap-3">
                <Avatar>
                  <AvatarFallback>{getInitials(selectedUser.name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="font-medium">{selectedUser.name}</div>
                  <div className="text-sm text-muted-foreground">{selectedUser.email}</div>
                  <div className="text-xs text-muted-foreground capitalize mt-1">
                    Role: {selectedUser.role}
                  </div>
                </div>
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting || !selectedUserId || isLoadingUsers}>
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Reassign Request
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
