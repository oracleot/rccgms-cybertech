"use client"

import React from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Youtube, Facebook, Sparkles } from "lucide-react"
import type { Platform } from "@/lib/validations/livestream"

interface StreamingPreviewProps {
  content: string
  platform: Platform
  title?: string
  isLoading?: boolean
  error?: Error | null
}

const PLATFORM_CONFIG = {
  youtube: {
    Icon: Youtube,
    label: "YouTube",
    iconClass: "text-red-500",
    emptyHint: 'Fill in the service details and click "Generate" to create a YouTube description',
  },
  facebook: {
    Icon: Facebook,
    label: "Facebook",
    iconClass: "text-[#1877F2]",
    emptyHint: 'Fill in the service details and click "Generate" to create a Facebook post',
  },
} as const

export function StreamingPreview({
  content,
  platform,
  isLoading,
  error,
}: StreamingPreviewProps) {
  const { Icon, label, iconClass, emptyHint } = PLATFORM_CONFIG[platform]

  return (
    <Card className="flex h-full flex-col overflow-hidden">
      <CardHeader className="border-b py-4">
        <CardTitle className="flex items-center gap-2 text-base font-semibold">
          <Icon className={`h-4 w-4 shrink-0 ${iconClass}`} />
          {label} Preview
          {isLoading && (
            <Sparkles className="ml-auto h-4 w-4 animate-pulse text-primary" />
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="flex-1 overflow-auto p-0">
        {error ? (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="space-y-1">
              <p className="font-medium text-destructive">Failed to generate description</p>
              <p className="text-sm text-muted-foreground">{error.message}</p>
            </div>
          </div>
        ) : isLoading && !content ? (
          <DocumentSkeleton />
        ) : content ? (
          <DocumentBody content={content} />
        ) : (
          <div className="flex h-full items-center justify-center p-6 text-center">
            <div className="space-y-2">
              <Icon className={`mx-auto h-10 w-10 opacity-20 ${iconClass}`} />
              <p className="text-sm text-muted-foreground">{emptyHint}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

function DocumentBody({ content }: { content: string }) {
  return (
    <div className="p-6">
      <div className="mx-auto max-w-prose">
        <DocumentText content={content} />
      </div>
    </div>
  )
}

function DocumentText({ content }: { content: string }) {
  const lines = content.split("\n")
  const nodes: React.ReactNode[] = []
  let key = 0

  let i = 0
  while (i < lines.length) {
    const line = lines[i]

    // Header line (ALL CAPS | ... | ...) — first non-empty line with pipes
    if (i === 0 && line.includes("|")) {
      nodes.push(
        <h1
          key={key++}
          className="text-base font-bold leading-snug tracking-wide text-foreground"
        >
          {line}
        </h1>
      )
      i++
      continue
    }

    // "What to Expect:" heading
    if (line.trim().toLowerCase().startsWith("what to expect")) {
      nodes.push(
        <p key={key++} className="font-bold text-foreground">
          {line.trim()}
        </p>
      )
      i++
      continue
    }

    // Bullet point
    if (line.trim().startsWith("•")) {
      const bullets: string[] = []
      while (i < lines.length && lines[i].trim().startsWith("•")) {
        bullets.push(lines[i].trim().slice(1).trim())
        i++
      }
      nodes.push(
        <ul key={key++} className="space-y-1 pl-1">
          {bullets.map((b, bi) => (
            <li key={bi} className="flex items-start gap-2 text-sm text-foreground/90">
              <span className="mt-0.5 shrink-0 text-primary">•</span>
              <span>{b}</span>
            </li>
          ))}
        </ul>
      )
      continue
    }

    // Blank line → spacer
    if (line.trim() === "") {
      nodes.push(<div key={key++} className="h-3" />)
      i++
      continue
    }

    // Regular paragraph
    nodes.push(
      <p key={key++} className="text-sm leading-relaxed text-foreground/80">
        {line}
      </p>
    )
    i++
  }

  return <div className="space-y-1">{nodes}</div>
}

function DocumentSkeleton() {
  return (
    <div className="space-y-4 p-6">
      <div className="space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-5 w-3/4" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-11/12" />
        <Skeleton className="h-4 w-10/12" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-4/5" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="space-y-2 pt-1">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
      </div>
    </div>
  )
}
