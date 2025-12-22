"use client"

import { useEffect, useState } from "react"
import { Check, ChevronsUpDown, User } from "lucide-react"

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

interface VolunteerSelectorProps {
  value?: string
  onValueChange: (value: string) => void
  departmentId?: string
  positionId?: string
  date?: string
  placeholder?: string
  disabled?: boolean
}

interface VolunteerOption {
  id: string
  name: string
  email: string
  avatarUrl: string | null
  isAvailable?: boolean
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
}

export function VolunteerSelector({
  value,
  onValueChange,
  departmentId,
  positionId: _positionId,
  date,
  placeholder = "Select volunteer...",
  disabled = false,
}: VolunteerSelectorProps) {
  const [open, setOpen] = useState(false)
  const [volunteers, setVolunteers] = useState<VolunteerOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchVolunteers() {
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
        let availabilityMap: Record<string, boolean> = {}
        if (date) {
          const { data: availabilityData } = await supabase
            .from("availability")
            .select("user_id, is_available")
            .eq("date", date)

          const availability = (availabilityData || []) as unknown as AvailabilityQueryResult[]
          availabilityMap = availability.reduce((acc, av) => {
            acc[av.user_id] = av.is_available
            return acc
          }, {} as Record<string, boolean>)
        }

        // Filter by department if provided, but also include users without a department
        // This allows assigning volunteers who haven't been assigned to a department yet
        const filteredProfiles = departmentId 
          ? profiles.filter(p => p.department_id === departmentId || p.department_id === null)
          : profiles

        const options: VolunteerOption[] = filteredProfiles.map((p) => ({
          id: p.id,
          name: p.name || p.email || "Unknown",
          email: p.email || "",
          avatarUrl: p.avatar_url,
          isAvailable: date ? availabilityMap[p.id] ?? true : undefined,
        }))

        console.log("Volunteer options:", options) // Debug log
        setVolunteers(options)
      } catch (err) {
        console.error("Error fetching volunteers:", err)
        setError(err instanceof Error ? err.message : "Unknown error")
      } finally {
        setIsLoading(false)
      }
    }

    fetchVolunteers()
  }, [departmentId, date])

  const selectedVolunteer = volunteers.find((v) => v.id === value)

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
          {selectedVolunteer ? (
            <div className="flex items-center gap-2">
              <Avatar className="h-6 w-6">
                <AvatarImage src={selectedVolunteer.avatarUrl || undefined} />
                <AvatarFallback>
                  <User className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <span className="truncate">{selectedVolunteer.name}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{placeholder}</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[300px] p-0" align="start">
        <Command>
          <CommandInput placeholder="Search volunteers..." />
          <CommandList>
            <CommandEmpty>
              {error ? (
                <span className="text-destructive">Error: {error}</span>
              ) : isLoading ? (
                "Loading..."
              ) : (
                `No volunteers found. (${volunteers.length} loaded)`
              )}
            </CommandEmpty>
            <CommandGroup>
              {volunteers.map((volunteer) => (
                <CommandItem
                  key={volunteer.id}
                  value={volunteer.name}
                  onSelect={() => {
                    onValueChange(volunteer.id)
                    setOpen(false)
                  }}
                  className={cn(
                    volunteer.isAvailable === false && "opacity-50"
                  )}
                >
                  <div className="flex items-center gap-2 flex-1">
                    <Avatar className="h-6 w-6">
                      <AvatarImage src={volunteer.avatarUrl || undefined} />
                      <AvatarFallback>
                        <User className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                      <span className="truncate">{volunteer.name}</span>
                      {volunteer.isAvailable === false && (
                        <span className="text-xs text-destructive">
                          Unavailable
                        </span>
                      )}
                    </div>
                  </div>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === volunteer.id ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
