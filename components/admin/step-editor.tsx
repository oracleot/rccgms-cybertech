"use client"

import { useState } from "react"
import { useForm, SubmitHandler } from "react-hook-form"
import { toast } from "sonner"
import { Plus, Trash2, GripVertical } from "lucide-react"
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { TrainingStep, StepType } from "@/types/training"

const stepTypes: { value: StepType; label: string }[] = [
  { value: "video", label: "Video" },
  { value: "document", label: "Document" },
  { value: "quiz", label: "Quiz" },
  { value: "shadowing", label: "Shadowing" },
  { value: "practical", label: "Practical" },
]

interface StepEditorProps {
  trackId: string
  steps: TrainingStep[]
  onCreateStep: (formData: FormData) => Promise<{ error?: string | object; success?: boolean }>
  onUpdateStep: (formData: FormData) => Promise<{ error?: string | object; success?: boolean }>
  onDeleteStep: (formData: FormData) => Promise<{ error?: string | object; success?: boolean }>
  onReorderSteps: (formData: FormData) => Promise<{ error?: string | object; success?: boolean }>
}

export function StepEditor({ 
  trackId, 
  steps, 
  onCreateStep, 
  onUpdateStep,
  onDeleteStep,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars -- reserved for drag-and-drop reordering
  onReorderSteps 
}: StepEditorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [editingStep, setEditingStep] = useState<TrainingStep | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  interface StepFormData {
    trackId: string
    order: number
    title: string
    description?: string
    type: StepType
    contentUrl?: string
    required: boolean
    passScore?: number
  }

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<StepFormData>({
    defaultValues: {
      trackId,
      order: steps.length + 1,
      title: "",
      description: "",
      type: "video",
      required: true,
    },
  })

  const stepType = watch("type")
  const isRequired = watch("required")

  const openCreateDialog = () => {
    reset({
      trackId,
      order: steps.length + 1,
      title: "",
      description: "",
      type: "video",
      required: true,
    })
    setEditingStep(null)
    setIsOpen(true)
  }

  const openEditDialog = (step: TrainingStep) => {
    reset({
      trackId,
      order: step.order,
      title: step.title,
      description: step.description || "",
      type: step.type,
      contentUrl: step.content_url || undefined,
      required: step.required,
      passScore: step.pass_score || undefined,
    })
    setEditingStep(step)
    setIsOpen(true)
  }

  const onFormSubmit: SubmitHandler<StepFormData> = async (data) => {
    setIsSubmitting(true)
    try {
      const formData = new FormData()
      if (editingStep) {
        formData.append("id", editingStep.id)
      }
      formData.append("trackId", trackId)
      formData.append("order", data.order.toString())
      formData.append("title", data.title)
      if (data.description) {
        formData.append("description", data.description)
      }
      formData.append("type", data.type)
      if (data.contentUrl) {
        formData.append("contentUrl", data.contentUrl)
      }
      formData.append("required", data.required.toString())
      if (data.passScore) {
        formData.append("passScore", data.passScore.toString())
      }

      const result = editingStep 
        ? await onUpdateStep(formData)
        : await onCreateStep(formData)
      
      if (result.error) {
        toast.error(typeof result.error === "string" ? result.error : "Failed to save step")
        return
      }

      toast.success(editingStep ? "Step updated" : "Step created")
      setIsOpen(false)
      reset()
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (stepId: string) => {
    const formData = new FormData()
    formData.append("stepId", stepId)
    
    const result = await onDeleteStep(formData)
    
    if (result.error) {
      toast.error(typeof result.error === "string" ? result.error : "Failed to delete step")
      return
    }

    toast.success("Step deleted")
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Training Steps</CardTitle>
            <CardDescription>
              Define the learning path for this track
            </CardDescription>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button onClick={openCreateDialog}>
                <Plus className="h-4 w-4 mr-2" />
                Add Step
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-lg">
              <DialogHeader>
                <DialogTitle>{editingStep ? "Edit Step" : "Add Step"}</DialogTitle>
                <DialogDescription>
                  {editingStep ? "Update the step details" : "Add a new step to the training track"}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    placeholder="e.g., Introduction to Camera Controls"
                    {...register("title")}
                  />
                  {errors.title && (
                    <p className="text-sm text-destructive">{errors.title.message}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="type">Step Type</Label>
                    <Select
                      value={stepType}
                      onValueChange={(value) => setValue("type", value as StepType)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {stepTypes.map((type) => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="order">Order</Label>
                    <Input
                      id="order"
                      type="number"
                      min={1}
                      {...register("order", { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    placeholder="Brief description of this step"
                    rows={2}
                    {...register("description")}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="contentUrl">Content URL</Label>
                  <Input
                    id="contentUrl"
                    placeholder="YouTube URL, Google Doc link, etc."
                    {...register("contentUrl")}
                  />
                  {errors.contentUrl && (
                    <p className="text-sm text-destructive">{errors.contentUrl.message}</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2">
                  <Label htmlFor="required">Required Step</Label>
                  <Switch
                    id="required"
                    checked={isRequired}
                    onCheckedChange={(checked) => setValue("required", checked)}
                  />
                </div>

                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Saving..." : editingStep ? "Update" : "Add Step"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {steps.length > 0 ? (
          <div className="space-y-2">
            {steps.map((step) => (
              <div
                key={step.id}
                className="flex items-center gap-3 p-3 rounded-lg border bg-card"
              >
                <GripVertical className="h-4 w-4 text-muted-foreground cursor-grab" />
                <span className="font-medium text-muted-foreground w-6">
                  {step.order}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{step.title}</p>
                  <p className="text-sm text-muted-foreground capitalize">
                    {step.type} {step.required && "• Required"}
                  </p>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openEditDialog(step)}
                  >
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-destructive">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Step</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete &quot;{step.title}&quot;? 
                          This will also delete any completion records for this step.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDelete(step.id)}
                          className="bg-destructive text-destructive-foreground"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No steps yet. Add your first step to get started.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
