"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, User, CalendarCheck, CalendarX } from "lucide-react"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"

interface MemberSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  departmentId?: string
  positionId?: string
  date?: string
  placeholder?: string
  disabled?: boolean
  showAvailabilityBadge?: boolean
}

interface MemberOption {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isAvailable?: boolean
  availabilityNotes?: string | null
}

interface ProfileQueryResult {
  id: string
  name: string
  email: string
  avatar_url: string | null
  department_id: string | null
}

interface AvailabilityQueryResult {
  user_id: string
  is_available: boolean
  notes: string | null
}

export function MemberSelector({
  value,
  onValueChange,
  departmentId,
  positionId: _positionId,
  date,
  placeholder = "Select member...",
  disabled = false,
  showAvailabilityBadge = true,
}: MemberSelectorProps) {
  const [open, setOpen] = useState(false)
  const [members, setMembers] = useState<MemberOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchMembers() {
      setIsLoading(true)
      setError(null)
      
      // Create client inside useEffect to avoid dependency issues
      const supabase = createClient()
      
      try {
        // Build query - don't filter by department initially to ensure we get results
        const { data, error: queryError } = await supabase
          .from("profiles")
          .select("id, name, email, avatar_url, department_id")
          .order("name", { ascending: true })

        if (queryError) {
          console.error("Supabase query error:", queryError)
          setError(queryError.message)
          return
        }

        const profiles = (data || []) as unknown as ProfileQueryResult[]

        // If date is provided, check availability
        let availabilityMap: Record<string, { isAvailable: boolean; notes: string | null }> = {}
        if (date) {
          const { data: availabilityData } = await supabase
            .from("availability")
            .select("user_id, is_available, notes")
            .eq("date", date)

          const availability = (availabilityData || []) as unknown as AvailabilityQueryResult[]
          availabilityMap = availability.reduce((acc, av) => {
            acc[av.user_id] = { isAvailable: av.is_available, notes: av.notes }
            return acc
          }, {} as Record<string, { isAvailable: boolean; notes: string | null }>)
        }

        // Filter by department if provided, but also include users without a department
        // This allows assigning members who haven't been assigned to a department yet
        const filteredProfiles = departmentId 
          ? profiles.filter(p => p.department_id === departmentId || p.department_id === null)
          : profiles

        const options: MemberOption[] = filteredProfiles.map((p) => ({
          id: p.id,
          name: p.name || p.email || "Unknown",
          email: p.email || "",
          avatarUrl: p.avatar_url,
          isAvailable: date ? (availabilityMap[p.id]?.isAvailable ?? undefined) : undefined,
          availabilityNotes: date ? (availabilityMap[p.id]?.notes ?? null) : null,
        }))

        // Sort: available first, then unknown, then unavailable
        options.sort((a, b) => {
          if (a.isAvailable === b.isAvailable) return 0
          if (a.isAvailable === true) return -1
          if (b.isAvailable === true) return 1
          if (a.isAvailable === undefined) return -1
          if (b.isAvailable === undefined) return 1
          return 0
        })

        setMembers(options)
      } catch (err) {
        console.error("Error fetching members:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchMembers()
  }, [departmentId, date])

  const selectedMember = members.find((v) => v.id === value)

  // Helper to render availability badge
  const renderAvailabilityBadge = (member: MemberOption) => {
    if (!showAvailabilityBadge || member.isAvailable === undefined) return null
    
    if (member.isAvailable) {
      return (
        <Badge variant="secondary" className="bg-green-100 text-green-700 text-xs px-1.5 py-0">
          <CalendarCheck className="h-3 w-3 mr-0.5" />
          Available
        </Badge>
      )
    }
    
    return (
      <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs px-1.5 py-0">
        <CalendarX className="h-3 w-3 mr-0.5" />
        Unavailable
      </Badge>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between"
          disabled={disabled || isLoading}
        >
          {selectedMember ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedMember.avatarUrl || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedMember.name}</span>
              {showAvailabilityBadge && selectedMember.isAvailable === false && (
                <CalendarX className="h-3 w-3 text-red-500" />
              )}
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search members..." />
          <CommandList>
            <CommandEmpty>
              {error ? (
                <span className="text-destructive">Error: {error}</span>
              ) : isLoading ? (
                "Loading..."
              ) : (
                "No members found"
              )}
            </CommandEmpty>
            <CommandGroup>
              {members.map((member) => (
                <CommandItem
                  key={member.id}
                  value={member.name}
                  onSelect={() => {
                    onValueChange(member.id)
                    setOpen(false)
                  }}
                  className={cn(
                    "flex items-center justify-between",
                    member.isAvailable === false && "opacity-60"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    <Avatar className="h-6 w-6 flex-shrink-0">
                      <AvatarImage src={member.avatarUrl || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate">{member.name}</span>
                      {member.isAvailable === false && member.availabilityNotes && (
                        <span className="text-xs text-muted-foreground truncate">
                          {member.availabilityNotes}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                    {renderAvailabilityBadge(member)}
                    <Check
                      className={cn(
                        "h-4 w-4",
                        value === member.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                  </div>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
