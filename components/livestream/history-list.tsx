"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { format } from "date-fns"
import { Youtube, Facebook, Copy, ChevronDown, ChevronUp } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Skeleton } from "@/components/ui/skeleton"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface LivestreamHistory {
  id: string
  title: string
  speaker: string | null
  youtube_description: string | null
  facebook_description: string | null
  created_at: string
  rota: {
    id: string
    date: string
  } | null
}

interface HistoryListProps {
  initialData?: LivestreamHistory[]
}

export function HistoryList({ initialData }: HistoryListProps) {
  const [history, setHistory] = useState<LivestreamHistory[]>(initialData || [])
  const [loading, setLoading] = useState(!initialData)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [hasMore, setHasMore] = useState(true)
  const [offset, setOffset] = useState(initialData?.length || 0)

  const fetchHistory = useCallback(async (loadMore = false) => {
    setLoading(true)
    try {
      const currentOffset = loadMore ? offset : 0
      const response = await fetch(
        `/api/livestream/history?limit=20&offset=${currentOffset}`
      )
      if (!response.ok) throw new Error("Failed to fetch history")

      const data = await response.json()
      
      if (loadMore) {
        setHistory((prev) => [...prev, ...data.livestreams])
      } else {
        setHistory(data.livestreams)
      }
      setHasMore(data.hasMore)
      setOffset(currentOffset + data.livestreams.length)
    } catch (error) {
      toast.error("Failed to load history")
      console.error(error)
    } finally {
      setLoading(false)
    }
  }, [offset])

  useEffect(() => {
    if (!initialData) {
      fetchHistory()
    }
  }, [initialData, fetchHistory])

  const copyToClipboard = async (text: string, platform: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success(`${platform} description copied!`)
    } catch {
      toast.error("Failed to copy")
    }
  }

  if (loading && history.length === 0) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-6 w-3/4" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (history.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground">No descriptions generated yet</p>
          <Button asChild className="mt-4">
            <Link href="/livestream">Generate Your First Description</Link>
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {history.map((item) => {
        const isExpanded = expandedId === item.id
        
        return (
          <Card key={item.id} className="overflow-hidden">
            <CardHeader
              className={cn(
                "cursor-pointer transition-colors hover:bg-muted/50",
                isExpanded && "border-b"
              )}
              onClick={() => setExpandedId(isExpanded ? null : item.id)}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1">
                  <CardTitle className="line-clamp-1 text-base">
                    {item.title}
                  </CardTitle>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
                    {item.speaker && <span>{item.speaker}</span>}
                    <span>•</span>
                    <span>{format(new Date(item.created_at), "PPp")}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    {item.youtube_description && (
                      <Badge variant="secondary" className="gap-1">
                        <Youtube className="h-3 w-3 text-red-500" />
                        YT
                      </Badge>
                    )}
                    {item.facebook_description && (
                      <Badge variant="secondary" className="gap-1">
                        <Facebook className="h-3 w-3 text-blue-600" />
                        FB
                      </Badge>
                    )}
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </div>
              </div>
            </CardHeader>

            {isExpanded && (
              <CardContent className="space-y-4 pt-4">
                {item.youtube_description && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        <Youtube className="h-4 w-4 text-red-500" />
                        YouTube Description
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(item.youtube_description!, "YouTube")
                        }}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                      </Button>
                    </div>
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <pre className="whitespace-pre-wrap font-sans">
                        {item.youtube_description}
                      </pre>
                    </div>
                  </div>
                )}

                {item.facebook_description && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 font-medium">
                        <Facebook className="h-4 w-4 text-blue-600" />
                        Facebook Description
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation()
                          copyToClipboard(item.facebook_description!, "Facebook")
                        }}
                      >
                        <Copy className="mr-1 h-3 w-3" />
                        Copy
                      </Button>
                    </div>
                    <div className="rounded-md bg-muted p-3 text-sm">
                      <pre className="whitespace-pre-wrap font-sans">
                        {item.facebook_description}
                      </pre>
                    </div>
                  </div>
                )}
              </CardContent>
            )}
          </Card>
        )
      })}

      {hasMore && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            onClick={() => fetchHistory(true)}
            disabled={loading}
          >
            {loading ? "Loading..." : "Load More"}
          </Button>
        </div>
      )}
    </div>
  )
}
