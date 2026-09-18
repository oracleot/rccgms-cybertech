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
 *
 * Two editing modes
 * -----------------
 * **Structured** — the default, per-section visual editor.
 * **Edit as text** — one large editor for the entire item. Section markers
 * (`[Verse 1]`, `[Chorus]`) are typed directly. The text mode round-trips
 * safely through serializeSections / parseTextToSections.
 */

import { useEffect, useRef, useState } from "react"
import { ArrowLeft, FileText, List, Plus, Sparkles, Trash2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { GroupRow } from "@/components/lyrics/editor/group-row"
import { mergeGroups, splitGroup } from "@/lib/lyrics/parse"
import { parseSections } from "@/lib/lyrics/sections"
import {
  normalizeSongCues,
  parseTextToSections,
  previewNormalize,
  serializeFlat,
  serializeSections,
  type NormalizeDiff,
} from "@/lib/lyrics/text-format"
import {
  SECTION_LABELS,
  defaultPresentation,
  flattenSections,
  newGroupId,
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

const ADD_SECTION_TYPES: SectionType[] = [
  "verse", "chorus", "bridge", "prechorus", "intro",
  "outro", "interlude", "refrain", "tag", "ending", "other",
]

type EditorMode = "structured" | "text"

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

  const [editorMode, setEditorMode] = useState<EditorMode>("structured")
  const [textDraft, setTextDraft] = useState("")
  const [textErrors, setTextErrors] = useState<string[]>([])
  const [normPreview, setNormPreview] = useState<NormalizeDiff[] | null>(null)

  const updateSections = (mutate: (sections: LyricSection[]) => LyricSection[]) => {
    onChange((s) => withSections(s, mutate(s.sections ?? [])))
  }

  const updateFlatGroups = (mutate: (groups: LyricSet["groups"]) => LyricSet["groups"]) => {
    onChange((s) => ({ ...s, groups: mutate(s.groups), sections: undefined }))
  }

  const switchToText = () => {
    const text = set.sections?.length
      ? serializeSections(set.sections)
      : serializeFlat(set.groups)
    setTextDraft(text)
    setTextErrors([])
    setEditorMode("text")
  }

  const applyText = () => {
    const { sections, errors } = parseTextToSections(textDraft)
    if (errors.length) {
      setTextErrors(errors)
      return
    }
    if (!sections.length) {
      setTextErrors(["No sections found. Add at least one section marker like [Verse 1]."])
      return
    }
    setTextErrors([])
    onChange((s) => withSections(s, sections))
    setEditorMode("structured")
  }

  const discardText = () => {
    setTextErrors([])
    setEditorMode("structured")
  }

  const showNormalize = () => {
    if (!set.sections?.length) return
    const diffs = previewNormalize(set.sections)
    setNormPreview(diffs)
  }

  const applyNormalize = () => {
    if (!set.sections?.length) return
    onChange((s) => withSections(s, normalizeSongCues(s.sections ?? [])))
    setNormPreview(null)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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

      {/* Metadata */}
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

      {/* Mode toggle + actions */}
      {(set.sections?.length || editorMode === "text") ? (
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-md border">
            <Button
              variant={editorMode === "structured" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-r-none"
              onClick={() => editorMode === "text" ? discardText() : undefined}
              disabled={disabled}
            >
              <List className="mr-1.5 h-3.5 w-3.5" />
              Structured
            </Button>
            <Button
              variant={editorMode === "text" ? "secondary" : "ghost"}
              size="sm"
              className="rounded-l-none"
              onClick={() => editorMode === "structured" ? switchToText() : undefined}
              disabled={disabled}
            >
              <FileText className="mr-1.5 h-3.5 w-3.5" />
              Edit as text
            </Button>
          </div>

          {editorMode === "structured" && set.type === "song" && set.sections?.length ? (
            <Button variant="outline" size="sm" onClick={showNormalize} disabled={disabled}>
              <Sparkles className="mr-1.5 h-3.5 w-3.5" />
              Normalize song cues
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Normalize preview */}
      {normPreview !== null && (
        <Card className="border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/30">
          <CardContent className="space-y-3 pt-6">
            {normPreview.length ? (
              <>
                <p className="text-sm font-medium">
                  Normalize: split multi-line cues into one line per cue
                </p>
                <ul className="space-y-1 text-sm">
                  {normPreview.map((d, i) => (
                    <li key={i}>
                      {d.sectionTitle}: {d.beforeCues} cue{d.beforeCues === 1 ? "" : "s"} → {d.afterCues} cue{d.afterCues === 1 ? "" : "s"}
                    </li>
                  ))}
                </ul>
                <div className="flex gap-2">
                  <Button size="sm" onClick={applyNormalize} disabled={disabled}>
                    Apply
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setNormPreview(null)}>
                    Cancel
                  </Button>
                </div>
              </>
            ) : (
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm">All cues are already one line each — nothing to normalize.</p>
                <Button size="sm" variant="ghost" onClick={() => setNormPreview(null)}>
                  Dismiss
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Editor body */}
      {editorMode === "text" ? (
        <TextEditor
          draft={textDraft}
          errors={textErrors}
          disabled={disabled}
          onDraftChange={setTextDraft}
          onApply={applyText}
          onDiscard={discardText}
        />
      ) : set.sections?.length ? (
        <SectionList set={set} disabled={disabled} updateSections={updateSections} />
      ) : (
        <FlatCueList set={set} disabled={disabled} updateFlatGroups={updateFlatGroups} onChange={onChange} musical={musical} />
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Text editor mode
// ---------------------------------------------------------------------------

function TextEditor({
  draft,
  errors,
  disabled,
  onDraftChange,
  onApply,
  onDiscard,
}: {
  draft: string
  errors: string[]
  disabled: boolean
  onDraftChange: (text: string) => void
  onApply: () => void
  onDiscard: () => void
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
  }, [])

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Section markers: <code className="rounded bg-muted px-1">[Verse 1]</code>{" "}
        <code className="rounded bg-muted px-1">[Chorus]</code>{" "}
        <code className="rounded bg-muted px-1">[Bridge]</code> ·
        Blank line = new cue ·
        Secondary: <code className="rounded bg-muted px-1">&gt; text</code> ·
        Repeat: <code className="rounded bg-muted px-1">(x2)</code> ·
        Section repeat: <code className="rounded bg-muted px-1">[Chorus] x2</code>
      </p>

      <Textarea
        ref={ref}
        value={draft}
        onChange={(e) => onDraftChange(e.target.value)}
        disabled={disabled}
        rows={Math.max(16, draft.split("\n").length + 2)}
        className="font-mono text-sm leading-relaxed"
        spellCheck={false}
      />

      {errors.length > 0 && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-300">
          <p className="mb-1 font-medium">Validation errors — fix before applying:</p>
          <ul className="list-inside list-disc space-y-0.5">
            {errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex gap-2">
        <Button size="sm" onClick={onApply} disabled={disabled}>
          Apply changes
        </Button>
        <Button size="sm" variant="ghost" onClick={onDiscard}>
          Discard
        </Button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Structured section editor
// ---------------------------------------------------------------------------

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
    const needsNumber = type === "verse" || type === "chorus"
    updateSections((prev) => [
      ...prev,
      {
        id: newSectionId(),
        type,
        number: needsNumber ? nextSectionNumber(prev, type) : undefined,
        groups: [],
      },
    ])
  }

  return (
    <div className="space-y-4">
      {sections.map((section, si) => (
        <Card key={section.id}>
          <CardContent className="space-y-3 pt-6">
            {/* Section header controls */}
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

            {/* Cues */}
            <div className="space-y-2">
              {section.groups.length === 0 ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={disabled}
                  className="w-full border-dashed"
                  onClick={() =>
                    updateSections((prev) =>
                      prev.map((s, i) =>
                        i === si ? { ...s, groups: [{ id: newGroupId(), primary: "" }] } : s
                      )
                    )
                  }
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" />
                  Add first cue
                </Button>
              ) : (
                section.groups.map((group, gi) => (
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
                          if (i !== si || gi >= s.groups.length - 1) return s
                          const groups = [...s.groups]
                          groups.splice(gi, 2, mergeGroups(groups[gi], groups[gi + 1]))
                          return { ...s, groups }
                        })
                      )
                    }
                    onDelete={() =>
                      updateSections((prev) =>
                        prev.map((s, i) => (i === si ? { ...s, groups: s.groups.filter((_, j) => j !== gi) } : s))
                      )
                    }
                    onAddAbove={() =>
                      updateSections((prev) =>
                        prev.map((s, i) => {
                          if (i !== si) return s
                          const groups = [...s.groups]
                          groups.splice(gi, 0, { id: newGroupId(), primary: "" })
                          return { ...s, groups }
                        })
                      )
                    }
                    onAddBelow={() =>
                      updateSections((prev) =>
                        prev.map((s, i) => {
                          if (i !== si) return s
                          const groups = [...s.groups]
                          groups.splice(gi + 1, 0, { id: newGroupId(), primary: "" })
                          return { ...s, groups }
                        })
                      )
                    }
                  />
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      <div className="flex flex-wrap gap-2">
        {ADD_SECTION_TYPES.map((t) => (
          <Button key={t} variant="outline" size="sm" disabled={disabled} onClick={() => addSection(t)}>
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            {SECTION_LABELS[t]}
          </Button>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Flat cue list (pre-V2 sets without sections)
// ---------------------------------------------------------------------------

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
                if (i >= gs.length - 1) return gs
                const next = [...gs]
                next.splice(i, 2, mergeGroups(next[i], next[i + 1]))
                return next
              })
            }
            onDelete={() => updateFlatGroups((gs) => gs.filter((_, j) => j !== i))}
            onAddAbove={() =>
              updateFlatGroups((gs) => {
                const next = [...gs]
                next.splice(i, 0, { id: newGroupId(), primary: "" })
                return next
              })
            }
            onAddBelow={() =>
              updateFlatGroups((gs) => {
                const next = [...gs]
                next.splice(i + 1, 0, { id: newGroupId(), primary: "" })
                return next
              })
            }
          />
        ))}
      </div>
    </div>
  )
}
