"use client"

import { useState, useCallback } from "react"
import { ClipboardPaste, AlertTriangle, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { parseWhatsAppRundown, type ParsedRundownItem } from "@/lib/rundown/whatsapp-parser"
import { addRundownItem } from "@/app/(dashboard)/rundown/actions"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import type { RundownItemType } from "@/types/rundown"

interface PasteRundownModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rundownId: string
  existingItemCount: number
  onImported: () => void
}

type Step = "paste" | "preview"

const TYPE_LABELS: Record<string, string> = {
  song: "Song",
  sermon: "Sermon",
  announcement: "Announcement",
  video: "Video",
  prayer: "Prayer",
  transition: "Transition",
  offering: "Offering",
}

function buildNotes(item: ParsedRundownItem): string | undefined {
  const parts: string[] = []
  if (item.startTime && item.endTime) parts.push(`${item.startTime}–${item.endTime}`)
  else if (item.startTime) parts.push(`From ${item.startTime}`)
  if (item.assignedTo) parts.push(item.assignedTo)
  return parts.length > 0 ? parts.join(" | ") : undefined
}

export function PasteRundownModal({
  open,
  onOpenChange,
  rundownId,
  existingItemCount,
  onImported,
}: PasteRundownModalProps) {
  const [step, setStep] = useState<Step>("paste")
  const [text, setText] = useState("")
  const [items, setItems] = useState<ParsedRundownItem[]>([])
  const [unrecognised, setUnrecognised] = useState<string[]>([])
  const [importing, setImporting] = useState(false)
  const [imported, setImported] = useState(false)

  const reset = useCallback(() => {
    setStep("paste")
    setText("")
    setItems([])
    setUnrecognised([])
    setImporting(false)
    setImported(false)
  }, [])

  const handleClose = (open: boolean) => {
    if (!open) reset()
    onOpenChange(open)
  }

  const handlePreview = () => {
    const result = parseWhatsAppRundown(text)
    setItems(result.items)
    setUnrecognised(result.unrecognised)
    setStep("preview")
  }

  const handleImport = async () => {
    if (importing || imported) return
    setImporting(true)

    for (const item of items) {
      const result = await addRundownItem({
        rundownId,
        type: item.type as RundownItemType,
        title: item.title,
        durationSeconds: (item.durationMinutes ?? 0) * 60,
        notes: buildNotes(item),
      })
      if (!result.success) {
        toast.error(`Failed to add "${item.title}": ${result.error}`)
        setImporting(false)
        return
      }
    }

    setImporting(false)
    setImported(true)
    toast.success(`${items.length} items imported`)
    onImported()
    setTimeout(() => handleClose(false), 600)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardPaste className="h-5 w-5" />
            Paste Rundown
          </DialogTitle>
          <DialogDescription>
            Paste a programme from WhatsApp and import the items.
          </DialogDescription>
        </DialogHeader>

        {step === "paste" && (
          <>
            <textarea
              className="flex-1 min-h-[200px] w-full rounded-md border bg-background px-3 py-2 text-sm font-mono resize-y"
              placeholder={"Paste your WhatsApp programme here...\n\nExample:\n1.) Opening Prayer - 10:00-10:15 *(15mins)* (Dcns. Modupe)"}
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button onClick={handlePreview} disabled={!text.trim()}>
                Preview
              </Button>
            </DialogFooter>
          </>
        )}

        {step === "preview" && (
          <>
            {existingItemCount > 0 && (
              <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950 px-3 py-2 text-sm">
                <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
                <span>
                  This rundown already has {existingItemCount} item{existingItemCount !== 1 ? "s" : ""}. Importing will <strong>add</strong> {items.length} new item{items.length !== 1 ? "s" : ""} after them.
                </span>
              </div>
            )}

            <div className="flex-1 overflow-y-auto space-y-1 min-h-0">
              {items.length === 0 && unrecognised.length === 0 && (
                <p className="text-sm text-muted-foreground py-4 text-center">
                  No items found. Check your paste format.
                </p>
              )}

              {items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 rounded-md border px-3 py-2 text-sm">
                  <span className="text-muted-foreground font-mono w-5 shrink-0 text-right">{item.order}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-medium">{item.title}</span>
                      <Badge variant="outline" className="text-[10px] px-1.5 py-0">
                        {TYPE_LABELS[item.type] ?? item.type}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-0.5 flex flex-wrap gap-x-3">
                      {item.startTime && item.endTime && (
                        <span>{item.startTime}&ndash;{item.endTime}</span>
                      )}
                      {item.durationMinutes != null && (
                        <span>{item.durationMinutes} min</span>
                      )}
                      {item.assignedTo && (
                        <span>{item.assignedTo}</span>
                      )}
                    </div>
                  </div>
                  <Check className="h-4 w-4 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                </div>
              ))}

              {unrecognised.map((line, i) => (
                <div key={`u-${i}`} className="flex items-start gap-2 rounded-md border border-dashed px-3 py-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 shrink-0 mt-0.5" />
                  <span className="text-muted-foreground break-all">{line}</span>
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 shrink-0">
                    unrecognised
                  </Badge>
                </div>
              ))}
            </div>

            <DialogFooter className="gap-2">
              <Button variant="outline" onClick={() => setStep("paste")} disabled={importing}>
                Back
              </Button>
              <Button
                onClick={handleImport}
                disabled={items.length === 0 || importing || imported}
                className={cn(imported && "bg-green-600 hover:bg-green-600")}
              >
                {importing && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                {imported ? "Imported" : `Import ${items.length} item${items.length !== 1 ? "s" : ""}`}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
