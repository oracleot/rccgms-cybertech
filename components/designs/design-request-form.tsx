"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2, AlertCircle } from "lucide-react"
import { createDesignRequestSchema, type CreateDesignRequestInput } from "@/lib/validations/designs"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Alert, AlertDescription } from "@/components/ui/alert"

const designTypes = [
  { value: "flyer", label: "Flyer" },
  { value: "banner", label: "Banner" },
  { value: "social_graphic", label: "Social Graphic" },
  { value: "video_thumbnail", label: "Video Thumbnail" },
  { value: "presentation", label: "Presentation" },
  { value: "other", label: "Other" },
] as const

const priorityLevels = [
  { value: "low", label: "Low - No rush" },
  { value: "medium", label: "Medium - Standard turnaround" },
  { value: "high", label: "High - Important event soon" },
  { value: "urgent", label: "Urgent - Critical deadline" },
] as const

export function DesignRequestForm() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [requestId, setRequestId] = useState<string | null>(null)

  const form = useForm<CreateDesignRequestInput>({
    resolver: zodResolver(createDesignRequestSchema),
    defaultValues: {
      title: "",
      description: "",
      type: "banner",
      priority: "medium",
      requesterName: "",
      requesterEmail: "",
      requesterPhone: "",
      requesterMinistry: "",
      neededBy: "",
      referenceUrls: [],
      website: "", // honeypot field
    },
  })

  const onSubmit = async (data: CreateDesignRequestInput) => {
    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch("/api/designs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      const result = await response.json()

      if (!response.ok) {
        // Handle rate limiting
        if (response.status === 429) {
          const retryAfter = response.headers.get("Retry-After")
          const minutes = retryAfter ? Math.ceil(parseInt(retryAfter, 10) / 60) : 60
          throw new Error(
            `Too many requests. Please try again in ${minutes} minute${minutes > 1 ? "s" : ""}.`
          )
        }
        throw new Error(result.error || "Failed to submit request")
      }

      setRequestId(result.id)
      setIsSuccess(true)
      form.reset()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  // Success state
  if (isSuccess) {
    return (
      <Card className="border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-500 text-white">
              <Check className="h-6 w-6" />
            </div>
            <CardTitle className="text-green-900 dark:text-green-100">Request Submitted!</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-green-800 dark:text-green-200">
            Your design request has been submitted successfully. Our team will review it and get started soon.
          </p>
          {requestId && (
            <div className="rounded-md bg-white p-3 dark:bg-gray-900">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Request ID:{" "}
                <span className="font-mono text-gray-900 dark:text-gray-100">{requestId}</span>
              </p>
              <p className="mt-1 text-xs text-gray-600 dark:text-gray-400">
                Save this ID for reference. You'll receive email updates as we work on your design.
              </p>
            </div>
          )}
          <Button
            onClick={() => {
              setIsSuccess(false)
              setRequestId(null)
            }}
            variant="outline"
            className="w-full"
          >
            Submit Another Request
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Design Details</CardTitle>
            <CardDescription>Tell us about what you need designed</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Title */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title *</FormLabel>
                  <FormControl>
                    <Input className="w-full" placeholder="e.g., Youth Conference Banner" {...field} />
                  </FormControl>
                  <FormDescription>
                    A short, descriptive title for your design request
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Description */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description *</FormLabel>
                  <FormControl>
                    <Textarea
                      className="min-h-[120px] w-full"
                      placeholder="Provide details about the event, key message, target audience, colors, branding requirements, text content, etc."
                      {...field}
                    />
                  </FormControl>
                  <FormDescription>
                    The more details you provide, the better! (Minimum 20 characters)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Type & Priority */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Design Type *</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {designTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger className="w-full">
                          <SelectValue placeholder="Select priority" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {priorityLevels.map((priority) => (
                          <SelectItem key={priority.value} value={priority.value}>
                            {priority.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Needed By Date */}
            <FormField
              control={form.control}
              name="neededBy"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Needed By Date</FormLabel>
                  <FormControl>
                    <Input className="w-full" type="date" {...field} />
                  </FormControl>
                  <FormDescription>When do you need this design completed?</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Reference URLs */}
            <FormField
              control={form.control}
              name="referenceUrls"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Reference Links (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Paste up to 5 reference URLs (one per line) for inspiration, examples, or similar designs you like"
                      className="min-h-[80px] w-full"
                      value={field.value?.join("\n") || ""}
                      onChange={(e) => {
                        const urls = e.target.value
                          .split("\n")
                          .filter((url) => url.trim().length > 0)
                          .slice(0, 5)
                        field.onChange(urls)
                      }}
                      onKeyDown={(e) => {
                        // Allow Enter key for new lines
                        if (e.key === "Enter") {
                          e.stopPropagation()
                        }
                      }}
                    />
                  </FormControl>
                  <FormDescription>Up to 5 URLs for inspiration or examples</FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Honeypot field (hidden) */}
            <FormField
              control={form.control}
              name="website"
              render={({ field }) => (
                <input type="text" {...field} style={{ display: "none" }} tabIndex={-1} autoComplete="off" />
              )}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your Contact Information</CardTitle>
            <CardDescription>So we can reach you with updates</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Name & Email */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="requesterName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Name *</FormLabel>
                    <FormControl>
                        <Input className="w-full" placeholder="John Smith" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requesterEmail"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Your Email *</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="john@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {/* Phone & Ministry */}
            <div className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="requesterPhone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone Number (Optional)</FormLabel>
                    <FormControl>
                        <Input className="w-full" type="tel" placeholder="+1 (555) 123-4567" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="requesterMinistry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ministry/Department (Optional)</FormLabel>
                    <FormControl>
                        <Input className="w-full" placeholder="e.g., Youth Ministry" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Submit Button */}
        <Button type="submit" size="lg" className="w-full" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {isSubmitting ? "Submitting..." : "Submit Design Request"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          * Required fields. You'll receive an email confirmation after submitting.
        </p>
      </form>
    </Form>
  )
}
