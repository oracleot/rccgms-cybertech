"use client"

import { useState } from "react"
import {
  Table2,
  Key,
  Hash,
  Type,
  ShieldQuestion,
  Loader2,
  ChevronDown,
  ChevronRight,
  Database,
} from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface ColumnInfo {
  column_name: string
  data_type: string
  is_nullable: string
  column_default: string | null
  is_primary: boolean
}

interface SchemaInspectorProps {
  tables: Array<{ name: string; row_count: number }>
}

export function SchemaInspector({ tables }: SchemaInspectorProps) {
  const [expandedTable, setExpandedTable] = useState<string | null>(null)
  const [schemas, setSchemas] = useState<Record<string, ColumnInfo[]>>({})
  const [loading, setLoading] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  async function toggleTable(tableName: string) {
    if (expandedTable === tableName) {
      setExpandedTable(null)
      return
    }

    setExpandedTable(tableName)

    // Already loaded
    if (schemas[tableName]) return

    setLoading(tableName)
    try {
      const res = await fetch(`/api/admin/developer/tables/${tableName}/schema`)
      if (res.ok) {
        const data = await res.json()
        setSchemas((prev) => ({ ...prev, [tableName]: data.columns ?? [] }))
      } else {
        const errData = await res.json()
        setErrors((prev) => ({ ...prev, [tableName]: errData.error ?? "Failed to load schema" }))
      }
    } catch {
      setErrors((prev) => ({ ...prev, [tableName]: "Network error" }))
    } finally {
      setLoading(null)
    }
  }

  function getTypeColor(dataType: string): string {
    if (dataType.includes("uuid")) return "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200"
    if (dataType.includes("int") || dataType.includes("numeric") || dataType.includes("decimal"))
      return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200"
    if (dataType.includes("text") || dataType.includes("char") || dataType.includes("varchar"))
      return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
    if (dataType.includes("bool"))
      return "bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-200"
    if (dataType.includes("timestamp") || dataType.includes("date") || dataType.includes("time"))
      return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
    if (dataType.includes("json"))
      return "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200"
    if (dataType === "USER-DEFINED")
      return "bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200"
    return "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200"
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Table2 className="h-4 w-4" />
          Schema Inspector
        </CardTitle>
        <CardDescription>
          Click a table to view its column definitions — types, nullability, defaults, and primary keys
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-1">
        {tables.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No tables found</p>
        ) : (
          tables.map((table) => {
            const isExpanded = expandedTable === table.name
            const isLoading = loading === table.name
            const cols = schemas[table.name]
            const err = errors[table.name]

            return (
              <div key={table.name} className="rounded-lg border overflow-hidden">
                {/* Table row */}
                <button
                  onClick={() => toggleTable(table.name)}
                  className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors text-left"
                >
                  <div className="flex items-center gap-2">
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    )}
                    <Database className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{table.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-xs">
                      {table.row_count} rows
                    </Badge>
                    {isLoading && <Loader2 className="h-3 w-3 animate-spin" />}
                  </div>
                </button>

                {/* Schema details */}
                {isExpanded && (
                  <div className="border-t bg-muted/20 p-3">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                      </div>
                    ) : err ? (
                      <p className="text-sm text-red-500 py-2">{err}</p>
                    ) : cols && cols.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-xs">
                          <thead>
                            <tr className="text-muted-foreground">
                              <th className="text-left p-1.5 font-medium">Column</th>
                              <th className="text-left p-1.5 font-medium">Type</th>
                              <th className="text-left p-1.5 font-medium">Nullable</th>
                              <th className="text-left p-1.5 font-medium">Default</th>
                            </tr>
                          </thead>
                          <tbody>
                            {cols.map((col) => (
                              <tr key={col.column_name} className="border-t border-muted">
                                <td className="p-1.5">
                                  <div className="flex items-center gap-1.5">
                                    {col.is_primary ? (
                                      <Key className="h-3 w-3 text-amber-500" />
                                    ) : (
                                      <Hash className="h-3 w-3 text-muted-foreground/50" />
                                    )}
                                    <span
                                      className={cn(
                                        "font-mono",
                                        col.is_primary && "font-semibold text-amber-600 dark:text-amber-400"
                                      )}
                                    >
                                      {col.column_name}
                                    </span>
                                    {col.is_primary && (
                                      <Badge variant="outline" className="text-[10px] px-1 py-0">
                                        PK
                                      </Badge>
                                    )}
                                  </div>
                                </td>
                                <td className="p-1.5">
                                  <Badge
                                    variant="secondary"
                                    className={cn("text-[10px] font-mono", getTypeColor(col.data_type))}
                                  >
                                    <Type className="h-2.5 w-2.5 mr-0.5" />
                                    {col.data_type}
                                  </Badge>
                                </td>
                                <td className="p-1.5">
                                  <span className={cn(
                                    "text-xs",
                                    col.is_nullable === "YES" 
                                      ? "text-muted-foreground" 
                                      : "text-red-600 dark:text-red-400 font-medium"
                                  )}>
                                    {col.is_nullable === "YES" ? (
                                      <span className="flex items-center gap-0.5">
                                        <ShieldQuestion className="h-3 w-3" />
                                        nullable
                                      </span>
                                    ) : (
                                      "NOT NULL"
                                    )}
                                  </span>
                                </td>
                                <td className="p-1.5">
                                  {col.column_default ? (
                                    <code className="text-[10px] bg-muted px-1 py-0.5 rounded font-mono">
                                      {col.column_default.length > 40
                                        ? col.column_default.slice(0, 40) + "…"
                                        : col.column_default}
                                    </code>
                                  ) : (
                                    <span className="text-muted-foreground">—</span>
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground py-2">No columns found</p>
                    )}
                  </div>
                )}
              </div>
            )
          })
        )}
      </CardContent>
    </Card>
  )
}
