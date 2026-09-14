"use client"

/**
 * .docx bulk import for /lyrics. Nothing is written to Supabase until the
 * operator presses "Import" at the bottom — uploading a Word document only
 * ever produces a local review draft. mammoth (vendored, see
 * lib/lyrics/vendor) converts the .docx to HTML entirely client-side, in
 * this already-authenticated page; the file itself is never uploaded
 * anywhere.
 */

import { useRef, useState } from "react"
import { AlertTriangle, ChevronDown, ChevronUp, FileUp, Loader2, Merge, Scissors, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { importSongsFromHtml, type ImportedSong } from "@/lib/lyrics/docx-import"
import { saveSet } from "@/lib/lyrics/store"
import { newSetId, type ContentType, type LyricGroup, type LyricSet } from "@/lib/lyrics/types"
import { GroupRow } from "./group-row"

interface Draft {
  key: string
  title: string
  scripture: string
  confidence: "high" | "low"
  type: ContentType
  groups: LyricGroup[]
  excluded: boolean
  open: boolean
}

let draftKeySeq = 0
function toDraft(s: ImportedSong): Draft {
  draftKeySeq += 1
  return {
    key: `d${draftKeySeq}`,
    title: s.title,
    scripture: s.scriptureReference ?? "",
    confidence: s.titleConfidence,
    type: "lyrics",
    groups: s.groups,
    excluded: false,
    open: false,
  }
}

export function DocxImportPanel({ onImported, onClose }: { onImported: () => void; onClose: () => void }) {
  const [phase, setPhase] = useState<"pick" | "reviewing" | "importing">("pick")
  const [fileName, setFileName] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [drafts, setDrafts] = useState<Draft[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setError(null)
    setFileName(file.name)
    setPhase("reviewing")
    setDrafts([])
    try {
      const mammoth = (await import("@/lib/lyrics/vendor/mammoth.browser.js")).default
      const arrayBuffer = await file.arrayBuffer()
      const result = await mammoth.convertToHtml(
        { arrayBuffer },
        { styleMap: ["p[style-name='Title'] => h1:fresh", "p[style-name='Heading 1'] => h1:fresh", "p[style-name='Heading 2'] => h2:fresh"] }
      )
      const songs = importSongsFromHtml(result.value)
      if (!songs.length) {
        setError("No songs could be detected in this document. Try /lyrics' regular paste-and-split instead, or check the file isn't empty.")
        setPhase("pick")
        return
      }
      setDrafts(songs.map(toDraft))
    } catch {
      setError("Couldn't read that file — make sure it's a .docx Word document.")
      setPhase("pick")
    }
  }

  const update = (key: string, patch: Partial<Draft>) => setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, ...patch } : d)))
  const updateGroups = (key: string, fn: (g: LyricGroup[]) => LyricGroup[]) =>
    setDrafts((ds) => ds.map((d) => (d.key === key ? { ...d, groups: fn(d.groups) } : d)))

  const mergeWithNext = (i: number) =>
    setDrafts((ds) => {
      if (i >= ds.length - 1) return ds
      const merged: Draft = { ...ds[i], groups: [...ds[i].groups, ...ds[i + 1].groups] }
      const next = [...ds]
      next.splice(i, 2, merged)
      return next
    })

  const splitSongAt = (i: number, groupIndex: number) =>
    setDrafts((ds) => {
      const d = ds[i]
      if (groupIndex <= 0 || groupIndex >= d.groups.length) return ds
      draftKeySeq += 1
      const first: Draft = { ...d, groups: d.groups.slice(0, groupIndex) }
      const second: Draft = {
        ...d,
        key: `d${draftKeySeq}`,
        title: `${d.title} (part 2)`,
        groups: d.groups.slice(groupIndex),
        scripture: "",
      }
      const next = [...ds]
      next.splice(i, 1, first, second)
      return next
    })

  const included = drafts.filter((d) => !d.excluded)

  const runImport = async () => {
    setPhase("importing")
    setError(null)
    const failures: string[] = []
    for (const d of included) {
      const set: LyricSet = {
        id: newSetId(),
        type: d.type,
        title: d.title.trim() || "Untitled song",
        groups: d.groups,
        updatedAt: Date.now(),
        scriptureReference: d.scripture.trim() || undefined,
      }
      try {
        await saveSet(set)
      } catch {
        failures.push(d.title)
      }
    }
    if (failures.length) {
      setError(`Saved ${included.length - failures.length} of ${included.length} — failed: ${failures.join(", ")}. Check your connection and try again.`)
      setPhase("reviewing")
      return
    }
    onImported()
    onClose()
  }

  return (
    <Card>
      <CardContent className="space-y-4 pt-6">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Import songs from Word (.docx)</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        {phase === "pick" && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Upload a .docx document containing multiple songs. Fusion looks for headings, &ldquo;Song 1&rdquo;-style
              markers, bold titles and tables to split it into separate songs — nothing is saved until you review and
              confirm below.
            </p>
            <input
              ref={fileRef}
              type="file"
              accept=".docx"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0]
                if (f) void handleFile(f)
                e.target.value = ""
              }}
            />
            <Button onClick={() => fileRef.current?.click()}>
              <FileUp className="mr-1.5 h-4 w-4" />
              Choose .docx file
            </Button>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}
          </div>
        )}

        {phase === "reviewing" && drafts.length === 0 && !error && (
          <div className="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Reading {fileName}…
          </div>
        )}

        {(phase === "reviewing" || phase === "importing") && drafts.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {drafts.length} song{drafts.length === 1 ? "" : "s"} detected in {fileName}. Rename, fix scripture,
              inspect cues, exclude, split or merge below, then import.
            </p>
            {error && <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>}

            <div className="space-y-2">
              {drafts.map((d, i) => (
                <Card key={d.key} className={d.excluded ? "opacity-50" : undefined}>
                  <CardContent className="space-y-3 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => update(d.key, { open: !d.open })}>
                        {d.open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </Button>
                      <Input
                        value={d.title}
                        onChange={(e) => update(d.key, { title: e.target.value })}
                        className="w-56 font-medium"
                        disabled={d.excluded}
                      />
                      {d.confidence === "low" ? (
                        <Badge variant="secondary" className="gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Title uncertain
                        </Badge>
                      ) : (
                        <Badge variant="outline">High confidence</Badge>
                      )}
                      <span className="text-xs text-muted-foreground">{d.groups.length} cues</span>
                      <div className="ml-auto flex items-center gap-1">
                        <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => mergeWithNext(i)} disabled={i === drafts.length - 1 || d.excluded} title="Merge with next song">
                          <Merge className="mr-1 h-3.5 w-3.5" />
                          Merge next
                        </Button>
                        <Button
                          variant={d.excluded ? "outline" : "ghost"}
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => update(d.key, { excluded: !d.excluded })}
                        >
                          {d.excluded ? "Excluded — include" : "Exclude"}
                        </Button>
                      </div>
                    </div>

                    <Input
                      value={d.scripture}
                      onChange={(e) => update(d.key, { scripture: e.target.value })}
                      placeholder="Scripture reference (optional) — e.g. Psalm 100:1-5"
                      className="h-8 text-sm"
                      disabled={d.excluded}
                    />

                    {d.open && (
                      <div className="space-y-1.5 border-t pt-3">
                        {d.groups.length === 0 && <p className="text-center text-xs text-muted-foreground">No lyric cues detected for this song.</p>}
                        {d.groups.map((g, gi) => (
                          <div key={g.id} className="space-y-1">
                            <GroupRow
                              group={g}
                              index={gi}
                              total={d.groups.length}
                              disabled={d.excluded}
                              onChange={(patch) => updateGroups(d.key, (gs) => gs.map((x) => (x.id === g.id ? { ...x, ...patch } : x)))}
                              onMove={(dir) =>
                                updateGroups(d.key, (gs) => {
                                  const j = gi + dir
                                  if (j < 0 || j >= gs.length) return gs
                                  const next = [...gs]
                                  ;[next[gi], next[j]] = [next[j], next[gi]]
                                  return next
                                })
                              }
                              onSplit={() =>
                                updateGroups(d.key, (gs) => {
                                  const lines = g.primary.split("\n")
                                  if (lines.length < 2) return gs
                                  const mid = Math.ceil(lines.length / 2)
                                  const a: LyricGroup = { id: `${g.id}a`, primary: lines.slice(0, mid).join("\n") }
                                  const b: LyricGroup = { id: `${g.id}b`, primary: lines.slice(mid).join("\n") }
                                  const next = [...gs]
                                  next.splice(gi, 1, a, b)
                                  return next
                                })
                              }
                              onMerge={() =>
                                updateGroups(d.key, (gs) => {
                                  if (gi >= gs.length - 1) return gs
                                  const merged: LyricGroup = { id: g.id, primary: `${gs[gi].primary}\n${gs[gi + 1].primary}` }
                                  const next = [...gs]
                                  next.splice(gi, 2, merged)
                                  return next
                                })
                              }
                              onDelete={() => updateGroups(d.key, (gs) => gs.filter((x) => x.id !== g.id))}
                            />
                            {gi > 0 && gi < d.groups.length && (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-5 w-full text-[10px] text-muted-foreground"
                                onClick={() => splitSongAt(i, gi)}
                                title="Split into two songs here"
                              >
                                <Scissors className="mr-1 h-3 w-3" />
                                Split into a new song from here
                              </Button>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex items-center justify-between border-t pt-3">
              <p className="text-sm text-muted-foreground">
                {included.length} of {drafts.length} will be imported
              </p>
              <div className="flex gap-2">
                <Button variant="ghost" onClick={onClose} disabled={phase === "importing"}>
                  Cancel
                </Button>
                <Button onClick={runImport} disabled={!included.length || phase === "importing"}>
                  {phase === "importing" ? (
                    <>
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                      Importing…
                    </>
                  ) : (
                    `Import ${included.length} song${included.length === 1 ? "" : "s"}`
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
