"use client"

/**
 * One row in the Worship Library. Compact on purpose: at a few hundred items
 * a dense list is far easier to scan than a grid of large cards, and the
 * metadata that actually helps an operator pick the right item is the type,
 * how many cues it holds and when it was last touched.
 */

import { BookOpen, Copy, ListOrdered, MoreVertical, Music2, Trash2 } from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { ContentType, LyricSet } from "@/lib/lyrics/types"

const TYPE_META: Record<ContentType, { label: string; icon: typeof Music2 }> = {
  song: { label: "Song", icon: Music2 },
  hymn: { label: "Hymn", icon: BookOpen },
  prayer: { label: "Prayer Points", icon: ListOrdered },
}

function relativeTime(ts: number): string {
  const diff = Date.now() - ts
  const day = 86_400_000
  if (diff < day) return "today"
  const days = Math.floor(diff / day)
  if (days === 1) return "yesterday"
  if (days < 30) return `${days} days ago`
  const months = Math.floor(days / 30)
  return months === 1 ? "a month ago" : `${months} months ago`
}

export function LibraryRow({
  set,
  disabled,
  onOpen,
  onDuplicate,
  onDelete,
}: {
  set: LyricSet
  disabled: boolean
  onOpen: () => void
  onDuplicate: () => void
  onDelete: () => void
}) {
  const [confirming, setConfirming] = useState(false)
  const meta = TYPE_META[set.type]
  const Icon = meta.icon
  const cueLabel = set.type === "prayer" ? "points" : "cues"
  const sectionCount = set.sections?.length ?? 0

  return (
    <>
      <div className="group flex items-center gap-3 px-3 py-2.5 transition-colors hover:bg-muted/50">
        <button onClick={onOpen} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground group-hover:text-violet-600 dark:group-hover:text-violet-400">
            <Icon className="h-4 w-4" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-medium group-hover:text-violet-700 dark:group-hover:text-violet-300">
              {set.title}
            </div>
            <div className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
              <span>{meta.label}</span>
              <span>·</span>
              <span>
                {set.groups.length} {cueLabel}
              </span>
              {sectionCount > 0 && (
                <>
                  <span>·</span>
                  <span>
                    {sectionCount} {sectionCount === 1 ? "section" : "sections"}
                  </span>
                </>
              )}
              {set.language && (
                <>
                  <span>·</span>
                  <span>{set.language}</span>
                </>
              )}
              <span>·</span>
              <span>Edited {relativeTime(set.updatedAt)}</span>
            </div>
          </div>
        </button>

        {set.scriptureReference && (
          <Badge variant="outline" className="hidden shrink-0 font-normal sm:inline-flex">
            {set.scriptureReference}
          </Badge>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label={`Actions for ${set.title}`}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onOpen}>Edit</DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate} disabled={disabled}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setConfirming(true)}
              disabled={disabled}
              className="text-red-600 focus:text-red-600"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{set.title}”?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes it from the shared library for everyone, including the OBS dock. It can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={onDelete}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
