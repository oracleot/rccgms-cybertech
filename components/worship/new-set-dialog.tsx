"use client"

/**
 * New song / hymn / prayer set.
 *
 * Paste is the primary path — nobody types a song in line by line. What is
 * pasted is parsed for Verse/Chorus headings and shown back as a summary
 * *before* saving, so an operator can see what Fusion understood and change
 * the type if it guessed the shape wrong. Nothing recognised is not a
 * failure: the text is kept verbatim as one unlabelled section, and sections
 * can be added in the editor afterwards.
 */

import { useMemo, useState } from "react"
import { BookOpen, ListOrdered, Music2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { splitPrayerPoints } from "@/lib/lyrics/parse"
import { parseSections } from "@/lib/lyrics/sections"
import {
  defaultPresentation,
  flattenSections,
  newSetId,
  sectionTitle,
  type ContentType,
  type LyricSet,
} from "@/lib/lyrics/types"

const TYPES: Array<{ value: ContentType; label: string; hint: string; icon: typeof Music2 }> = [
  { value: "song", label: "Song", hint: "Projected as sung phrases", icon: Music2 },
  { value: "hymn", label: "Hymn", hint: "Projected a verse at a time", icon: BookOpen },
  { value: "prayer", label: "Prayer Points", hint: "One point at a time", icon: ListOrdered },
]

export function NewSetDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (set: LyricSet) => void
}) {
  const [type, setType] = useState<ContentType>("song")
  const [title, setTitle] = useState("")
  const [language, setLanguage] = useState("")
  const [raw, setRaw] = useState("")

  const parsed = useMemo(() => {
    if (!raw.trim()) return null
    if (type === "prayer") {
      const groups = splitPrayerPoints(raw)
      return { groups, sections: undefined, recognised: false, count: groups.length }
    }
    const { sections, recognised } = parseSections(raw, type)
    const groups = flattenSections(sections)
    return { groups, sections, recognised, count: groups.length }
  }, [raw, type])

  const canSave = !!title.trim() && !!parsed?.count

  const save = () => {
    if (!parsed || !canSave) return
    onCreate({
      id: newSetId(),
      type,
      title: title.trim(),
      groups: parsed.groups,
      sections: parsed.sections,
      language: language.trim() || undefined,
      presentation: defaultPresentation(type),
      updatedAt: Date.now(),
    })
  }

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>New worship item</DialogTitle>
          <DialogDescription>
            Paste the words — Fusion will look for Verse and Chorus headings and keep anything it doesn&apos;t
            recognise exactly as you pasted it.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-2">
            {TYPES.map((t) => {
              const Icon = t.icon
              const active = type === t.value
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setType(t.value)}
                  className={`rounded-lg border p-3 text-left transition-colors ${
                    active
                      ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                      : "hover:border-muted-foreground/40"
                  }`}
                >
                  <Icon className={`mb-1.5 h-4 w-4 ${active ? "text-violet-600 dark:text-violet-400" : "text-muted-foreground"}`} />
                  <div className="text-sm font-medium">{t.label}</div>
                  <div className="text-xs text-muted-foreground">{t.hint}</div>
                </button>
              )
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="worship-title">Title</Label>
              <Input
                id="worship-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={type === "prayer" ? "Sunday prayer points" : "How Great Is Our God"}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="worship-language">Language (optional)</Label>
              <Input
                id="worship-language"
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
                placeholder="English"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="worship-paste">{type === "prayer" ? "Points" : "Words"}</Label>
            <Textarea
              id="worship-paste"
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              rows={10}
              className="font-mono text-sm"
              placeholder={
                type === "prayer"
                  ? "1. Pray for the nation\n2. Pray for the church"
                  : "Verse 1\nLine one\nLine two\n\nChorus\nLine one\nLine two"
              }
            />
          </div>

          {parsed && (
            <div className="rounded-lg border bg-muted/40 p-3 text-sm">
              {type === "prayer" ? (
                <p>
                  <span className="font-medium">{parsed.count}</span> point{parsed.count === 1 ? "" : "s"} detected.
                </p>
              ) : parsed.recognised && parsed.sections ? (
                <>
                  <p className="mb-1.5">
                    <span className="font-medium">{parsed.sections.length}</span> section
                    {parsed.sections.length === 1 ? "" : "s"} recognised ·{" "}
                    <span className="font-medium">{parsed.count}</span> cue{parsed.count === 1 ? "" : "s"}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {parsed.sections.map((s) => (
                      <span key={s.id} className="rounded bg-background px-1.5 py-0.5 text-xs">
                        {sectionTitle(s)}
                        {s.repeat ? ` ×${s.repeat}` : ""}
                      </span>
                    ))}
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">
                  No Verse/Chorus headings found — the text is kept as-is ({parsed.count} cue
                  {parsed.count === 1 ? "" : "s"}). You can add sections in the editor.
                </p>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={save} disabled={!canSave}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
