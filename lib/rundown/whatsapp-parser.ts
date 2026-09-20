export interface ParsedRundownItem {
  order: number
  title: string
  startTime: string | null
  endTime: string | null
  durationMinutes: number | null
  assignedTo: string | null
  type: string
}

export interface ParseResult {
  items: ParsedRundownItem[]
  unrecognised: string[]
}

const TYPE_KEYWORDS: Record<string, string[]> = {
  prayer: ["prayer", "devotion", "benediction", "intercession"],
  song: ["praise", "worship", "hymn", "choir", "song", "singing"],
  sermon: ["sermon", "message", "word", "preaching"],
  announcement: ["announcement"],
  offering: ["offering", "tithe", "collection"],
  video: ["video", "clip", "film"],
}

function inferType(title: string): string {
  const lower = title.toLowerCase()
  for (const [type, keywords] of Object.entries(TYPE_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return type
  }
  return "transition"
}

function stripBold(s: string): string {
  return s.replace(/\*/g, "").trim()
}

const LINE_RE =
  /^\s*(\d+)\s*[.)]+\s+(.+?)(?:\s+[-–]\s+(\d{1,2}:\d{2})\s*[-–]\s*(\d{1,2}:\d{2}))?\s*(?:\*?\((\d+)\s*(?:mins?|minutes?)\)\*?)?\s*(?:\(([^)]+)\))?\s*$/i

export function parseWhatsAppRundown(text: string): ParseResult {
  const lines = text.split(/\r?\n/).map((l) => stripBold(l))
  const items: ParsedRundownItem[] = []
  const unrecognised: string[] = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    // Skip headings (lines that don't start with a digit) and Note: lines
    if (/^note\s*:/i.test(line)) continue
    if (!/^\d/.test(line)) continue

    const m = line.match(LINE_RE)
    if (!m) {
      unrecognised.push(raw)
      continue
    }

    const [, orderStr, titleRaw, start, end, durStr, person] = m

    items.push({
      order: parseInt(orderStr, 10),
      title: titleRaw.trim(),
      startTime: start ?? null,
      endTime: end ?? null,
      durationMinutes: durStr ? parseInt(durStr, 10) : null,
      assignedTo: person?.trim() ?? null,
      type: inferType(titleRaw),
    })
  }

  return { items, unrecognised }
}
