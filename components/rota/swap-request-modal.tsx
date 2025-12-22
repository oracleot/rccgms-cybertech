"use client"

import { useState, useEffect } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { ArrowRightLeft, Loader2, User } from "lucide-react"
import { toast } from "sonner"

import { createSwapRequestSchema, type CreateSwapRequestInput } from "@/lib/validations/rota"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface AssignmentDetails {
  id: string
  rotaId: string
  date: string
  serviceName: string
  positionId: string
  positionName: string
  departmentName: string
}

interface VolunteerOption {
  id: string
  name: string
  avatarUrl: string | null
  isAvailable: boolean
}

interface SwapRequestModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignment: AssignmentDetails | null
  onSuccess?: () => void
}

export function SwapRequestModal({
  open,
  onOpenChange,
  assignment,
  onSuccess,
}: SwapRequestModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([])
  const [loadingVolunteers, setLoadingVolunteers] = useState(false)

  const form = useForm<CreateSwapRequestInput>({
    resolver: zodResolver(createSwapRequestSchema),
    defaultValues: {
      assignmentId: assignment?.id || "",
      targetUserId: undefined,
      reason: "",
    },
  })

  // Update form when assignment changes
  useEffect(() => {
    if (assignment) {
      form.setValue("assignmentId", assignment.id)
    }
  }, [assignment, form])

  // Fetch eligible volunteers when modal opens
  useEffect(() => {
    async function fetchVolunteers() {
      if (!open || !assignment) return

      setLoadingVolunteers(true)
      const supabase = createClient()

      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) return

        // Get all volunteers (excluding the current user)
        // Note: We get all volunteers since users can be assigned to positions outside their primary department
        const { data: volunteersResult } = await supabase
          .from("profiles")
          .select("id, name, avatar_url")
          .neq("auth_user_id", user.id)
          .not("role", "is", null)
          .order("name")

        const volunteersData = (volunteersResult || []) as { id: string; name: string; avatar_url: string | null }[]

        // Check availability for the rota date
        const { data: availabilityResult } = await supabase
          .from("availability")
          .select("user_id, is_available")
          .eq("date", assignment.date)
          .in("user_id", volunteersData.map(v => v.id))

        const availabilityData = (availabilityResult || []) as { user_id: string; is_available: boolean }[]
        const availabilityMap = new Map(
          availabilityData.map(a => [a.user_id, a.is_available])
        )

        const volunteerOptions: VolunteerOption[] = volunteersData.map(v => ({
          id: v.id,
          name: v.name,
          avatarUrl: v.avatar_url,
          // If no availability record, assume available
          isAvailable: availabilityMap.get(v.id) ?? true,
        }))

        // Sort: available first, then by name
        volunteerOptions.sort((a, b) => {
          if (a.isAvailable && !b.isAvailable) return -1
          if (!a.isAvailable && b.isAvailable) return 1
          return a.name.localeCompare(b.name)
        })

        setVolunteers(volunteerOptions)
      } catch (error) {
        console.error("Error fetching volunteers:", error)
        toast.error("Failed to load volunteers")
      } finally {
        setLoadingVolunteers(false)
      }
    }

    fetchVolunteers()
  }, [open, assignment])

  async function onSubmit(data: CreateSwapRequestInput) {
    setIsLoading(true)

    try {
      const response = await fetch("/api/rota/swaps", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || "Failed to create swap request")
      }

      toast.success("Swap request sent successfully")
      form.reset()
      onOpenChange(false)
      onSuccess?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create swap request")
    } finally {
      setIsLoading(false)
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Request Duty Swap
          </DialogTitle>
          <DialogDescription>
            Request another team member to cover your duty. They&apos;ll receive a notification to accept or decline.
          </DialogDescription>
        </DialogHeader>

        {assignment && (
          <div className="bg-muted/50 rounded-lg p-4 space-y-2">
            <h4 className="font-medium text-sm text-muted-foreground">Your Assignment</h4>
            <div className="space-y-1">
              <p className="font-semibold">{assignment.positionName}</p>
              <p className="text-sm text-muted-foreground">
                {assignment.serviceName} • {new Date(assignment.date).toLocaleDateString("en-GB", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              <Badge variant="outline" className="mt-1">
                {assignment.departmentName}
              </Badge>
            </div>
          </div>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="targetUserId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Request Swap With (Optional)</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    value={field.value}
                    disabled={loadingVolunteers}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a team member or leave open" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="open">
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>Open request (anyone can accept)</span>
                        </div>
                      </SelectItem>
                      {volunteers.map((volunteer) => (
                        <SelectItem 
                          key={volunteer.id} 
                          value={volunteer.id}
                          disabled={!volunteer.isAvailable}
                        >
                          <div className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={volunteer.avatarUrl || undefined} />
                              <AvatarFallback className="text-xs">
                                {getInitials(volunteer.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>{volunteer.name}</span>
                            {!volunteer.isAvailable && (
                              <Badge variant="secondary" className="text-xs">
                                Unavailable
                              </Badge>
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Choose a specific person or leave it open for anyone to accept
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="reason"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reason (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., Family commitment, traveling, etc."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    Help others understand why you need to swap
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Request"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
