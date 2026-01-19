"use client"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, Calendar, Clock, Loader2, MapPin } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { updateRotaAssignments, publishRota, deleteRota } from "@/app/(dashboard)/rota/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { RotaStatusBadge } from "@/components/rota/rota-status-badge"
import { PositionAssignment } from "@/components/rota/position-assignment"
import { Skeleton } from "@/components/ui/skeleton"
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
  positionId: string
  positionName: string
  departmentId: string
  departmentName: string
  departmentColor: string | null
  userId: string | null
  userName: string | null
  userAvatarUrl: string | null
}

interface RotaData {
  id: string
  date: string
  status: RotaStatus
  service: {
    id: string
    name: string
    start_time: string | null
    end_time: string | null
    location: string | null
  } | null
  assignments: Array<{
    id: string
    status: AssignmentStatus
    user: {
      id: string
      name: string
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
  }>
}

export default function EditRotaPage() {
  const router = useRouter()
  const params = useParams()
  const rotaId = params.id as string

  const [rota, setRota] = useState<RotaData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [hasChanges, setHasChanges] = useState(false)

  // Fetch rota data
  useEffect(() => {
    async function fetchRota() {
      setIsLoading(true)
      const supabase = createClient()

      try {
        const { data, error } = await supabase
          .from("rotas")
          .select(`
            *,
            service:services(*),
            assignments:rota_assignments(
              *,
              user:profiles(id, name, avatar_url),
              position:positions(*, department:departments(*))
            )
          `)
          .eq("id", rotaId)
          .single()

        if (error) throw error
        if (!data) {
          toast.error("Rota not found")
          router.push("/rota")
          return
        }

        const rotaData = data as unknown as RotaData
        setRota(rotaData)

        // Transform assignments to the format expected by PositionAssignment
        const transformedAssignments: Assignment[] = (rotaData.assignments || []).map((a) => ({
          id: a.id,
          positionId: a.position.id,
          positionName: a.position.name,
          departmentId: a.position.department.id,
          departmentName: a.position.department.name,
          departmentColor: a.position.department.color,
          userId: a.user?.id || null,
          userName: a.user?.name || null,
          userAvatarUrl: a.user?.avatar_url || null,
        }))

        setAssignments(transformedAssignments)
      } catch (error) {
        console.error("Error fetching rota:", error)
        toast.error("Failed to load rota")
        router.push("/rota")
      } finally {
        setIsLoading(false)
      }
    }

    if (rotaId) {
      fetchRota()
    }
  }, [rotaId, router])

  const handleAssignmentsChange = (newAssignments: Assignment[]) => {
    setAssignments(newAssignments)
    setHasChanges(true)
  }

  const handleSave = async () => {
    if (!rota) return

    setIsSaving(true)
    try {
      // Filter to only assignments with users
      const validAssignments = assignments.filter((a) => a.userId)

      if (validAssignments.length === 0) {
        // If no valid assignments, just clear all assignments
        const result = await updateRotaAssignments({
          rotaId: rota.id,
          assignments: [],
        })

        // Handle case where validation requires at least one assignment
        if (!result.success && result.error.includes("At least one assignment")) {
          // Delete all existing assignments manually
          const supabase = createClient()
          const { error } = await supabase
            .from("rota_assignments")
            .delete()
            .eq("rota_id", rota.id)

          if (error) {
            toast.error("Failed to clear assignments")
            return
          }
        } else if (!result.success) {
          toast.error(result.error)
          return
        }
      } else {
        const assignmentsPayload = validAssignments.map((a) => ({
          positionId: a.positionId,
          userId: a.userId!,
        }))
        
        const result = await updateRotaAssignments({
          rotaId: rota.id,
          assignments: assignmentsPayload,
        })

        if (!result.success) {
          toast.error(result.error)
          return
        }
      }

      toast.success("Rota saved successfully")
      setHasChanges(false)
    } catch {
      toast.error("Failed to save rota")
    } finally {
      setIsSaving(false)
    }
  }

  const handlePublish = async () => {
    if (!rota) return

    // Save first if there are changes
    if (hasChanges) {
      await handleSave()
    }

    setIsPublishing(true)
    try {
      const result = await publishRota({
        rotaId: rota.id,
        notifyVolunteers: true,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Rota published successfully")
      router.push(`/rota/${rota.id}`)
    } catch {
      toast.error("Failed to publish rota")
    } finally {
      setIsPublishing(false)
    }
  }

  const handleDelete = async () => {
    if (!rota) return

    setIsDeleting(true)
    try {
      const result = await deleteRota(rota.id)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Rota deleted")
      router.push("/rota")
    } catch {
      toast.error("Failed to delete rota")
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6 max-w-3xl">
        <div className="flex items-center gap-4">
          <Skeleton className="h-10 w-10" />
          <div>
            <Skeleton className="h-8 w-48 mb-2" />
            <Skeleton className="h-4 w-64" />
          </div>
        </div>
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!rota) {
    return null
  }

  const isPublished = rota.status === "published"

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href={`/rota/${rotaId}`}>
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">Edit Rota</h1>
            <RotaStatusBadge status={rota.status} />
          </div>
          <p className="text-muted-foreground">
            {rota.service?.name} - {format(new Date(rota.date), "EEEE, MMMM d, yyyy")}
          </p>
        </div>
      </div>

      {/* Service Info (read-only) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Details</CardTitle>
          <CardDescription>Service information cannot be changed after creation</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-3">
            <div className="flex items-center gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground" />
              <div>
                <div className="text-sm text-muted-foreground">Date</div>
                <div className="font-medium">
                  {format(new Date(rota.date), "MMMM d, yyyy")}
                </div>
              </div>
            </div>
            {rota.service?.start_time && (
              <div className="flex items-center gap-3">
                <Clock className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Time</div>
                  <div className="font-medium">
                    {rota.service.start_time.slice(0, 5)}
                    {rota.service.end_time && ` - ${rota.service.end_time.slice(0, 5)}`}
                  </div>
                </div>
              </div>
            )}
            {rota.service?.location && (
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-muted-foreground" />
                <div>
                  <div className="text-sm text-muted-foreground">Location</div>
                  <div className="font-medium">{rota.service.location}</div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Position Assignments */}
      <PositionAssignment
        rotaId={rota.id}
        date={rota.date}
        assignments={assignments}
        onAssignmentsChange={handleAssignmentsChange}
        readOnly={isPublished}
      />

      {isPublished && (
        <p className="text-sm text-muted-foreground text-center">
          This rota has been published. To make changes, you would need to unpublish it first.
        </p>
      )}

      {/* Actions */}
      {!isPublished && (
        <div className="flex flex-col sm:flex-row justify-between gap-3">
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" disabled={isDeleting}>
                {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Delete Rota
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this rota and all its assignments.
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <div className="flex gap-3">
            <Button variant="outline" asChild>
              <Link href={`/rota/${rotaId}`}>Cancel</Link>
            </Button>
            <Button
              variant="outline"
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
            >
              {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Draft
            </Button>
            <Button onClick={handlePublish} disabled={isPublishing}>
              {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Publish Rota
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
