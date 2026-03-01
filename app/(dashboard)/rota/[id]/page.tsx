import { notFound } from "next/navigation"
import Link from "next/link"
import { format } from "date-fns"
import { ArrowLeft, Calendar, Clock, MapPin, Pencil } from "lucide-react"

import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { RotaStatusBadge } from "@/components/rota/rota-status-badge"
import { RotaDetailClient } from "./_components/rota-detail-client"
import type { RotaStatus, AssignmentStatus } from "@/types/rota"

interface RotaDetailPageProps {
  params: Promise<{ id: string }>
}

// Define the shape of the rota data we expect from the query
interface RotaData {
  id: string
  date: string
  status: RotaStatus
  created_at: string
  published_at: string | null
  service: {
    id: string
    name: string
    start_time: string | null
    end_time: string | null
    location: string | null
  } | null
  created_by_user: {
    id: string
    name: string
    avatar_url: string | null
  } | null
  assignments: Array<{
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
  }>
}

export default async function RotaDetailPage({ params }: RotaDetailPageProps) {
  const { id } = await params
  const supabase = await createClient()

  // Get current user's role
  const { data: { user } } = await supabase.auth.getUser()
  let userRole = "member"
  
  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("auth_user_id", user.id)
      .single()
    
    if (profile) {
      userRole = (profile as { role: string }).role
    }
  }

  // Fetch rota with all details
  const { data, error } = await supabase
    .from("rotas")
    .select(`
      *,
      service:services(*),
      created_by_user:profiles!created_by(id, name, avatar_url),
      assignments:rota_assignments(
        *,
        user:profiles(id, name, email, avatar_url),
        position:positions(*, department:departments(*))
      )
    `)
    .eq("id", id)
    .single()

  if (error || !data) {
    notFound()
  }

  // Type assertion for the complex query result
  const rota = data as unknown as RotaData

  const canEdit = userRole === "admin" || userRole === "developer" || userRole === "leader"

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/rota">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">{rota.service?.name}</h1>
              <RotaStatusBadge status={rota.status} />
            </div>
            <p className="text-muted-foreground mt-1">
              {format(new Date(rota.date), "EEEE, MMMM d, yyyy")}
            </p>
          </div>
        </div>
        {canEdit && rota.status === "draft" && (
          <Button asChild>
            <Link href={`/rota/${id}/edit`}>
              <Pencil className="mr-2 h-4 w-4" />
              Edit Rota
            </Link>
          </Button>
        )}
      </div>

      {/* Service Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Service Details</CardTitle>
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

      {/* Assignments Section */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Team Assignments</CardTitle>
          <CardDescription>
            {rota.assignments?.length || 0} volunteers assigned
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RotaDetailClient
            rotaId={rota.id}
            rotaStatus={rota.status}
            assignments={rota.assignments || []}
            canEdit={canEdit}
          />
        </CardContent>
      </Card>

      {/* Footer info */}
      <div className="text-sm text-muted-foreground">
        Created by {rota.created_by_user?.name || "Unknown"} on{" "}
        {format(new Date(rota.created_at), "MMM d, yyyy 'at' h:mm a")}
        {rota.published_at && (
          <>
            <Separator orientation="vertical" className="mx-2 inline h-4" />
            Published on {format(new Date(rota.published_at), "MMM d, yyyy 'at' h:mm a")}
          </>
        )}
      </div>
    </div>
  )
}
