"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Building2, Loader2 } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { PARISH_ROLE_LABELS, type ParishRole } from "@/lib/parish/types"

export interface ParishChooserOption {
  parishId: string
  parishName: string
  locality: string | null
  role: ParishRole
}

interface ParishChooserProps {
  options: ParishChooserOption[]
}

/**
 * Shown when a user has 2+ active parish memberships and no valid
 * fusion_active_parish cookie. Selecting one POSTs to /api/parish/switch
 * (which re-validates membership server-side) and refreshes the page so the
 * server re-resolves the active parish.
 */
export function ParishChooser({ options }: ParishChooserProps) {
  const router = useRouter()
  const [pendingId, setPendingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function choose(parishId: string) {
    setPendingId(parishId)
    setError(null)
    try {
      const res = await fetch("/api/parish/switch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parishId }),
      })
      if (!res.ok) {
        const data = (await res.json().catch(() => null)) as { error?: string } | null
        setError(data?.error ?? "Could not switch parish. Please try again.")
        setPendingId(null)
        return
      }
      router.refresh()
    } catch {
      setError("Network error. Please try again.")
      setPendingId(null)
    }
  }

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Choose a parish</CardTitle>
          <CardDescription>
            You belong to more than one parish. Select the one you want to work in.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          {options.map((o) => (
            <Button
              key={o.parishId}
              type="button"
              variant="outline"
              className="h-auto w-full justify-start gap-3 px-4 py-3 text-left"
              disabled={pendingId !== null}
              onClick={() => choose(o.parishId)}
            >
              {pendingId === o.parishId ? (
                <Loader2 className="h-5 w-5 shrink-0 animate-spin" />
              ) : (
                <Building2 className="h-5 w-5 shrink-0" />
              )}
              <span className="flex min-w-0 flex-col">
                <span className="truncate font-medium">{o.parishName}</span>
                <span className="truncate text-xs text-muted-foreground">
                  {PARISH_ROLE_LABELS[o.role] ?? o.role}
                  {o.locality ? ` · ${o.locality}` : ""}
                </span>
              </span>
            </Button>
          ))}
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
