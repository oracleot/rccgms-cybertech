/**
 * Round-trip text format for the Worship Library editor.
 *
 * Syntax
 * ------
 * [Verse 1]             section marker
 * [Chorus] x2           section marker with repeat
 * [Other: Custom Name]  custom section type
 *
 * Line one              primary text (consecutive lines = one cue)
 * Line two (x2)         cue-level repeat on last primary line
 * > Translation          secondary line (attached to cue above)
 *
 * (blank line)          cue boundary within a section
 *
 * Round-trip guarantee: structured → text → parse → structured preserves
 * section type, section number, cue ordering, repeat metadata, and
 * secondary lines. Unknown bracket markers produce a validation error
 * rather than being silently swallowed.
 */

import { parseHeading } from "./sections"
import {
  newGroupId,
  newSectionId,
  sectionTitle,
  type LyricGroup,
  type LyricSection,
  type SectionType,
} from "./types"

// ---------------------------------------------------------------------------
// Serialize
// ---------------------------------------------------------------------------

export function serializeSections(sections: LyricSection[]): string {
  const parts: string[] = []

  for (let si = 0; si < sections.length; si++) {
    const section = sections[si]
    if (si > 0) parts.push("")

    let header: string
    if (section.type === "other") {
      header = section.label ? `[Other: ${section.label}]` : "[Other]"
    } else {
      header = `[${sectionTitle(section)}]`
    }
    if (section.repeat && section.repeat > 1) header += ` x${section.repeat}`
    parts.push(header)

    for (let gi = 0; gi < section.groups.length; gi++) {
      const g = section.groups[gi]
      if (gi > 0) parts.push("")

      let primary = g.primary
      if (g.repeat && g.repeat > 1) {
        const lines = primary.split("\n")
        lines[lines.length - 1] += ` (x${g.repeat})`
        primary = lines.join("\n")
      }
      parts.push(primary)

      if (g.secondary != null && g.secondary !== "") {
        for (const secLine of g.secondary.split("\n")) {
          parts.push(`> ${secLine}`)
        }
      }
    }
  }

  return parts.join("\n")
}

/** Serialize flat groups (no sections) as plain text, one cue per block. */
export function serializeFlat(groups: LyricGroup[]): string {
  const parts: string[] = []
  for (let i = 0; i < groups.length; i++) {
    const g = groups[i]
    if (i > 0) parts.push("")
    let primary = g.primary
    if (g.repeat && g.repeat > 1) {
      const lines = primary.split("\n")
      lines[lines.length - 1] += ` (x${g.repeat})`
      primary = lines.join("\n")
    }
    parts.push(primary)
    if (g.secondary != null && g.secondary !== "") {
      for (const secLine of g.secondary.split("\n")) {
        parts.push(`> ${secLine}`)
      }
    }
  }
  return parts.join("\n")
}

// ---------------------------------------------------------------------------
// Parse
// ---------------------------------------------------------------------------

export interface TextParseResult {
  sections: LyricSection[]
  errors: string[]
}

const SECTION_RE = /^\[(.+?)\](?:\s*x(\d+))?\s*$/

export function parseTextToSections(text: string): TextParseResult {
  const lines = text.replace(/\r\n/g, "\n").split("\n")
  const sections: LyricSection[] = []
  const errors: string[] = []

  let currentSection: LyricSection | null = null
  let cueLines: string[] = []
  let cueSecondaryLines: string[] = []

  const flushCue = () => {
    if (!cueLines.length && !cueSecondaryLines.length) return
    if (!currentSection) {
      if (cueLines.length) {
        errors.push(`Content before any section marker: "${cueLines[0]}"`)
      }
      cueLines = []
      cueSecondaryLines = []
      return
    }

    if (cueLines.length) {
      let primary = cueLines.join("\n")
      let repeat: number | undefined

      const lastLine = cueLines[cueLines.length - 1]
      const rm = lastLine.match(/^(.*?)\s*\(x(\d+)\)\s*$/i)
      if (rm) {
        cueLines[cueLines.length - 1] = rm[1].trimEnd()
        primary = cueLines.join("\n")
        const n = Number(rm[2])
        if (n > 1) repeat = n
      }

      const group: LyricGroup = { id: newGroupId(), primary }
      if (repeat) group.repeat = repeat
      if (cueSecondaryLines.length) {
        group.secondary = cueSecondaryLines.join("\n")
      }
      currentSection.groups.push(group)
    }

    cueLines = []
    cueSecondaryLines = []
  }

  for (let ln = 0; ln < lines.length; ln++) {
    const line = lines[ln]
    const trimmed = line.trim()

    const sm = trimmed.match(SECTION_RE)
    if (sm) {
      flushCue()
      if (currentSection) sections.push(currentSection)

      const headerText = sm[1].trim()
      const sectionRepeat = sm[2] ? Number(sm[2]) : undefined
      const parsed = parseSectionHeader(headerText)

      if (!parsed) {
        errors.push(`Line ${ln + 1}: Unrecognised section "[${headerText}]"`)
        currentSection = { id: newSectionId(), type: "other", label: headerText, groups: [] }
      } else {
        currentSection = { id: newSectionId(), type: parsed.type, groups: [] }
        if (parsed.number !== undefined) currentSection.number = parsed.number
        if (parsed.label) currentSection.label = parsed.label
      }
      if (sectionRepeat && sectionRepeat > 1) currentSection.repeat = sectionRepeat
      continue
    }

    if (trimmed.startsWith(">")) {
      const secText = trimmed.startsWith("> ") ? trimmed.slice(2) : trimmed.slice(1)
      if (cueLines.length) {
        cueSecondaryLines.push(secText)
      } else if (currentSection && currentSection.groups.length) {
        const last = currentSection.groups[currentSection.groups.length - 1]
        last.secondary = last.secondary ? `${last.secondary}\n${secText}` : secText
      } else {
        errors.push(`Line ${ln + 1}: Secondary line ">" without a primary cue above it`)
      }
      continue
    }

    if (!trimmed) {
      flushCue()
      continue
    }

    cueLines.push(trimmed)
  }

  flushCue()
  if (currentSection) sections.push(currentSection)

  return { sections, errors }
}

function parseSectionHeader(
  text: string,
): { type: SectionType; number?: number; label?: string } | null {
  const otherMatch = text.match(/^other(?::\s*(.+))?$/i)
  if (otherMatch) {
    return { type: "other", label: otherMatch[1]?.trim() }
  }

  const heading = parseHeading(text)
  if (heading) {
    return { type: heading.type, number: heading.number, label: heading.label }
  }

  return null
}

// ---------------------------------------------------------------------------
// Normalize song cues
// ---------------------------------------------------------------------------

export interface NormalizeDiff {
  sectionTitle: string
  beforeCues: number
  afterCues: number
}

export function previewNormalize(sections: LyricSection[]): NormalizeDiff[] {
  const diffs: NormalizeDiff[] = []
  for (const section of sections) {
    let afterCues = 0
    for (const g of section.groups) {
      const lineCount = g.primary.split("\n").filter((l) => l.trim()).length
      afterCues += lineCount > 1 ? lineCount : 1
    }
    if (afterCues !== section.groups.length) {
      diffs.push({
        sectionTitle: sectionTitle(section),
        beforeCues: section.groups.length,
        afterCues,
      })
    }
  }
  return diffs
}

export function normalizeSongCues(sections: LyricSection[]): LyricSection[] {
  return sections.map((section) => ({
    ...section,
    groups: section.groups.flatMap((group) => {
      const lines = group.primary.split("\n").filter((l) => l.trim())
      if (lines.length <= 1) return [group]
      return lines.map((line, i): LyricGroup => {
        const g: LyricGroup = { id: newGroupId(), primary: line }
        if (i === 0 && group.secondary != null) g.secondary = group.secondary
        if (i === 0 && group.repeat) g.repeat = group.repeat
        return g
      })
    }),
  }))
}
