"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { useCompletion } from "@ai-sdk/react"
import { format } from "date-fns"
import { CalendarIcon, Plus, X, Loader2, Sparkles, Save } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
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
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

import { PlatformToggle } from "./platform-toggle"
import { StreamingPreview } from "./streaming-preview"
import { CopyButton } from "./copy-button"

import {
  generateDescriptionSchema,
  type GenerateDescriptionInput,
  type Platform,
} from "@/lib/validations/livestream"

const SERVICE_TYPES = [
  { value: "sunday", label: "Sunday Service" },
  { value: "special", label: "Special Service" },
  { value: "midweek", label: "Midweek Service" },
] as const

export function DescriptionForm() {
  const [platform, setPlatform] = useState<Platform>("youtube")
  const [keyPoints, setKeyPoints] = useState<string[]>([])
  const [newKeyPoint, setNewKeyPoint] = useState("")

  const form = useForm<GenerateDescriptionInput>({
    resolver: zodResolver(generateDescriptionSchema),
    defaultValues: {
      serviceDate: format(new Date(), "yyyy-MM-dd"),
      serviceType: "sunday",
      title: "",
      speaker: "",
      scripture: "",
      specialNotes: "",
      platform: "youtube",
    },
  })

  const { completion, complete, isLoading, error } = useCompletion({
    api: "/api/ai/generate-description",
    streamProtocol: "text",
    onError: (err: Error) => {
      console.error("Completion error:", err)
      toast.error(err.message || "Failed to generate description")
    },
    onFinish: (prompt, completion) => {
      console.log("Generation finished:", { prompt, completion })
    },
  })

  const [isSaving, setIsSaving] = useState(false)

  const handleAddKeyPoint = () => {
    if (newKeyPoint.trim() && keyPoints.length < 10) {
      setKeyPoints([...keyPoints, newKeyPoint.trim()])
      setNewKeyPoint("")
    }
  }

  const handleRemoveKeyPoint = (index: number) => {
    setKeyPoints(keyPoints.filter((_, i) => i !== index))
  }

  const handleGenerate = async () => {
    const values = form.getValues()
    const dataWithKeyPoints = {
      ...values,
      platform,
      keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
    }

    // Validate
    const result = generateDescriptionSchema.safeParse(dataWithKeyPoints)
    if (!result.success) {
      const firstError = result.error.issues[0]
      toast.error(firstError.message)
      return
    }

    await complete("", { body: result.data })
  }

  const handleSave = async () => {
    if (!completion) {
      toast.error("No description to save")
      return
    }

    setIsSaving(true)
    try {
      const values = form.getValues()
      const response = await fetch("/api/ai/generate-description/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: values.title,
          platform,
          content: completion,
          speaker: values.speaker,
          scripture: values.scripture,
          metadata: {
            keyPoints: keyPoints.length > 0 ? keyPoints : undefined,
            specialNotes: values.specialNotes,
          },
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.message || "Failed to save description")
      }

      toast.success("Description saved to history!")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to save description")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {/* Form Column */}
      <Card>
        <CardHeader className="border-b pb-3">
          <CardTitle className="text-lg">Service Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <Form {...form}>
            <form className="space-y-4">
              {/* Platform Toggle */}
              <div className="space-y-2">
                <FormLabel>Platform</FormLabel>
                <PlatformToggle
                  value={platform}
                  onChange={(p) => {
                    setPlatform(p)
                    form.setValue("platform", p)
                  }}
                  disabled={isLoading}
                />
              </div>

              {/* Service Date */}
              <FormField
                control={form.control}
                name="serviceDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Service Date</FormLabel>
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                            disabled={isLoading}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {field.value ? (
                              format(new Date(field.value), "PPP")
                            ) : (
                              <span>Pick a date</span>
                            )}
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
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Service Type */}
              <FormField
                control={form.control}
                name="serviceType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      disabled={isLoading}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((type) => (
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

              {/* Title */}
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Service Title</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Walking in Divine Favor"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Speaker */}
              <FormField
                control={form.control}
                name="speaker"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Speaker</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Pastor John Smith"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Scripture */}
              <FormField
                control={form.control}
                name="scripture"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Scripture Reference (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g., Romans 8:28-30"
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Key Points */}
              <div className="space-y-2">
                <FormLabel>Key Points (Optional)</FormLabel>
                <div className="flex gap-2">
                  <Input
                    value={newKeyPoint}
                    onChange={(e) => setNewKeyPoint(e.target.value)}
                    placeholder="Add a key point..."
                    disabled={isLoading || keyPoints.length >= 10}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault()
                        handleAddKeyPoint()
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    onClick={handleAddKeyPoint}
                    disabled={isLoading || !newKeyPoint.trim() || keyPoints.length >= 10}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {keyPoints.length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-2">
                    {keyPoints.map((point, index) => (
                      <Badge
                        key={index}
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {point}
                        <button
                          type="button"
                          onClick={() => handleRemoveKeyPoint(index)}
                          className="ml-1 rounded-full hover:bg-muted-foreground/20"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
                <FormDescription>
                  Add up to 10 key points to include in the description
                </FormDescription>
              </div>

              {/* Special Notes */}
              <FormField
                control={form.control}
                name="specialNotes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Special Notes (Optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Any additional notes for the description..."
                        rows={3}
                        disabled={isLoading}
                        {...field}
                      />
                    </FormControl>
                    <FormDescription>
                      Include special announcements, guest info, or other details
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Generate Button */}
              <Button
                type="button"
                onClick={handleGenerate}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Description
                  </>
                )}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>

      {/* Preview Column */}
      <div className="flex flex-col gap-4">
        <StreamingPreview
          content={completion}
          platform={platform}
          title={form.watch("title")}
          isLoading={isLoading}
          error={error}
        />

        {/* Action Buttons */}
        {completion && (
          <div className="flex gap-2">
            <CopyButton content={completion} title={form.watch("title")} className="flex-1" />
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1"
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save to History
                </>
              )}
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}
