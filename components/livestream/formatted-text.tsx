"use client"

import { useMemo } from "react"
import { cn } from "@/lib/utils"

interface FormattedTextProps {
  content: string
  className?: string
}

/**
 * Renders text with basic markdown formatting:
 * - **bold** -> <strong>bold</strong>
 * - *italic* -> <em>italic</em>
 * - [text](url) -> <a href="url">text</a>
 * - #hashtag -> styled hashtag
 * - 🔗 URLs -> clickable links
 */
export function FormattedText({ content, className }: FormattedTextProps) {
  const formattedContent = useMemo(() => {
    if (!content) return null

    // Split by lines to preserve whitespace/newlines
    const lines = content.split("\n")

    return lines.map((line, lineIndex) => {
      // Process each line
      const elements = parseLineWithFormatting(line, lineIndex)
      
      return (
        <span key={lineIndex}>
          {elements}
          {lineIndex < lines.length - 1 && <br />}
        </span>
      )
    })
  }, [content])

  return (
    <div className={cn("whitespace-pre-wrap", className)}>
      {formattedContent}
    </div>
  )
}

function parseLineWithFormatting(line: string, lineIndex: number): React.ReactNode[] {
  const elements: React.ReactNode[] = []
  let remaining = line
  let keyCounter = 0

  while (remaining.length > 0) {
    // Try to match patterns in order of priority
    
    // 1. Bold: **text**
    const boldMatch = remaining.match(/^\*\*([^*]+)\*\*/)
    if (boldMatch) {
      elements.push(
        <strong key={`${lineIndex}-${keyCounter++}`} className="font-semibold">
          {boldMatch[1]}
        </strong>
      )
      remaining = remaining.slice(boldMatch[0].length)
      continue
    }

    // 2. Italic: *text* (single asterisk)
    const italicMatch = remaining.match(/^\*([^*]+)\*/)
    if (italicMatch) {
      elements.push(
        <em key={`${lineIndex}-${keyCounter++}`} className="italic">
          {italicMatch[1]}
        </em>
      )
      remaining = remaining.slice(italicMatch[0].length)
      continue
    }

    // 3. Markdown link: [text](url)
    const linkMatch = remaining.match(/^\[([^\]]+)\]\(([^)]+)\)/)
    if (linkMatch) {
      elements.push(
        <a
          key={`${lineIndex}-${keyCounter++}`}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline"
        >
          {linkMatch[1]}
        </a>
      )
      remaining = remaining.slice(linkMatch[0].length)
      continue
    }

    // 4. Hashtag: #word
    const hashtagMatch = remaining.match(/^(#[A-Za-z0-9_]+)/)
    if (hashtagMatch) {
      elements.push(
        <span
          key={`${lineIndex}-${keyCounter++}`}
          className="text-blue-500"
        >
          {hashtagMatch[1]}
        </span>
      )
      remaining = remaining.slice(hashtagMatch[0].length)
      continue
    }

    // 5. Plain URL: https://... or http://...
    const urlMatch = remaining.match(/^(https?:\/\/[^\s]+)/)
    if (urlMatch) {
      elements.push(
        <a
          key={`${lineIndex}-${keyCounter++}`}
          href={urlMatch[1]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-500 hover:underline break-all"
        >
          {urlMatch[1]}
        </a>
      )
      remaining = remaining.slice(urlMatch[0].length)
      continue
    }

    // 6. Emoji section headers (e.g., "📖 Scripture:")
    const emojiHeaderMatch = remaining.match(/^([\u{1F300}-\u{1F9FF}][\u{FE00}-\u{FE0F}]?\s+[^:\n]+:)/u)
    if (emojiHeaderMatch) {
      elements.push(
        <span key={`${lineIndex}-${keyCounter++}`} className="font-medium">
          {emojiHeaderMatch[1]}
        </span>
      )
      remaining = remaining.slice(emojiHeaderMatch[0].length)
      continue
    }

    // No match - take the next character as plain text
    // But try to batch consecutive plain text for efficiency
    let plainTextEnd = 1
    while (plainTextEnd < remaining.length) {
      const nextChar = remaining[plainTextEnd]
      // Stop if we might be starting a special pattern
      if (
        nextChar === "*" ||
        nextChar === "[" ||
        nextChar === "#" ||
        nextChar === "h" // possible http
      ) {
        break
      }
      plainTextEnd++
    }

    elements.push(
      <span key={`${lineIndex}-${keyCounter++}`}>
        {remaining.slice(0, plainTextEnd)}
      </span>
    )
    remaining = remaining.slice(plainTextEnd)
  }

  return elements
}
