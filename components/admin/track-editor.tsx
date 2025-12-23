"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { createTrackSchema, type CreateTrackInput } from "@/lib/validations/training"
import type { Department } from "@/types/auth"

interface TrackEditorProps {
  departments: Department[]
  track?: {
    id: string
    name: string
    description: string | null
    department_id: string
    estimated_weeks: number | null
    is_active: boolean
  }
  onSubmit: (formData: FormData) => Promise<{ error?: string | object; success?: boolean }>
}

export function TrackEditor({ departments, track, onSubmit }: TrackEditorProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isActive, setIsActive] = useState(track?.is_active ?? false)

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<CreateTrackInput>({
    resolver: zodResolver(createTrackSchema),
    defaultValues: {
      name: track?.name ?? "",
      description: track?.description ?? "",
      departmentId: track?.department_id ?? "",
      estimatedWeeks: track?.estimated_weeks ?? undefined,
    },
  })

  const departmentId = watch("departmentId")

  const onFormSubmit = async (data: CreateTrackInput) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      if (track?.id) {
        formData.append("id", track.id)
      }
      formData.append("departmentId", data.departmentId)
      formData.append("name", data.name)
      if (data.description) {
        formData.append("description", data.description)
      }
      if (data.estimatedWeeks) {
        formData.append("estimatedWeeks", data.estimatedWeeks.toString())
      }
      formData.append("isActive", isActive.toString())

      const result = await onSubmit(formData)
      
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to save track")
        return
      }

      toast.success(track ? "Track updated successfully" : "Track created successfully")
      router.push("/admin/training")
      router.refresh()
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Track Details</CardTitle>
          <CardDescription>
            Basic information about the training track
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Track Name</Label>
            <Input
              id="name"
              placeholder="e.g., Livestream Basics"
              {...register("name")}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="department">Department</Label>
            <Select
              value={departmentId}
              onValueChange={(value) => setValue("departmentId", value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a department" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((dept) => (
                  <SelectItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {errors.departmentId && (
              <p className="text-sm text-destructive">{errors.departmentId.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              placeholder="What will volunteers learn in this track?"
              rows={3}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="estimatedWeeks">Estimated Duration (weeks)</Label>
            <Input
              id="estimatedWeeks"
              type="number"
              min={1}
              max={52}
              placeholder="e.g., 4"
              {...register("estimatedWeeks", { valueAsNumber: true })}
            />
            {errors.estimatedWeeks && (
              <p className="text-sm text-destructive">{errors.estimatedWeeks.message}</p>
            )}
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <div className="space-y-0.5">
              <Label htmlFor="isActive">Publish Track</Label>
              <p className="text-sm text-muted-foreground">
                Published tracks are visible to all volunteers
              </p>
            </div>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-4">
        <Button 
          type="button" 
          variant="outline"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : track ? "Update Track" : "Create Track"}
        </Button>
      </div>
    </form>
  )
}
