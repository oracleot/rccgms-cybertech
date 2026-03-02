"use client"

import { useState, useEffect, useCallback } from "react"
import { Search, Filter, Loader2 } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Card } from "@/components/ui/card"
import type { DesignRequestListItem } from "@/types/designs"
import { DesignRequestCard } from "./design-request-card"
import { useDebounce } from "@/hooks/use-debounce"
import { useUser } from "@/hooks/use-user"

export function DesignRequestList() {
  const [requests, setRequests] = useState<DesignRequestListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Get current user info for permission checks
  const { user, isLoading: isUserLoading } = useUser()
  const currentUserProfileId = user?.id
  const isAdmin = user?.role === "admin" || user?.role === "lead_developer" || user?.role === "developer"
  
  // Filters
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [priorityFilter, setPriorityFilter] = useState("all")
  const [includeArchived, setIncludeArchived] = useState(false)
  
  const debouncedSearch = useDebounce(search, 300)

  const fetchRequests = useCallback(async () => {
    setIsLoading(true)
    setError(null)

    try {
      const params = new URLSearchParams()
      
      if (debouncedSearch) params.set("search", debouncedSearch)
      if (statusFilter !== "all") params.set("status", statusFilter)
      if (priorityFilter !== "all") params.set("priority", priorityFilter)
      if (includeArchived) params.set("includeArchived", "true")

      const response = await fetch(`/api/designs?${params.toString()}`)
      
      if (!response.ok) {
        throw new Error("Failed to fetch design requests")
      }

      const data = await response.json()
      setRequests(data.data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, statusFilter, priorityFilter, includeArchived])

  useEffect(() => {
    fetchRequests()
  }, [fetchRequests])

  const clearFilters = () => {
    setSearch("")
    setStatusFilter("all")
    setPriorityFilter("all")
    setIncludeArchived(false)
  }

  const hasActiveFilters = 
    search !== "" || 
    statusFilter !== "all" || 
    priorityFilter !== "all" || 
    includeArchived

  return (
    <div className="space-y-6">
      {/* Filters */}
      <Card className="p-4">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Filters
            </h3>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
              >
                Clear all
              </Button>
            )}
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by title or name..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="review">In Review</SelectItem>
                  <SelectItem value="revision_requested">Revision Requested</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Priority Filter */}
            <div className="space-y-2">
              <Label htmlFor="priority">Priority</Label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger id="priority">
                  <SelectValue placeholder="All priorities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="urgent">Urgent</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Include Archived */}
            <div className="flex items-end space-x-2 pb-2">
              <Switch
                id="archived"
                checked={includeArchived}
                onCheckedChange={setIncludeArchived}
              />
              <Label htmlFor="archived" className="cursor-pointer">
                Include archived
              </Label>
            </div>
          </div>
        </div>
      </Card>

      {/* Results */}
      {isLoading || isUserLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <Card className="p-8 text-center">
          <p className="text-destructive">{error}</p>
          <Button onClick={fetchRequests} variant="outline" className="mt-4">
            Try Again
          </Button>
        </Card>
      ) : requests.length === 0 ? (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground">
            {hasActiveFilters
              ? "No design requests match your filters"
              : "No design requests yet"}
          </p>
          {hasActiveFilters && (
            <Button onClick={clearFilters} variant="outline" className="mt-4">
              Clear Filters
            </Button>
          )}
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              {requests.length} {requests.length === 1 ? "request" : "requests"} found
            </span>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {requests.map((request) => (
              <DesignRequestCard 
                key={request.id} 
                request={request}
                currentUserProfileId={currentUserProfileId}
                isAdmin={isAdmin}
                onUpdate={fetchRequests}
              />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
