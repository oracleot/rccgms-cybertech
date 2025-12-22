"use client"

import { Suspense, useEffect, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { ArrowLeft, CalendarIcon, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createClient } from "@/lib/supabase/client"
import { createRotaSchema, type CreateRotaInput } from "@/lib/validations/rota"
import { createRota, updateRotaAssignments } from "@/app/(dashboard)/rota/actions"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { PositionAssignment } from "@/components/rota/position-assignment"

interface Service {
  id: string
  name: string
  day_of_week: number | null
  start_time: string | null
  end_time: string | null
}

interface Assignment {
  id: string
  positionId: string
  positionName: string
  departmentId: string
  departmentName: string
  departmentColor: string | null
  userId: string | null
  userName: string | null
  userAvatarUrl: string | null
}

function NewRotaForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [services, setServices] = useState<Service[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [rotaId, setRotaId] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)

  const dateParam = searchParams.get("date")
  const serviceParam = searchParams.get("serviceId")

  const form = useForm<CreateRotaInput>({
    resolver: zodResolver(createRotaSchema),
    defaultValues: {
      serviceId: "",
      date: "",
    },
    mode: "onSubmit", // Only validate on form submit, not on change
  })

  // Set mounted state and default date on client only
  useEffect(() => {
    setMounted(true)
    const defaultDate = dateParam ? new Date(dateParam) : new Date()
    form.setValue("date", format(defaultDate, "yyyy-MM-dd"))
  }, [dateParam, form])

  // Fetch services on mount
  useEffect(() => {
    async function fetchServices() {
      setIsLoading(true)
      const supabase = createClient()
      
      try {
        const { data, error } = await supabase
          .from("services")
          .select("*")
          .order("name", { ascending: true })

        if (error) {
          console.error("Supabase error:", error)
          throw error
        }
        
        const loaded = (data || []) as Service[]
        setServices(loaded)
      } catch (error) {
        console.error("Error fetching services:", error)
        toast.error("Failed to load services")
      } finally {
        setIsLoading(false)
      }
    }

    fetchServices()
  }, [])

  // Set default service once services are loaded (prefer query param if valid)
  useEffect(() => {
    if (services.length === 0) return

    const current = form.getValues("serviceId")
    if (current) return

    const fromQuery = serviceParam && services.some((s) => s.id === serviceParam)
      ? serviceParam
      : null

    const fallback = services[0]?.id
    const initialService = fromQuery || fallback

    if (initialService) {
      form.setValue("serviceId", initialService, { shouldDirty: false, shouldValidate: true })
      form.clearErrors("serviceId")
    }
  }, [services, form, serviceParam])

  const selectedDate = form.watch("date")
  const selectedServiceId = form.watch("serviceId")
  // Watch serviceId to get the selected service
  const selectedService = services.find((s) => s.id === selectedServiceId)
  const canSubmit = !!selectedServiceId && !!selectedDate && mounted && !isSubmitting && !isLoading

  async function onSubmit(data: CreateRotaInput) {
    setIsSubmitting(true)
    try {
      if (!data.serviceId) {
        toast.error("Please select a service")
        return
      }

      // Create the rota
      const result = await createRota(data)
      
      if (!result.success) {
        toast.error(result.error)
        return
      }

      const newRotaId = result.data.id
      setRotaId(newRotaId)

      // If there are assignments, save them
      if (assignments.length > 0) {
        const validAssignments = assignments.filter((a) => a.userId)
        if (validAssignments.length > 0) {
          const assignResult = await updateRotaAssignments({
            rotaId: newRotaId,
            assignments: validAssignments.map((a) => ({
              positionId: a.positionId,
              userId: a.userId!,
            })),
          })

          if (!assignResult.success) {
            toast.error("Rota created but failed to save assignments")
            router.push(`/rota/${newRotaId}`)
            return
          }
        }
      }

      toast.success("Rota created successfully")
      router.push(`/rota/${newRotaId}`)
    } catch {
      toast.error("Failed to create rota")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild>
          <Link href="/rota">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Rota</h1>
          <p className="text-muted-foreground">
            Schedule a new service and assign volunteers
          </p>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Service & Date Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service Details</CardTitle>
              <CardDescription>
                Select the service type and date
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value)
                        form.clearErrors("serviceId")
                      }}
                      value={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a service..." />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {services.map((service) => (
                          <SelectItem key={service.id} value={service.id}>
                            {service.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormDescription>
                      The type of service for this rota
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) =>
                            field.onChange(date ? format(date, "yyyy-MM-dd") : "")
                          }
                          disabled={(date) => {
                            // Disable past dates
                            if (date < new Date(new Date().setHours(0, 0, 0, 0))) {
                              return true
                            }
                            // If a service is selected with a specific day_of_week, only allow that day
                            if (selectedService?.day_of_week !== null && selectedService?.day_of_week !== undefined) {
                              return date.getDay() !== selectedService.day_of_week
                            }
                            return false
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormDescription>
                      {selectedService?.day_of_week !== null && selectedService?.day_of_week !== undefined
                        ? `Only ${["Sundays", "Mondays", "Tuesdays", "Wednesdays", "Thursdays", "Fridays", "Saturdays"][selectedService.day_of_week]} are available for this service`
                        : "The date of the service"}
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Position Assignments */}
          <PositionAssignment
            rotaId={rotaId || "new"}
            date={selectedDate}
            assignments={assignments}
            onAssignmentsChange={setAssignments}
          />

          {/* Submit Button */}
          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/rota">Cancel</Link>
            </Button>
            <Button type="submit" disabled={!canSubmit}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Rota
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}

function NewRotaPageLoading() {
  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div className="flex items-center gap-4">
        <Skeleton className="h-10 w-10" />
        <div>
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
      </div>
      <Skeleton className="h-64 w-full" />
    </div>
  )
}

export default function NewRotaPage() {
  return (
    <Suspense fallback={<NewRotaPageLoading />}>
      <NewRotaForm />
    </Suspense>
  )
}
