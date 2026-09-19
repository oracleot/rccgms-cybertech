"use client"

/**
 * EasyWorship database import panel.
 *
 * Flow: Select Files → Analyse → Review → Import.
 * Nothing is written to Supabase until the user presses "Import Selected".
 * Database files are read entirely in the browser via sql.js (loaded from CDN).
 */

import { useRef, useState } from "react"
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  Circle,
  Database,
  FileUp,
  Loader2,
  X,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { saveSet } from "@/lib/lyrics/store"
import type { LyricSet } from "@/lib/lyrics/types"
import {
  readEwDatabases,
  analyseEwSongs,
  type EwAnalysisRecord,
  type EwAnalysisResult,
} from "@/lib/lyrics/ew-parse"

type Phase = "pick" | "loading" | "review" | "importing" | "done"

interface Props {
  existingLibrary: LyricSet[]
  onImported: () => void
  onClose: () => void
}

export function EwImportPanel({ existingLibrary, onImported, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>("pick")
  const [error, setError] = useState<string | null>(null)
  const [analysis, setAnalysis] = useState<EwAnalysisResult | null>(null)
  const [importProgress, setImportProgress] = useState({ done: 0, total: 0 })
  const [importedCount, setImportedCount] = useState(0)
  const [songsFileName, setSongsFileName] = useState("")
  const [wordsFileName, setWordsFileName] = useState("")
  const songsRef = useRef<HTMLInputElement>(null)
  const wordsRef = useRef<HTMLInputElement>(null)

  const handleAnalyse = async () => {
    const songsFile = songsRef.current?.files?.[0]
    const wordsFile = wordsRef.current?.files?.[0]
    if (!songsFile || !wordsFile) {
      setError("Please select both Songs.db and SongWords.db files.")
      return
    }
    setError(null)
    setPhase("loading")
    try {
      const ewSongs = await readEwDatabases(songsFile, wordsFile)
      if (!ewSongs.length) {
        setError("No songs found in these database files. Check they are from an EasyWorship installation.")
        setPhase("pick")
        return
      }
      const result = analyseEwSongs(ewSongs, existingLibrary)
      setAnalysis(result)
      setPhase("review")
    } catch (err) {
      setError(`Failed to read database: ${err instanceof Error ? err.message : String(err)}`)
      setPhase("pick")
    }
  }

  const toggleRecord = (idx: number) => {
    if (!analysis) return
    const updated = { ...analysis, records: [...analysis.records] }
    updated.records[idx] = { ...updated.records[idx], selected: !updated.records[idx].selected }
    setAnalysis(updated)
  }

  const selectAll = (status: EwAnalysisRecord["status"]) => {
    if (!analysis) return
    const updated = { ...analysis, records: analysis.records.map((r) => (r.status === status ? { ...r, selected: true } : r)) }
    setAnalysis(updated)
  }

  const deselectAll = (status: EwAnalysisRecord["status"]) => {
    if (!analysis) return
    const updated = { ...analysis, records: analysis.records.map((r) => (r.status === status ? { ...r, selected: false } : r)) }
    setAnalysis(updated)
  }

  const handleImport = async () => {
    if (!analysis) return
    const selected = analysis.records.filter((r) => r.selected)
    if (!selected.length) return
    setPhase("importing")
    setImportProgress({ done: 0, total: selected.length })
    let done = 0
    for (const rec of selected) {
      try {
        await saveSet(rec.fusionRecord)
        done++
        setImportProgress({ done, total: selected.length })
      } catch (err) {
        setError(`Failed to import "${rec.fusionRecord.title}": ${err instanceof Error ? err.message : String(err)}`)
        setPhase("review")
        return
      }
    }
    setImportedCount(done)
    setPhase("done")
  }

  const selectedCount = analysis?.records.filter((r) => r.selected).length ?? 0

  // ---- Pick files ----
  if (phase === "pick") {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-violet-500" />
            <h3 className="font-semibold">Import from EasyWorship</h3>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <p className="text-sm text-muted-foreground">
          Select the <strong>Songs.db</strong> and <strong>SongWords.db</strong> files from your
          EasyWorship data folder. Default location:
        </p>
        <code className="block rounded bg-muted px-3 py-2 text-xs">
          C:\Users\Public\Documents\Softouch\Easyworship\Default\v6.1\Databases\Data
        </code>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20">
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">Songs.db</span>
            <input
              ref={songsRef}
              type="file"
              accept=".db,.sqlite,.sqlite3"
              className="hidden"
              onChange={() => {
                setSongsFileName(songsRef.current?.files?.[0]?.name ?? "")
                setError(null)
              }}
            />
            <span className={`text-xs ${songsFileName ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
              {songsFileName || "Click to select"}
            </span>
          </label>
          <label className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border-2 border-dashed p-4 transition-colors hover:border-violet-400 hover:bg-violet-50/50 dark:hover:bg-violet-950/20">
            <FileUp className="h-6 w-6 text-muted-foreground" />
            <span className="text-sm font-medium">SongWords.db</span>
            <input
              ref={wordsRef}
              type="file"
              accept=".db,.sqlite,.sqlite3"
              className="hidden"
              onChange={() => {
                setWordsFileName(wordsRef.current?.files?.[0]?.name ?? "")
                setError(null)
              }}
            />
            <span className={`text-xs ${wordsFileName ? "font-medium text-green-600 dark:text-green-400" : "text-muted-foreground"}`}>
              {wordsFileName || "Click to select"}
            </span>
          </label>
        </div>

        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleAnalyse}>
            <Database className="mr-2 h-4 w-4" />
            Analyse
          </Button>
        </div>
      </div>
    )
  }

  // ---- Loading ----
  if (phase === "loading") {
    return (
      <div className="flex flex-col items-center gap-3 py-8">
        <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
        <p className="text-sm text-muted-foreground">Reading EasyWorship database...</p>
      </div>
    )
  }

  // ---- Done ----
  if (phase === "done") {
    return (
      <div className="space-y-4">
        <div className="flex flex-col items-center gap-3 py-6">
          <CheckCircle2 className="h-10 w-10 text-green-500" />
          <p className="text-lg font-semibold">Import complete</p>
          <p className="text-sm text-muted-foreground">
            {importedCount} {importedCount === 1 ? "record" : "records"} imported into the Worship Library.
          </p>
        </div>
        <div className="flex justify-end">
          <Button
            onClick={() => {
              onImported()
              onClose()
            }}
          >
            Done
          </Button>
        </div>
      </div>
    )
  }

  // ---- Review / Importing ----
  if (!analysis) return null
  const importing = phase === "importing"

  const newRecs = analysis.records.filter((r) => r.status === "new")
  const dupeRecs = analysis.records.filter((r) => r.status === "duplicate")
  const conflictRecs = analysis.records.filter((r) => r.status === "conflict")

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="h-5 w-5 text-violet-500" />
          <h3 className="font-semibold">EasyWorship Analysis</h3>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} disabled={importing}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <SummaryCard label="Source" value={analysis.totalSource} />
        <SummaryCard label="New" value={analysis.newCount} color="green" />
        <SummaryCard label="Duplicates" value={analysis.duplicateCount} color="amber" />
        <SummaryCard label="Conflicts" value={analysis.conflictCount} color="red" />
      </div>

      {error && (
        <div className="flex items-start gap-2 rounded-lg border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-900 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      {/* New items */}
      {newRecs.length > 0 && (
        <RecordSection
          title="New"
          badge="green"
          description="Not in your library yet"
          records={newRecs}
          allRecords={analysis.records}
          onToggle={toggleRecord}
          onSelectAll={() => selectAll("new")}
          onDeselectAll={() => deselectAll("new")}
          disabled={importing}
        />
      )}

      {/* Duplicates */}
      {dupeRecs.length > 0 && (
        <RecordSection
          title="Duplicates"
          badge="amber"
          description="Already in library (same title and type)"
          records={dupeRecs}
          allRecords={analysis.records}
          onToggle={toggleRecord}
          onSelectAll={() => selectAll("duplicate")}
          onDeselectAll={() => deselectAll("duplicate")}
          disabled={importing}
        />
      )}

      {/* Conflicts */}
      {conflictRecs.length > 0 && (
        <RecordSection
          title="Conflicts"
          badge="red"
          description="Same title but different type (song vs hymn)"
          records={conflictRecs}
          allRecords={analysis.records}
          onToggle={toggleRecord}
          onSelectAll={() => selectAll("conflict")}
          onDeselectAll={() => deselectAll("conflict")}
          disabled={importing}
        />
      )}

      {/* Import bar */}
      <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
        <p className="text-sm">
          {importing ? (
            <span className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Importing {importProgress.done}/{importProgress.total}...
            </span>
          ) : (
            <span>{selectedCount} selected for import</span>
          )}
        </p>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose} disabled={importing}>
            Cancel
          </Button>
          <Button onClick={handleImport} disabled={importing || selectedCount === 0}>
            {importing ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Check className="mr-2 h-4 w-4" />
            )}
            Import {selectedCount > 0 ? `${selectedCount} Selected` : ""}
          </Button>
        </div>
      </div>
    </div>
  )
}

function SummaryCard({ label, value, color }: { label: string; value: number; color?: string }) {
  const bg =
    color === "green"
      ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-300"
      : color === "amber"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300"
        : color === "red"
          ? "bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300"
          : "bg-muted text-foreground"
  return (
    <div className={`rounded-lg px-3 py-2 text-center ${bg}`}>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs">{label}</p>
    </div>
  )
}

function RecordSection({
  title,
  badge,
  description,
  records,
  allRecords,
  onToggle,
  onSelectAll,
  onDeselectAll,
  disabled,
}: {
  title: string
  badge: string
  description: string
  records: EwAnalysisRecord[]
  allRecords: EwAnalysisRecord[]
  onToggle: (globalIdx: number) => void
  onSelectAll: () => void
  onDeselectAll: () => void
  disabled: boolean
}) {
  const [expanded, setExpanded] = useState(title === "New")
  const selectedInSection = records.filter((r) => r.selected).length
  const badgeClass =
    badge === "green"
      ? "bg-green-100 text-green-800 dark:bg-green-900/50 dark:text-green-300"
      : badge === "amber"
        ? "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300"
        : "bg-red-100 text-red-800 dark:bg-red-900/50 dark:text-red-300"

  return (
    <div className="rounded-lg border">
      <button
        className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-muted/50"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2">
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${badgeClass}`}>
            {records.length}
          </span>
          <span className="font-medium">{title}</span>
          <span className="text-xs text-muted-foreground">{description}</span>
        </div>
        <span className="text-xs text-muted-foreground">
          {selectedInSection}/{records.length} selected
        </span>
      </button>
      {expanded && (
        <div className="border-t">
          <div className="flex items-center gap-2 border-b bg-muted/30 px-4 py-1.5">
            <button
              className="text-xs text-violet-600 hover:underline dark:text-violet-400"
              onClick={onSelectAll}
              disabled={disabled}
            >
              Select all
            </button>
            <span className="text-xs text-muted-foreground">|</span>
            <button
              className="text-xs text-violet-600 hover:underline dark:text-violet-400"
              onClick={onDeselectAll}
              disabled={disabled}
            >
              Deselect all
            </button>
          </div>
          <div className="max-h-64 divide-y overflow-y-auto">
            {records.map((rec) => {
              const globalIdx = allRecords.indexOf(rec)
              return (
                <RecordRow
                  key={rec.fusionRecord.id}
                  record={rec}
                  onToggle={() => onToggle(globalIdx)}
                  disabled={disabled}
                />
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function RecordRow({
  record,
  onToggle,
  disabled,
}: {
  record: EwAnalysisRecord
  onToggle: () => void
  disabled: boolean
}) {
  const r = record.fusionRecord
  const cueCount = r.groups.length
  const typeLabel = r.type === "hymn" ? "Hymn" : r.type === "prayer" ? "Prayer" : "Song"
  const statusIcon =
    record.status === "new" ? (
      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
    ) : record.status === "duplicate" ? (
      <Circle className="h-3.5 w-3.5 text-amber-500" />
    ) : (
      <XCircle className="h-3.5 w-3.5 text-red-500" />
    )

  return (
    <label
      className={`flex cursor-pointer items-center gap-3 px-4 py-2 transition-colors hover:bg-muted/50 ${
        record.selected ? "bg-violet-50/50 dark:bg-violet-950/20" : ""
      }`}
    >
      <input
        type="checkbox"
        checked={record.selected}
        onChange={onToggle}
        disabled={disabled}
        className="h-4 w-4 rounded border-gray-300"
      />
      {statusIcon}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{r.title}</p>
        {record.status !== "new" && record.existingTitle && (
          <p className="truncate text-xs text-muted-foreground">
            Existing: &ldquo;{record.existingTitle}&rdquo;
            {record.status === "conflict" && ` (${record.fusionRecord.type} vs existing)`}
          </p>
        )}
      </div>
      <Badge variant="outline" className="shrink-0 text-xs">
        {typeLabel}
      </Badge>
      <span className="shrink-0 text-xs text-muted-foreground">{cueCount} cues</span>
    </label>
  )
}
