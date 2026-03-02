"use client"

import { useState, useRef, useEffect } from "react"
import {
  Play,
  Clock,
  AlertCircle,
  Loader2,
  Trash2,
  Copy,
  Check,
  Terminal,
  ChevronDown,
  History,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface QueryResult {
  rows: Record<string, unknown>[]
  rowCount: number
  duration: number
  query: string
  error?: string
  hint?: string
}

interface QueryHistoryItem {
  query: string
  timestamp: Date
  duration?: number
  rowCount?: number
  error?: string
}

const EXAMPLE_QUERIES = [
  {
    label: "All users with roles",
    sql: "SELECT name, email, role FROM profiles ORDER BY name",
  },
  {
    label: "Department member counts",
    sql: `SELECT d.name, COUNT(ud.profile_id) as members
FROM departments d
LEFT JOIN user_departments ud ON d.id = ud.department_id
GROUP BY d.id, d.name
ORDER BY members DESC`,
  },
  {
    label: "Recent notifications",
    sql: "SELECT type, status, created_at FROM notifications ORDER BY created_at DESC LIMIT 20",
  },
  {
    label: "Equipment status overview",
    sql: `SELECT status, COUNT(*) as count
FROM equipment
GROUP BY status
ORDER BY count DESC`,
  },
  {
    label: "Rota assignments this month",
    sql: `SELECT r.date, p.name as member, pos.name as position
FROM rota_assignments ra
JOIN rotas r ON ra.rota_id = r.id
JOIN profiles p ON ra.user_id = p.id
LEFT JOIN positions pos ON ra.position_id = pos.id
WHERE r.date >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY r.date DESC`,
  },
  {
    label: "Table sizes",
    sql: `SELECT relname as table_name, 
       n_live_tup as row_count,
       pg_size_pretty(pg_total_relation_size(relid)) as total_size
FROM pg_stat_user_tables
ORDER BY n_live_tup DESC`,
  },
]

export function SqlQueryRunner() {
  const [query, setQuery] = useState("")
  const [result, setResult] = useState<QueryResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)
  const [history, setHistory] = useState<QueryHistoryItem[]>([])
  const [showHistory, setShowHistory] = useState(false)
  const [showExamples, setShowExamples] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto"
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 300) + "px"
    }
  }, [query])

  async function executeQuery() {
    if (!query.trim()) return

    setLoading(true)
    setResult(null)

    try {
      const res = await fetch("/api/admin/developer/query", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sql: query.trim() }),
      })

      const data = await res.json()

      if (!res.ok) {
        const errorResult: QueryResult = {
          rows: [],
          rowCount: 0,
          duration: data.duration ?? 0,
          query: query.trim(),
          error: data.error,
          hint: data.hint,
        }
        setResult(errorResult)
        setHistory((prev) => [
          { query: query.trim(), timestamp: new Date(), error: data.error },
          ...prev.slice(0, 19),
        ])
      } else {
        setResult(data)
        setHistory((prev) => [
          {
            query: query.trim(),
            timestamp: new Date(),
            duration: data.duration,
            rowCount: data.rowCount,
          },
          ...prev.slice(0, 19),
        ])
      }
    } catch {
      setResult({
        rows: [],
        rowCount: 0,
        duration: 0,
        query: query.trim(),
        error: "Failed to execute query — network error",
      })
    } finally {
      setLoading(false)
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    // Ctrl/Cmd + Enter to execute
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault()
      executeQuery()
    }
  }

  async function copyResults() {
    if (!result?.rows.length) return
    const text = JSON.stringify(result.rows, null, 2)
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const resultColumns = result?.rows?.[0] ? Object.keys(result.rows[0]) : []

  return (
    <div className="space-y-4">
      {/* Query Editor */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Terminal className="h-4 w-4" />
                SQL Query Console
              </CardTitle>
              <CardDescription>
                Read-only — SELECT, WITH, and EXPLAIN queries only. Max 500 rows.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowExamples(!showExamples)
                  setShowHistory(false)
                }}
              >
                <ChevronDown className={cn(
                  "h-3 w-3 mr-1 transition-transform",
                  showExamples && "rotate-180"
                )} />
                Examples
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowHistory(!showHistory)
                  setShowExamples(false)
                }}
                disabled={history.length === 0}
              >
                <History className="h-3 w-3 mr-1" />
                History ({history.length})
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {/* Example Queries */}
          {showExamples && (
            <div className="grid gap-1.5 p-3 rounded-lg bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-1">Click to load:</p>
              {EXAMPLE_QUERIES.map((ex) => (
                <button
                  key={ex.label}
                  onClick={() => {
                    setQuery(ex.sql)
                    setShowExamples(false)
                  }}
                  className="text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors"
                >
                  <span className="font-medium">{ex.label}</span>
                </button>
              ))}
            </div>
          )}

          {/* History */}
          {showHistory && (
            <div className="max-h-[200px] overflow-y-auto p-3 rounded-lg bg-muted/50 border space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground mb-1">Recent queries:</p>
              {history.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setQuery(item.query)
                    setShowHistory(false)
                  }}
                  className="w-full text-left text-xs px-2 py-1.5 rounded hover:bg-muted transition-colors flex items-center justify-between gap-2"
                >
                  <span className="font-mono truncate flex-1">{item.query}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    {item.error ? (
                      <Badge variant="destructive" className="text-[10px]">error</Badge>
                    ) : (
                      <>
                        {item.rowCount !== undefined && (
                          <Badge variant="secondary" className="text-[10px]">{item.rowCount} rows</Badge>
                        )}
                        {item.duration !== undefined && (
                          <span className="text-muted-foreground">{item.duration}ms</span>
                        )}
                      </>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Textarea */}
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="SELECT * FROM profiles LIMIT 10"
              className="w-full min-h-[100px] max-h-[300px] p-3 rounded-lg border bg-background font-mono text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
              spellCheck={false}
            />
          </div>

          {/* Action buttons */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                onClick={executeQuery}
                disabled={loading || !query.trim()}
                size="sm"
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-1" />
                )}
                Execute
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setQuery("")
                  setResult(null)
                }}
                disabled={!query}
              >
                <Trash2 className="h-4 w-4 mr-1" />
                Clear
              </Button>
            </div>
            <kbd className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded border">
              Ctrl + Enter to run
            </kbd>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card className={result.error ? "border-red-200 dark:border-red-900" : ""}>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {result.error ? (
                  <AlertCircle className="h-5 w-5 text-red-500" />
                ) : (
                  <Check className="h-5 w-5 text-green-500" />
                )}
                <div>
                  <CardTitle className="text-sm font-medium">
                    {result.error ? "Query Error" : `${result.rowCount} row${result.rowCount !== 1 ? "s" : ""} returned`}
                  </CardTitle>
                  {result.duration > 0 && (
                    <CardDescription className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {result.duration}ms
                    </CardDescription>
                  )}
                </div>
              </div>
              {!result.error && result.rows.length > 0 && (
                <Button variant="outline" size="sm" onClick={copyResults}>
                  {copied ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : (
                    <Copy className="h-3 w-3 mr-1" />
                  )}
                  {copied ? "Copied!" : "Copy JSON"}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {result.error ? (
              <div className="space-y-2">
                <p className="text-sm text-red-600 dark:text-red-400 font-mono">{result.error}</p>
                {result.hint && (
                  <p className="text-xs text-muted-foreground">Hint: {result.hint}</p>
                )}
              </div>
            ) : result.rows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {resultColumns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-muted-foreground whitespace-nowrap"
                        >
                          {col}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row, idx) => (
                      <tr key={idx} className="border-b hover:bg-muted/30 transition-colors">
                        {resultColumns.map((col) => {
                          const val = row[col]
                          const isNull = val === null || val === undefined
                          const display = isNull
                            ? "NULL"
                            : typeof val === "object"
                            ? JSON.stringify(val)
                            : String(val)

                          return (
                            <td
                              key={col}
                              className={cn(
                                "px-3 py-2 font-mono text-xs max-w-[300px] truncate",
                                isNull && "text-muted-foreground italic"
                              )}
                              title={display}
                            >
                              {display.length > 80 ? display.slice(0, 80) + "…" : display}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Query executed successfully — no rows returned
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
