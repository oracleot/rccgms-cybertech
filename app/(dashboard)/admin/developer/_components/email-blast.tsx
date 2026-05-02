"use client"

import { useState, useEffect } from "react"
import { Mail, Send, Loader2, Users, RefreshCw, CheckCircle2, AlertTriangle } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

type RecipientFilter = "all" | "pending_design" | "role_member" | "role_leader" | "custom"

const FILTER_LABELS: Record<RecipientFilter, string> = {
  all: "All Users",
  pending_design: "Pending Design Requests",
  role_member: "All Members",
  role_leader: "All Leaders",
  custom: "Custom Email List",
}

export function EmailBlast() {
  const [filter, setFilter] = useState<RecipientFilter>("all")
  const [subject, setSubject] = useState("")
  const [body, setBody] = useState("")
  const [customEmails, setCustomEmails] = useState("")
  const [recipientCount, setRecipientCount] = useState<number | null>(null)
  const [loadingCount, setLoadingCount] = useState(false)
  const [isSending, setIsSending] = useState(false)
  const [result, setResult] = useState<{ success: number; failed: number; total: number } | null>(null)

  useEffect(() => {
    if (filter === "custom") {
      setRecipientCount(null)
      return
    }
    setLoadingCount(true)
    fetch(`/api/admin/send-email?filter=${filter}`)
      .then((r) => r.json())
      .then((d) => setRecipientCount(d.count ?? 0))
      .catch(() => setRecipientCount(null))
      .finally(() => setLoadingCount(false))
  }, [filter])

  const customCount = filter === "custom"
    ? customEmails.split(/[\n,;]/).map((e) => e.trim()).filter((e) => e.includes("@")).length
    : null

  const displayCount = filter === "custom" ? customCount : recipientCount

  async function handleSend() {
    if (!subject.trim()) { toast.error("Subject is required"); return }
    if (!body.trim()) { toast.error("Email body is required"); return }
    if (filter === "custom" && !customEmails.trim()) { toast.error("Enter at least one email address"); return }

    setIsSending(true)
    setResult(null)
    try {
      const res = await fetch("/api/admin/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subject,
          html: body.replace(/\n/g, "<br>"),
          recipientFilter: filter,
          customEmails: filter === "custom"
            ? customEmails.split(/[\n,;]/).map((e) => e.trim()).filter((e) => e.includes("@"))
            : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? "Failed to send"); return }
      setResult({ success: data.success, failed: data.failed, total: data.total })
      toast.success(`Sent to ${data.success} of ${data.total} recipients`)
    } catch {
      toast.error("Failed to send emails")
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Recipient Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Users className="h-4 w-4" />
            Recipients
          </CardTitle>
          <CardDescription>Choose who receives this email</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <Select value={filter} onValueChange={(v) => setFilter(v as RecipientFilter)}>
              <SelectTrigger className="w-[260px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(FILTER_LABELS) as RecipientFilter[]).map((key) => (
                  <SelectItem key={key} value={key}>{FILTER_LABELS[key]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {loadingCount ? (
                <RefreshCw className="h-3.5 w-3.5 animate-spin" />
              ) : displayCount !== null ? (
                <Badge variant="secondary">{displayCount} recipients</Badge>
              ) : null}
            </div>
          </div>

          {filter === "custom" && (
            <div className="space-y-1.5">
              <Label className="text-xs">Email addresses (one per line, or comma/semicolon separated)</Label>
              <textarea
                className="w-full h-24 rounded-md border p-2 text-sm font-mono resize-none bg-background"
                placeholder="person@example.com&#10;another@example.com"
                value={customEmails}
                onChange={(e) => setCustomEmails(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Email Composer */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Compose Email
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="email-subject">Subject</Label>
            <Input
              id="email-subject"
              placeholder="e.g., Action Required: Design submission pending"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="email-body">Body</Label>
            <textarea
              id="email-body"
              className="w-full h-40 rounded-md border p-3 text-sm resize-none bg-background"
              placeholder="Hi [name],&#10;&#10;This is a reminder that your design submission is pending..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Plain text or basic HTML. Line breaks are converted to &lt;br&gt; tags automatically.</p>
          </div>

          <Separator />

          {/* Preview of what will send */}
          {subject && body && (
            <div className="rounded-md border bg-muted/30 p-3 space-y-1.5 text-xs">
              <p className="font-medium text-muted-foreground">Preview</p>
              <p><span className="text-muted-foreground">To:</span> {displayCount ?? "?"} recipient{displayCount !== 1 ? "s" : ""}</p>
              <p><span className="text-muted-foreground">Subject:</span> {subject}</p>
              <p className="text-muted-foreground line-clamp-2">{body.slice(0, 120)}{body.length > 120 ? "..." : ""}</p>
            </div>
          )}

          <Button
            onClick={handleSend}
            disabled={isSending || !subject.trim() || !body.trim() || displayCount === 0}
            className="w-full"
          >
            {isSending ? (
              <><Loader2 className="h-4 w-4 animate-spin mr-2" />Sending...</>
            ) : (
              <><Send className="h-4 w-4 mr-2" />Send to {displayCount ?? "?"} recipients</>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result */}
      {result && (
        <Card className={cn(result.failed === 0 ? "border-green-200 dark:border-green-900" : "border-amber-200 dark:border-amber-900")}>
          <CardContent className="pt-4">
            <div className="flex items-start gap-3">
              {result.failed === 0 ? (
                <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
              )}
              <div className="space-y-0.5">
                <p className="text-sm font-medium">
                  {result.success} sent, {result.failed} failed out of {result.total}
                </p>
                {result.failed > 0 && (
                  <p className="text-xs text-muted-foreground">Check RESEND_API_KEY configuration if failures are unexpected.</p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
