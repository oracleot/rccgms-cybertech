"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { format } from "date-fns"
import { CalendarIcon, ChevronRight, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { createRundown } from "@/app/(dashboard)/rundown/actions"
import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { createRundownSchema, type CreateRundownInput } from "@/lib/validations/rundown"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"

interface ServiceOption {
  id: string
  name: string
  day_of_week: number | null
  start_time: string | null
}

export function RundownForm() {
  const router = useRouter()
  const [services, setServices] = useState<ServiceOption[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const form = useForm<CreateRundownInput>({
    resolver: zodResolver(createRundownSchema),
    defaultValues: {
      serviceId: "",
      date: "",
      title: "",
    },
    mode: "onSubmit",
  })

  const selectedServiceId = form.watch("serviceId")
  const selectedService = services.find((s) => s.id === selectedServiceId)

  useEffect(() => {
    form.setValue("date", format(new Date(), "yyyy-MM-dd"))
  }, [form])

  useEffect(() => {
    const load = async () => {
      setIsLoading(true)
      const supabase = createClient()
      try {
        const { data, error } = await supabase
          .from("services")
          .select("id, name, day_of_week, start_time")
          .order("name", { ascending: true })

        if (error) throw error

        const servicesData = (data ?? []) as ServiceOption[]
        setServices(servicesData)

        const first = servicesData[0]?.id
        if (first) {
          form.setValue("serviceId", first)
        }
      } catch (error) {
        console.error("Error loading services", error)
        toast.error("Unable to load services")
      } finally {
        setIsLoading(false)
      }
    }

    load()
  }, [form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      const result = await createRundown(values)
      if (!result.success) {
        toast.error(result.error)
        return
      }
      toast.success("Rundown created")
      router.push(`/rundown/${result.data.id}`)
    } catch (error) {
      console.error("Error creating rundown", error)
      toast.error("Failed to create rundown")
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <nav className="flex items-center gap-1 text-sm text-muted-foreground">
        <Link href="/rundown" className="hover:text-foreground transition-colors">
          Rundowns
        </Link>
        <ChevronRight className="h-4 w-4" />
        <span className="text-foreground font-medium">New</span>
      </nav>

      <div>
        <h1 className="text-2xl font-bold">Create rundown</h1>
        <p className="text-muted-foreground">Plan the service order and timing.</p>
      </div>

      <Form {...form}>
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Service details</CardTitle>
              <CardDescription>Pick the service and date for this rundown.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Sunday Service - 9am" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="serviceId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service</FormLabel>
                    {isLoading ? (
                      <Skeleton className="h-10 w-full" />
                    ) : (
                      <Select
                        value={field.value}
                        onValueChange={(val) => field.onChange(val)}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a service" />
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
                    )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
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
                            {field.value ? format(new Date(field.value), "PPP") : <span>Pick a date</span>}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          selected={field.value ? new Date(field.value) : undefined}
                          onSelect={(date) => field.onChange(date ? format(date, "yyyy-MM-dd") : "")}
                          disabled={(date) => {
                            if (!selectedService || selectedService.day_of_week === null) return false
                            return date.getDay() !== selectedService.day_of_week
                          }}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex justify-end gap-3">
            <Button type="button" variant="outline" asChild>
              <Link href="/rundown">Cancel</Link>
            </Button>
            <Button type="submit" disabled={isSubmitting || isLoading}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create rundown
            </Button>
          </div>
        </form>
      </Form>
    </div>
  )
}
