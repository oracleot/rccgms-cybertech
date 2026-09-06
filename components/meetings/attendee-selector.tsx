"use client"

import { useEffect, useMemo, useState } from "react"
import { CalendarCheck, CalendarX, HelpCircle, Search, Sparkles, User } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"

interface AttendeeOption {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isAvailable?: boolean
}

interface AttendeeSelectorProps {
  selectedIds: string[]
  requiredIds: string[]
  onChange: (selectedIds: string[], requiredIds: string[]) => void
  /** When set, fetches that date's availability so free people sort first. */
  date?: string
}

export function AttendeeSelector({ selectedIds, requiredIds, onChange, date }: AttendeeSelectorProps) {
  const [people, setPeople] = useState<AttendeeOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    async function load() {
      setIsLoading(true)
      const supabase = createClient()

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, name, email, avatar_url")
        .order("name", { ascending: true })

      let availabilityMap: Record<string, boolean> = {}
      if (date) {
        const { data: availability } = await supabase
          .from("availability")
          .select("user_id, is_available")
          .eq("date", date)
        availabilityMap = Object.fromEntries(
          (availability || []).map((a) => [a.user_id, a.is_available])
        )
      }

      const options: AttendeeOption[] = (profiles || []).map((p) => ({
        id: p.id,
        name: p.name || p.email || "Unknown",
        email: p.email || "",
        avatarUrl: p.avatar_url,
        isAvailable: date ? availabilityMap[p.id] : undefined,
      }))

      options.sort((a, b) => {
        if (a.isAvailable === b.isAvailable) return a.name.localeCompare(b.name)
        if (a.isAvailable === true) return -1
        if (b.isAvailable === true) return 1
        if (a.isAvailable === undefined) return -1
        if (b.isAvailable === undefined) return 1
        return 0
      })

      setPeople(options)
      setIsLoading(false)
    }
    load()
  }, [date])

  const filtered = useMemo(() => {
    if (!search.trim()) return people
    const q = search.toLowerCase()
    return people.filter((p) => p.name.toLowerCase().includes(q) || p.email.toLowerCase().includes(q))
  }, [people, search])

  function toggle(id: string) {
    if (selectedIds.includes(id)) {
      onChange(
        selectedIds.filter((i) => i !== id),
        requiredIds.filter((i) => i !== id)
      )
    } else {
      onChange([...selectedIds, id], requiredIds)
    }
  }

  function toggleRequired(id: string) {
    if (requiredIds.includes(id)) {
      onChange(selectedIds, requiredIds.filter((i) => i !== id))
    } else {
      onChange(selectedIds, [...requiredIds, id])
    }
  }

  function selectAllFree() {
    if (!date) return
    const freeIds = people.filter((p) => p.isAvailable === true).map((p) => p.id)
    const merged = Array.from(new Set([...selectedIds, ...freeIds]))
    onChange(merged, requiredIds)
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search people..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-8 text-sm"
          />
        </div>
        {date && (
          <Button type="button" variant="outline" size="sm" onClick={selectAllFree} className="shrink-0">
            <Sparkles className="mr-1 h-3.5 w-3.5" />
            Select all free
          </Button>
        )}
      </div>

      {selectedIds.length > 0 && (
        <Badge variant="secondary">{selectedIds.length} invited</Badge>
      )}

      <ScrollArea className="h-64 rounded-md border">
        <div className="divide-y">
          {isLoading ? (
            <p className="p-3 text-sm text-muted-foreground">Loading team...</p>
          ) : filtered.length === 0 ? (
            <p className="p-3 text-sm text-muted-foreground">No matches</p>
          ) : (
            filtered.map((person) => {
              const isSelected = selectedIds.includes(person.id)
              return (
                <div
                  key={person.id}
                  className={cn(
                    "flex items-center gap-3 p-2.5 transition-colors",
                    isSelected && "bg-muted/50"
                  )}
                >
                  <Checkbox
                    checked={isSelected}
                    onCheckedChange={() => toggle(person.id)}
                    id={`attendee-${person.id}`}
                  />
                  <Avatar className="h-7 w-7">
                    <AvatarImage src={person.avatarUrl || undefined} />
                    <AvatarFallback>
                      <User className="h-3.5 w-3.5" />
                    </AvatarFallback>
                  </Avatar>
                  <label htmlFor={`attendee-${person.id}`} className="flex-1 min-w-0 cursor-pointer">
                    <span className="block truncate text-sm">{person.name}</span>
                  </label>
                  {person.isAvailable === true && (
                    <CalendarCheck className="h-3.5 w-3.5 shrink-0 text-green-600" />
                  )}
                  {person.isAvailable === false && (
                    <CalendarX className="h-3.5 w-3.5 shrink-0 text-red-500" />
                  )}
                  {date && person.isAvailable === undefined && (
                    <HelpCircle className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                  )}
                  {isSelected && (
                    <button
                      type="button"
                      onClick={() => toggleRequired(person.id)}
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium",
                        requiredIds.includes(person.id)
                          ? "bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {requiredIds.includes(person.id) ? "Required" : "Optional"}
                    </button>
                  )}
                </div>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
