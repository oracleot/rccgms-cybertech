"use client"

/**
 * Editor for one library item.
 *
 * Every set is editable, including everything already imported — correcting
 * an import is the common case, not the exception. A set that has sections is
 * edited as sections; a flat set imported before V2 is edited as a flat cue
 * list and can be given structure without being retyped. Both write the same
 * `groups` list, so whatever the operator does here, the dock and the OBS
 * display keep reading one thing.
 */

import { useState } from "react"
import { ArrowLeft, Plus, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { GroupRow } from "@/components/lyrics/editor/group-row"
import { mergeGroups, splitGroup } from "@/lib/lyrics/parse"
import { parseSections } from "@/lib/lyrics/sections"
import {
  SECTION_LABELS,
  defaultPresentation,
  flattenSections,
  newSectionId,
  nextSectionNumber,
  sectionTitle,
  type ContentType,
  type LyricSection,
  type LyricSet,
  type SectionLabelMode,
  type SectionType,
  type VerseNumberStyle,
} from "@/lib/lyrics/types"

const SECTION_TYPES = Object.keys(SECTION_LABELS) as SectionType[]

/** Section edits rewrite `groups` from the sections, keeping one projection list. */
function withSections(set: LyricSet, sections: LyricSection[]): LyricSet {
  return { ...set, sections, groups: flattenSections(sections) }
}

export function SetEditor({
  set,
  disabled,
  onChange,
  onClose,
  onDelete,
}: {
  set: LyricSet
  disabled: boolean
  onChange: (mutate: (s: LyricSet) => LyricSet) => void
  onClose: () => void
  onDelete: () => void
}) {
  const presentation = set.presentation ?? defaultPresentation(set.type)
  const musical = set.type !== "prayer"

  const updateSections = (mutate: (sections: LyricSection[]) => LyricSection[]) => {
    onChange((s) => withSections(s, mutate(s.sections ?? [])))
  }

  /** Flat sets keep being edited flat until the operator adds structure. */
  const updateFlatGroups = (mutate: (groups: LyricSet["groups"]) => LyricSet["groups"]) => {
    onChange((s) => ({ ...s, groups: mutate(s.groups), sections: undefined }))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="icon" onClick={onClose} aria-label="Back to library">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="min-w-0">
            <h1 className="truncate text-xl font-bold tracking-tight">{set.title || "Untitled"}</h1>
            <p className="text-xs text-muted-foreground">
              {set.groups.length} {set.type === "prayer" ? "points" : "cues"}
              {set.sections?.length ? ` · ${set.sections.length} sections` : ""}
            </p>
          </div>
        </div>
        <Button variant="outline" onClick={onDelete} disabled={disabled} className="text-red-600">
          <Trash2 className="mr-2 h-4 w-4" />
          Delete
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 pt-6 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="edit-title">Title</Label>
            <Input
              id="edit-title"
              value={set.title}
              disabled={disabled}
              onChange={(e) => onChange((s) => ({ ...s, title: e.target.value }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-type">Type</Label>
            <Select
              value={set.type}
              disabled={disabled}
              onValueChange={(v) =>
                onChange((s) => ({ ...s, type: v as ContentType, presentation: defaultPresentation(v as ContentType) }))
              }
            >
              <SelectTrigger id="edit-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="song">Song</SelectItem>
                <SelectItem value="hymn">Hymn</SelectItem>
                <SelectItem value="prayer">Prayer Points</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-language">Language</Label>
            <Input
              id="edit-language"
              value={set.language ?? ""}
              placeholder="Optional"
              disabled={disabled}
              onChange={(e) => onChange((s) => ({ ...s, language: e.target.value || undefined }))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="edit-scripture">Scripture reference</Label>
            <Input
              id="edit-scripture"
              value={set.scriptureReference ?? ""}
              placeholder="Metadata only — never shown as a cue"
              disabled={disabled}
              onChange={(e) => onChange((s) => ({ ...s, scriptureReference: e.target.value || undefined }))}
            />
          </div>

          {musical && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="edit-labels">Section labels on screen</Label>
                <Select
                  value={presentation.sectionLabels}
                  disabled={disabled}
                  onValueChange={(v) =>
                    onChange((s) => ({
                      ...s,
                      presentation: { ...presentation, sectionLabels: v as SectionLabelMode },
                    }))
                  }
                >
                  <SelectTrigger id="edit-labels">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="off">Off</SelectItem>
                    <SelectItem value="numbers">Verse numbers only</SelectItem>
                    <SelectItem value="all">All labels</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="edit-verse-style">Verse number style</Label>
                <Select
                  value={presentation.verseNumberStyle}
                  disabled={disabled}
                  onValueChange={(v) =>
                    onChange((s) => ({
                      ...s,
                      presentation: { ...presentation, verseNumberStyle: v as VerseNumberStyle },
                    }))
                  }
                >
                  <SelectTrigger id="edit-verse-style">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="heading">Above the verse</SelectItem>
                    <SelectItem value="inline">Beside the first line</SelectItem>
                    <SelectItem value="superscript">Small superscript</SelectItem>
                    <SelectItem value="none">Hidden</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {set.sections?.length ? (
        <SectionList set={set} disabled={disabled} updateSections={updateSections} />
      ) : (
        <FlatCueList set={set} disabled={disabled} updateFlatGroups={updateFlatGroups} onChange={onChange} musical={musical} />
      )}
    </div>
  )
}

function SectionList({
  set,
  disabled,
  updateSections,
}: {
  set: LyricSet
  disabled: boolean
  updateSections: (mutate: (sections: LyricSection[]) => LyricSection[]) => void
}) {
  const sections = set.sections ?? []

  const addSection = (type: SectionType) => {
    updateSections((prev) => [
      ...prev,
      {
        id: newSectionId(),
        type,
        number: type === "verse" ? nextSectionNumber(prev, "verse") : undefined,
        groups: [],
      },
    ])
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <Card key={section.id}>
          <CardContent className="space-y-3 pt-6">
            <div className="flex flex-wrap items-center gap-2">
              <Select
                value={section.type}
                disabled={disabled}
                onValueChange={(v) =>
                  updateSections((prev) =>
                    prev.map((s, i) => (i === si ? { ...s, type: v as SectionType } : s))
                  )
                }
              >
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SECTION_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {SECTION_LABELS[t]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Input
                type="number"
                min={1}
                className="w-20"
                placeholder="No."
                value={section.number ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  updateSections((prev) =>
                    prev.map((s, i) =>
                      i === si ? { ...s, number: e.target.value ? Number(e.target.value) : undefined } : s
                    )
                  )
                }
              />

              <Input
                type="number"
                min={1}
                className="w-24"
                placeholder="Repeat"
                value={section.repeat ?? ""}
                disabled={disabled}
                onChange={(e) =>
                  updateSections((prev) =>
                    prev.map((s, i) =>
                      i === si ? { ...s, repeat: e.target.value ? Number(e.target.value) : undefined } : s
                    )
                  )
                }
              />

              {section.type === "other" && (
                <Input
                  className="w-40"
                  placeholder="Section name"
                  value={section.label ?? ""}
                  disabled={disabled}
                  onChange={(e) =>
                    updateSections((prev) =>
                      prev.map((s, i) => (i === si ? { ...s, label: e.target.value || undefined } : s))
                    )
                  }
                />
              )}

              <div className="ml-auto flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || si === 0}
                  onClick={() =>
                    updateSections((prev) => {
                      const next = [...prev]
                      ;[next[si - 1], next[si]] = [next[si], next[si - 1]]
                      return next
                    })
                  }
                >
                  Up
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={disabled || si === sections.length - 1}
                  onClick={() =>
                    updateSections((prev) => {
                      const next = [...prev]
                      ;[next[si], next[si + 1]] = [next[si + 1], next[si]]
                      return next
                    })
                  }
                >
                  Down
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600"
                  disabled={disabled}
                  onClick={() => updateSections((prev) => prev.filter((_, i) => i !== si))}
                >
                  Remove
                </Button>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {sectionTitle(section)}
            </p>

            <div className="space-y-2">
              {section.groups.map((group, gi) => (
                <GroupRow
                  key={group.id}
                  group={group}
                  index={gi}
                  total={section.groups.length}
                  disabled={disabled}
                  onChange={(patch) =>
                    updateSections((prev) =>
                      prev.map((s, i) =>
                        i === si ? { ...s, groups: s.groups.map((g, j) => (j === gi ? { ...g, ...patch } : g)) } : s
                      )
                    )
                  }
                  onMove={(delta) =>
                    updateSections((prev) =>
                      prev.map((s, i) => {
                        if (i !== si) return s
                        const groups = [...s.groups]
                        const target = gi + delta
                        if (target < 0 || target >= groups.length) return s
                        ;[groups[gi], groups[target]] = [groups[target], groups[gi]]
                        return { ...s, groups }
                      })
                    )
                  }
                  onSplit={() =>
                    updateSections((prev) =>
                      prev.map((s, i) => {
                        if (i !== si) return s
                        const pair = splitGroup(s.groups[gi])
                        if (!pair) return s
                        const groups = [...s.groups]
                        groups.splice(gi, 1, ...pair)
                        return { ...s, groups }
                      })
                    )
                  }
                  onMerge={() =>
                    updateSections((prev) =>
                      prev.map((s, i) => {
                        if (i !== si || gi === 0) return s
                        const groups = [...s.groups]
                        groups.splice(gi - 1, 2, mergeGroups(groups[gi - 1], groups[gi]))
                        return { ...s, groups }
                      })
                    )
                  }
                  onDelete={() =>
                    updateSections((prev) =>
                      prev.map((s, i) => (i === si ? { ...s, groups: s.groups.filter((_, j) => j !== gi) } : s))
                    )
                  }
                />
              ))}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        {(["verse", "chorus", "bridge", "prechorus", "refrain", "tag", "other"] as SectionType[]).map((t) => (
          <Button key={t} variant="outline" size="sm" disabled={disabled} onClick={() => addSection(t)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {SECTION_LABELS[t]}
          </Button>
        ))}
      </div>
    </div>
  )
}

/**
 * A set with no sections — everything imported before V2. It stays editable
 * exactly as it is, and "Detect sections" is offered rather than applied, so
 * an operator opting into structure is a deliberate act and never silently
 * reshapes working content.
 */
function FlatCueList({
  set,
  disabled,
  updateFlatGroups,
  onChange,
  musical,
}: {
  set: LyricSet
  disabled: boolean
  updateFlatGroups: (mutate: (groups: LyricSet["groups"]) => LyricSet["groups"]) => void
  onChange: (mutate: (s: LyricSet) => LyricSet) => void
  musical: boolean
}) {
  const [detected, setDetected] = useState<LyricSection[] | null>(null)

  const detect = () => {
    const text = set.groups.map((g) => g.primary).join("\n")
    const { sections, recognised } = parseSections(text, set.type)
    setDetected(recognised ? sections : [])
  }

  return (
    <div className="space-y-3">
      {musical && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/40 p-3">
          <p className="flex-1 text-sm text-muted-foreground">
            This item has no sections yet. Cues below play exactly as they are.
          </p>
          <Button variant="outline" size="sm" onClick={detect} disabled={disabled}>
            Detect sections
          </Button>
        </div>
      )}

      {detected !== null && (
        <div className="rounded-lg border border-violet-300 bg-violet-50 p-3 text-sm dark:border-violet-800 dark:bg-violet-950/30">
          {detected.length ? (
            <>
              <p className="mb-2">
                Found {detected.length} section{detected.length === 1 ? "" : "s"}:{" "}
                {detected.map((s) => sectionTitle(s)).join(", ")}. Applying this re-groups the cues.
              </p>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={disabled}
                  onClick={() => {
                    onChange((s) => ({ ...s, sections: detected, groups: flattenSections(detected) }))
                    setDetected(null)
                  }}
                >
                  Apply sections
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setDetected(null)}>
                  Cancel
                </Button>
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <p className="flex-1">
                No Verse or Chorus headings found in the cues — nothing was changed. Add sections manually if you
                need them.
              </p>
              <Button size="sm" variant="ghost" onClick={() => setDetected(null)}>
                Dismiss
              </Button>
            </div>
          )}
        </div>
      )}

      <div className="space-y-2">
        {set.groups.map((group, i) => (
          <GroupRow
            key={group.id}
            group={group}
            index={i}
            total={set.groups.length}
            disabled={disabled}
            onChange={(patch) => updateFlatGroups((gs) => gs.map((g, j) => (j === i ? { ...g, ...patch } : g)))}
            onMove={(delta) =>
              updateFlatGroups((gs) => {
                const target = i + delta
                if (target < 0 || target >= gs.length) return gs
                const next = [...gs]
                ;[next[i], next[target]] = [next[target], next[i]]
                return next
              })
            }
            onSplit={() =>
              updateFlatGroups((gs) => {
                const pair = splitGroup(gs[i])
                if (!pair) return gs
                const next = [...gs]
                next.splice(i, 1, ...pair)
                return next
              })
            }
            onMerge={() =>
              updateFlatGroups((gs) => {
                if (i === 0) return gs
                const next = [...gs]
                next.splice(i - 1, 2, mergeGroups(next[i - 1], next[i]))
                return next
              })
            }
            onDelete={() => updateFlatGroups((gs) => gs.filter((_, j) => j !== i))}
          />
        ))}
      </div>
    </div>
  )
}
