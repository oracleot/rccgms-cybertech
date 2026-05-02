"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  BookPlus,
  ChevronLeft,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  Send,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface CourseRequest {
  id: string
  title: string
  description: string | null
  reason: string | null
  status: "pending" | "approved" | "rejected"
  created_at: string
}

export default function RequestCoursePage() {
  const router = useRouter()
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [reason, setReason] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [myRequests, setMyRequests] = useState<CourseRequest[]>([])
  const [isLoadingRequests, setIsLoadingRequests] = useState(true)

  useEffect(() => {
    async function loadRequests() {
      try {
        const res = await fetch("/api/training/requests")
        if (res.ok) {
          const data = await res.json()
          setMyRequests(data)
        }
      } catch {
        // silently skip
      } finally {
        setIsLoadingRequests(false)
      }
    }
    loadRequests()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!title.trim()) {
      toast.error("Please enter a course title")
      return
    }
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/training/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, description, reason }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? "Failed to submit")
      }
      toast.success("Course request submitted! An admin will review it soon.")
      setTitle("")
      setDescription("")
      setReason("")
      // Reload requests
      const updated = await fetch("/api/training/requests")
      if (updated.ok) setMyRequests(await updated.json())
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to submit request")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="container max-w-2xl py-6 space-y-8">
      {/* Back */}
      <Button variant="ghost" asChild className="-ml-4">
        <Link href="/training">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Training
        </Link>
      </Button>

      {/* Header */}
      <div className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <BookPlus className="h-6 w-6 text-primary" />
          Request a Course
        </h1>
        <p className="text-muted-foreground">
          Don&apos;t see a training track you need? Submit a request and an admin will review it.
        </p>
      </div>

      {/* Request form */}
      <Card>
        <CardHeader>
          <CardTitle>New Course Request</CardTitle>
          <CardDescription>
            Fill in the details below. Be specific so the team can create something useful.
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Course Title <span className="text-destructive">*</span></Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Advanced Camera Operation"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="What should this course cover? What skills should learners gain?"
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Why do you need this?</Label>
              <Textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="How would this course help you or other team members?"
                rows={2}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button type="submit" disabled={isSubmitting || !title.trim()} className="w-full">
              {isSubmitting ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Send className="h-4 w-4 mr-2" />
              )}
              Submit Request
            </Button>
          </CardFooter>
        </form>
      </Card>

      {/* My previous requests */}
      {!isLoadingRequests && myRequests.length > 0 && (
        <>
          <Separator />
          <div className="space-y-3">
            <h2 className="font-semibold">My Previous Requests</h2>
            {myRequests.map((req) => (
              <Card key={req.id} className="text-sm">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{req.title}</p>
                      {req.description && (
                        <p className="text-muted-foreground mt-0.5">{req.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(req.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge
                      variant={
                        req.status === "approved"
                          ? "default"
                          : req.status === "rejected"
                            ? "destructive"
                            : "outline"
                      }
                      className="capitalize shrink-0"
                    >
                      {req.status === "pending" && <Clock className="h-3 w-3 mr-1" />}
                      {req.status === "approved" && <CheckCircle2 className="h-3 w-3 mr-1" />}
                      {req.status === "rejected" && <XCircle className="h-3 w-3 mr-1" />}
                      {req.status}
                    </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
