"use client"

import { useState, useEffect } from "react"
import { Loader2, UserCog, Star, CalendarIcon } from "lucide-react"
import { format } from "date-fns"
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
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { cn } from "@/lib/utils"
import { reassignRequest } from "@/app/(dashboard)/designs/actions"
import { createClient } from "@/lib/supabase/client"
import type { ReassignMultiInput } from "@/lib/validations/designs"

interface User {
  id: string
  name: string
  role: string
  email: string
}

interface SelectedAssignee {
  profileId: string
  isLead: boolean
}

interface ReassignModalProps {
  requestId: string
  requestTitle: string
  currentAssigneeId: string | null
  currentUserRole: "admin" | "leader" | "lead_developer" | "developer"
  currentAssignments?: Array<{ profile_id: string; is_lead: boolean }>
  currentDeadline?: string | null
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
  currentAssignments,
  currentDeadline,
  isOpen,
  onClose,
  onSuccess,
}: ReassignModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [users, setUsers] = useState<User[]>([])
  const [isLoadingUsers, setIsLoadingUsers] = useState(true)
  const [selectedAssignees, setSelectedAssignees] = useState<SelectedAssignee[]>([])
  const [deadline, setDeadline] = useState<Date | undefined>(
    currentDeadline ? new Date(currentDeadline) : undefined
  )

  // Load eligible users
  useEffect(() => {
    if (!isOpen) return

    const loadUsers = async () => {
      setIsLoadingUsers(true)
      try {
        const supabase = createClient()

        let query = supabase
          .from("profiles")
          .select("id, name, email, role")
          .order("name", { ascending: true })

        if (currentUserRole === "leader") {
          query = query.in("role", ["member", "leader"])
        } else {
          query = query.in("role", ["member", "developer", "leader", "lead_developer"])
        }

        const { data, error } = await query

        if (error) {
          console.error("Error loading users:", error)
          setError("Failed to load users")
          return
        }

        setUsers(data as User[])

        // Pre-select from existing assignments or fallback to lead assignee
        if (currentAssignments && currentAssignments.length > 0) {
          setSelectedAssignees(
            currentAssignments.map((a) => ({
              profileId: a.profile_id,
              isLead: a.is_lead,
            }))
          )
        } else if (currentAssigneeId) {
          setSelectedAssignees([{ profileId: currentAssigneeId, isLead: true }])
        }

        // Pre-set deadline
        setDeadline(currentDeadline ? new Date(currentDeadline) : undefined)
      } catch (err) {
        console.error("Error loading users:", err)
        setError("Failed to load users")
      } finally {
        setIsLoadingUsers(false)
      }
    }

    loadUsers()
  }, [isOpen, currentAssigneeId, currentUserRole, currentAssignments, currentDeadline])

  const toggleUser = (userId: string) => {
    setSelectedAssignees((prev) => {
      const existing = prev.find((a) => a.profileId === userId)
      if (existing) {
        // Removing — if they were lead, auto-promote first remaining
        const remaining = prev.filter((a) => a.profileId !== userId)
        if (existing.isLead && remaining.length > 0) {
          remaining[0].isLead = true
        }
        return remaining
      }
      // Adding — if first, make lead
      const isFirst = prev.length === 0
      return [...prev, { profileId: userId, isLead: isFirst }]
    })
  }

  const setLead = (userId: string) => {
    setSelectedAssignees((prev) =>
      prev.map((a) => ({ ...a, isLead: a.profileId === userId }))
    )
  }

  const handleSubmit = async () => {
    if (selectedAssignees.length === 0) {
      setError("Please select at least one assignee")
      return
    }

    if (!selectedAssignees.some((a) => a.isLead)) {
      setError("Please designate a lead assignee")
      return
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const leadAssignee = selectedAssignees.find((a) => a.isLead)!

      const input: ReassignMultiInput = {
        assignees: selectedAssignees,
        deadline: deadline ? deadline.toISOString() : null,
      }

      const result = await reassignRequest(requestId, leadAssignee.profileId, input)

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

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-600" />
            Assign Team Members
          </DialogTitle>
          <DialogDescription>
            Select team members for{" "}
            <span className="font-semibold">&quot;{requestTitle}&quot;</span>.
            Designate one person as the lead.
            {currentUserRole === "leader" && (
              <span className="block mt-2 text-xs text-amber-600 dark:text-amber-400">
                As a leader, you can assign to members and other leaders only.
              </span>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Team Members Selection */}
          <div className="space-y-2">
            <Label>Team Members</Label>
            {isLoadingUsers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <ScrollArea className="h-[200px] rounded-md border p-2">
                <div className="space-y-1">
                  {users.map((user) => {
                    const isSelected = selectedAssignees.some(
                      (a) => a.profileId === user.id
                    )
                    const isLead = selectedAssignees.find(
                      (a) => a.profileId === user.id
                    )?.isLead

                    return (
                      <div
                        key={user.id}
                        className={cn(
                          "flex items-center gap-3 rounded-md p-2 hover:bg-muted/50 cursor-pointer",
                          isSelected && "bg-primary/5"
                        )}
                        onClick={() => toggleUser(user.id)}
                      >
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => toggleUser(user.id)}
                        />
                        <Avatar className="h-7 w-7">
                          <AvatarFallback className="text-xs">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium truncate">
                              {user.name}
                            </span>
                            <span className="text-xs text-muted-foreground capitalize">
                              {user.role}
                            </span>
                          </div>
                        </div>
                        {isSelected && (
                          <Button
                            type="button"
                            variant={isLead ? "default" : "ghost"}
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation()
                              setLead(user.id)
                            }}
                          >
                            <Star
                              className={cn(
                                "h-3 w-3 mr-1",
                                isLead && "fill-current"
                              )}
                            />
                            Lead
                          </Button>
                        )}
                      </div>
                    )
                  })}
                </div>
              </ScrollArea>
            )}
          </div>

          {/* Selected Summary */}
          {selectedAssignees.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedAssignees.map((a) => {
                const user = users.find((u) => u.id === a.profileId)
                if (!user) return null
                return (
                  <Badge
                    key={a.profileId}
                    variant={a.isLead ? "default" : "secondary"}
                    className="text-xs"
                  >
                    {a.isLead && <Star className="h-3 w-3 mr-1 fill-current" />}
                    {user.name}
                  </Badge>
                )
              })}
            </div>
          )}

          {/* Deadline Picker */}
          <div className="space-y-2">
            <Label>Deadline (optional)</Label>
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !deadline && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {deadline ? format(deadline, "PPP") : "Set a deadline"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={deadline}
                    onSelect={setDeadline}
                    disabled={(date) => date < new Date()}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              {deadline && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setDeadline(undefined)}
                  className="text-muted-foreground"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

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
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || selectedAssignees.length === 0 || isLoadingUsers}
          >
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Assign ({selectedAssignees.length})
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
