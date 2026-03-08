"use client"

import { useState, useEffect, useCallback } from "react"
import {
  Database,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  RefreshCw,
  Table2,
  Eye,
  Loader2,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"

interface TableInfo {
  name: string
  row_count: number
}

interface PaginationInfo {
  page: number
  pageSize: number
  totalRows: number
  totalPages: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- dynamic table rows have unknown column shapes
type RowData = Record<string, any>

export function TableBrowser() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const [rows, setRows] = useState<RowData[]>([])
  const [columns, setColumns] = useState<string[]>([])
  const [pagination, setPagination] = useState<PaginationInfo>({
    page: 1,
    pageSize: 25,
    totalRows: 0,
    totalPages: 0,
  })
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc")
  const [search, setSearch] = useState("")
  const [searchInput, setSearchInput] = useState("")
  const [loading, setLoading] = useState(false)
  const [tablesLoading, setTablesLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [expandedCell, setExpandedCell] = useState<string | null>(null)

  // Fetch table list
  useEffect(() => {
    async function fetchTables() {
      setTablesLoading(true)
      try {
        const res = await fetch("/api/admin/developer/tables")
        if (res.ok) {
          const data = await res.json()
          setTables(data.tables ?? [])
        }
      } catch {
        setError("Failed to load tables")
      } finally {
        setTablesLoading(false)
      }
    }
    fetchTables()
  }, [])

  // Fetch rows when table/page/sort/search changes
  const fetchRows = useCallback(async () => {
    if (!selectedTable) return
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        pageSize: pagination.pageSize.toString(),
      })
      if (sortColumn) {
        params.set("sort", sortColumn)
        params.set("order", sortOrder)
      }
      if (search) {
        params.set("search", search)
      }

      const res = await fetch(`/api/admin/developer/tables/${selectedTable}/rows?${params}`)
      if (res.ok) {
        const data = await res.json()
        setRows(data.rows ?? [])
        setPagination((prev) => ({
          ...prev,
          totalRows: data.pagination.totalRows,
          totalPages: data.pagination.totalPages,
        }))
        // Infer columns from first row
        if (data.rows?.length > 0) {
          setColumns(Object.keys(data.rows[0]))
        }
      } else {
        const errData = await res.json()
        setError(errData.error ?? "Failed to load rows")
      }
    } catch {
      setError("Failed to fetch data")
    } finally {
      setLoading(false)
    }
  }, [selectedTable, pagination.page, pagination.pageSize, sortColumn, sortOrder, search])

  useEffect(() => {
    fetchRows()
  }, [fetchRows])

  function selectTable(tableName: string) {
    setSelectedTable(tableName)
    setPagination((prev) => ({ ...prev, page: 1 }))
    setSortColumn(null)
    setSortOrder("asc")
    setSearch("")
    setSearchInput("")
    setRows([])
    setColumns([])
  }

  function handleSort(column: string) {
    if (sortColumn === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"))
    } else {
      setSortColumn(column)
      setSortOrder("asc")
    }
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  function handleSearch() {
    setSearch(searchInput)
    setPagination((prev) => ({ ...prev, page: 1 }))
  }

  function formatCellValue(value: unknown): string {
    if (value === null || value === undefined) return "NULL"
    if (typeof value === "object") return JSON.stringify(value)
    return String(value)
  }

  function truncateValue(value: string, maxLen = 60): string {
    if (value.length <= maxLen) return value
    return value.slice(0, maxLen) + "…"
  }

  return (
    <div className="space-y-4">
      {/* Table Selector */}
      {!selectedTable ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Table2 className="h-4 w-4" />
              Select a Table
            </CardTitle>
            <CardDescription>
              {tables.length} tables available &middot; Click to browse data
            </CardDescription>
          </CardHeader>
          <CardContent>
            {tablesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                {tables.map((table) => (
                  <button
                    key={table.name}
                    onClick={() => selectTable(table.name)}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Database className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium">{table.name.replace(/_/g, " ")}</span>
                    </div>
                    <Badge variant="secondary">{table.row_count}</Badge>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Table Header with back button */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSelectedTable(null)
                  setRows([])
                  setColumns([])
                }}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                All Tables
              </Button>
              <div>
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  {selectedTable}
                </h3>
                <p className="text-sm text-muted-foreground">
                  {pagination.totalRows} rows total
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={fetchRows} disabled={loading}>
                <RefreshCw className={cn("h-4 w-4 mr-1", loading && "animate-spin")} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Search & Page Size */}
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="flex gap-2 flex-1">
              <Input
                placeholder="Search text columns..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="max-w-sm"
              />
              <Button variant="secondary" size="sm" onClick={handleSearch}>
                <Search className="h-4 w-4" />
              </Button>
              {search && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("")
                    setSearchInput("")
                    setPagination((prev) => ({ ...prev, page: 1 }))
                  }}
                >
                  Clear
                </Button>
              )}
            </div>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(v) =>
                setPagination((prev) => ({ ...prev, page: 1, pageSize: parseInt(v) }))
              }
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10 rows</SelectItem>
                <SelectItem value="25">25 rows</SelectItem>
                <SelectItem value="50">50 rows</SelectItem>
                <SelectItem value="100">100 rows</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Error */}
          {error && (
            <Card className="border-red-200 dark:border-red-900">
              <CardContent className="pt-4">
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              </CardContent>
            </Card>
          )}

          {/* Data Table */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      {columns.map((col) => (
                        <th
                          key={col}
                          className="px-3 py-2 text-left font-medium text-muted-foreground cursor-pointer hover:bg-muted/80 select-none whitespace-nowrap"
                          onClick={() => handleSort(col)}
                        >
                          <div className="flex items-center gap-1">
                            {col}
                            {sortColumn === col ? (
                              sortOrder === "asc" ? (
                                <ArrowUp className="h-3 w-3" />
                              ) : (
                                <ArrowDown className="h-3 w-3" />
                              )
                            ) : (
                              <ArrowUpDown className="h-3 w-3 opacity-30" />
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={columns.length || 1} className="px-3 py-8 text-center">
                          <Loader2 className="h-6 w-6 animate-spin mx-auto text-muted-foreground" />
                        </td>
                      </tr>
                    ) : rows.length === 0 ? (
                      <tr>
                        <td
                          colSpan={columns.length || 1}
                          className="px-3 py-8 text-center text-muted-foreground"
                        >
                          {search ? "No matching rows found" : "No data in table"}
                        </td>
                      </tr>
                    ) : (
                      rows.map((row, rowIdx) => (
                        <tr
                          key={rowIdx}
                          className="border-b hover:bg-muted/30 transition-colors"
                        >
                          {columns.map((col) => {
                            const raw = formatCellValue(row[col])
                            const cellKey = `${rowIdx}-${col}`
                            const isExpanded = expandedCell === cellKey
                            const isLong = raw.length > 60
                            const isNull = row[col] === null || row[col] === undefined

                            return (
                              <td
                                key={col}
                                className={cn(
                                  "px-3 py-2 max-w-[300px]",
                                  isNull && "text-muted-foreground italic"
                                )}
                              >
                                <div className="flex items-center gap-1">
                                  <span className="font-mono text-xs break-all">
                                    {isExpanded ? raw : truncateValue(raw)}
                                  </span>
                                  {isLong && (
                                    <button
                                      onClick={() =>
                                        setExpandedCell(isExpanded ? null : cellKey)
                                      }
                                      className="shrink-0"
                                    >
                                      <Eye className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </button>
                                  )}
                                </div>
                              </td>
                            )
                          })}
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                Showing {(pagination.page - 1) * pagination.pageSize + 1}–
                {Math.min(pagination.page * pagination.pageSize, pagination.totalRows)} of{" "}
                {pagination.totalRows}
              </p>
              <div className="flex items-center gap-1">
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page <= 1}
                  onClick={() => setPagination((prev) => ({ ...prev, page: 1 }))}
                >
                  <ChevronsLeft className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page <= 1}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page - 1 }))
                  }
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="px-3 text-sm">
                  Page {pagination.page} of {pagination.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: prev.page + 1 }))
                  }
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="h-8 w-8"
                  disabled={pagination.page >= pagination.totalPages}
                  onClick={() =>
                    setPagination((prev) => ({ ...prev, page: pagination.totalPages }))
                  }
                >
                  <ChevronsRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}
