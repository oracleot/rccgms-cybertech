"use client"

import { useState, useEffect, useCallback, Suspense } from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import { ArrowRightLeft, ChevronRight, Calendar, Loader2 } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import { PendingSwaps } from "@/components/rota/pending-swaps"
import { SwapRequestModal } from "@/components/rota/swap-request-modal"

interface AssignmentDetails {
  id: string
  rotaId: string
  date: string
  serviceName: string
  positionId: string
  positionName: string
  departmentName: string
}

interface LoadedAssignment {
  id: string
  rota: {
    id: string
    date: string
    service: {
      name: string
    } | null
  }
  position: {
    id: string
    name: string
    department: {
      name: string
    }
  }
}

function SwapsPageContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const requestParam = searchParams.get("request")

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [selectedAssignment, setSelectedAssignment] = useState<AssignmentDetails | null>(null)

  // Load a specific assignment by ID (for ?request= param)
  const loadAssignmentById = useCallback(async (assignmentId: string): Promise<AssignmentDetails | null> => {
    const supabase = createClient()

    try {
      const { data: assignmentResult } = await supabase
        .from("rota_assignments")
        .select(`
          id,
          rota:rotas(
            id,
            date,
            service:services(name)
          ),
          position:positions(
            id,
            name,
            department:departments(name)
          )
        `)
        .eq("id", assignmentId)
        .single()

      if (assignmentResult) {
        const assignment = assignmentResult as unknown as LoadedAssignment
        if (assignment.rota && assignment.position) {
          return {
            id: assignment.id,
            rotaId: assignment.rota.id,
            date: assignment.rota.date,
            serviceName: assignment.rota.service?.name || "Service",
            positionId: assignment.position.id,
            positionName: assignment.position.name,
            departmentName: assignment.position.department?.name || "Department",
          }
        }
      }
      return null
    } catch (error) {
      console.error("Error loading assignment:", error)
      return null
    }
  }, [])

  // Handle ?request= query parameter
  useEffect(() => {
    if (requestParam) {
      let cancelled = false
      loadAssignmentById(requestParam).then((result) => {
        if (!cancelled && result) {
          setSelectedAssignment(result)
          setIsModalOpen(true)
        }
      })
      // Clear the query param from URL
      router.replace("/rota/swaps", { scroll: false })
      return () => { cancelled = true }
    }
  }, [requestParam, loadAssignmentById, router])

  function handleModalClose(open: boolean) {
    setIsModalOpen(open)
    if (!open) {
      setSelectedAssignment(null)
    }
  }

  function handleSwapSuccess() {
    // Refresh the page to show updated swaps
    router.refresh()
  }

  return (
    <div className="flex flex-col gap-6">
      {/* Breadcrumbs */}
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/rota" className="hover:text-foreground transition-colors">
          Rota
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">Swap Requests</span>
      </nav>

      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Swap Requests</h1>
          <p className="text-muted-foreground">
            View and manage duty swap requests
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" asChild>
            <Link href="/rota/my-schedule">
              <Calendar className="h-4 w-4 mr-2" />
              My Schedule
            </Link>
          </Button>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4 flex gap-3">
        <ArrowRightLeft className="h-5 w-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="space-y-1">
          <h3 className="font-medium text-blue-900 dark:text-blue-100">How swap requests work</h3>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>• <strong>To request a swap:</strong> Go to <Link href="/rota/my-schedule" className="underline font-medium">My Schedule</Link> and click &quot;Request Swap&quot; on any assignment</li>
            <li>• <strong>Open Requests:</strong> Swap requests available for anyone to accept</li>
            <li>• <strong>Incoming:</strong> Requests specifically asking you to cover a duty</li>
            <li>• <strong>Outgoing:</strong> Your pending swap requests</li>
            <li>• When a swap is accepted, a leader must approve it before assignments update</li>
          </ul>
        </div>
      </div>

      {/* Swap Requests List */}
      <PendingSwaps showTabs={true} />

      {/* Swap Request Modal */}
      <SwapRequestModal
        open={isModalOpen}
        onOpenChange={handleModalClose}
        assignment={selectedAssignment}
        onSuccess={handleSwapSuccess}
      />
    </div>
  )
}

export default function SwapsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    }>
      <SwapsPageContent />
    </Suspense>
  )
}
