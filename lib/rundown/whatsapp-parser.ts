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

const TIME_RANGE_RE = /(?:^|\s)(\d{1,2}:\d{2})\s*(?:-|–|—|to)\s*(\d{1,2}:\d{2})(?=\s|$)/i
const DURATION_RE = /(?:\(?\s*)(\d+(?:\.\d+)?)\s*(?:min(?:ute)?s?|m)\s*\)?/i

function cleanTitle(value: string): string {
  return value
    .replace(/^[\s•●○▪▸➜→*-]+/, "")
    .replace(/\s*(?:[-–—|:]+)\s*$/, "")
    .replace(/\s{2,}/g, " ")
    .trim()
}

function parseFlexibleLine(raw: string, fallbackOrder: number): ParsedRundownItem | null {
  let line = raw.trim()
  line = line.replace(/^\s*(?:\d+\s*[.)]|[•●○▪▸➜→*-])\s*/, "")
  if (!line || /^note\s*:/i.test(line) || /^\(?\s*(?:programme|program|order of service|service flow)\s*\)?$/i.test(line)) return null

  const time = line.match(TIME_RANGE_RE)
  const startTime = time?.[1] ?? null
  const endTime = time?.[2] ?? null
  if (time) line = line.replace(time[0], " ")

  const duration = line.match(DURATION_RE)
  const durationMinutes = duration ? Number(duration[1]) : null
  if (duration) line = line.replace(duration[0], " ")

  // A final parenthesised value is usually the person/team; preserve other
  // parenthesised text as part of the title.
  let assignedTo: string | null = null
  const assignee = line.match(/\s*\(([^()]+)\)\s*$/)
  if (assignee) {
    assignedTo = assignee[1].trim()
    line = line.slice(0, assignee.index).trim()
  }

  const title = cleanTitle(line)
  if (!title || (!time && !duration && !/\b(prayer|worship|sermon|message|announcement|offering|hymn|school|video|transition)\b/i.test(title))) return null
  return { order: fallbackOrder, title, startTime, endTime, durationMinutes, assignedTo, type: inferType(title) }
}

export function parseWhatsAppRundown(text: string): ParseResult {
  const lines = text.replace(/\r\n?/g, "\n").split("\n").map((l) => stripBold(l))
  const items: ParsedRundownItem[] = []
  const unrecognised: string[] = []

  let fallbackOrder = 1
  for (const raw of lines) {
    const line = raw.trim()
    if (!line) continue

    const item = parseFlexibleLine(line, fallbackOrder)
    if (!item) {
      if (/^\d/.test(line) || /^[•●○▪▸➜→*-]/.test(line)) unrecognised.push(raw)
      continue
    }
    const explicitOrder = line.match(/^\s*(\d+)\s*[.)]/)
    items.push({ ...item, order: explicitOrder ? parseInt(explicitOrder[1], 10) : fallbackOrder })
    fallbackOrder += 1
    /*if (!m) {
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
    })*/
  }

  return { items, unrecognised }
}
