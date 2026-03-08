"use client"

import { useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  createSubIssueSchema,
  type CreateSubIssueInput,
} from "@/lib/validations/designs"
import { createSubIssue } from "@/app/(dashboard)/designs/actions"
import { toast } from "sonner"

interface RaiseSubIssueModalProps {
  parentId: string
  parentTitle: string
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export function RaiseSubIssueModal({
  parentId,
  parentTitle,
  isOpen,
  onClose,
  onSuccess,
}: RaiseSubIssueModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    reset,
    formState: { errors },
  } = useForm<CreateSubIssueInput>({
    resolver: zodResolver(createSubIssueSchema),
    defaultValues: {
      parentId,
      priority: "medium",
    },
  })

  const onSubmit = async (data: CreateSubIssueInput) => {
    setIsSubmitting(true)
    try {
      const result = await createSubIssue(data)
      if (result.success) {
        toast.success("Sub-issue created")
        reset()
        onSuccess()
      } else {
        toast.error("error" in result ? result.error : "Failed to create sub-issue")
      }
    } catch {
      toast.error("Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={(open) => { if (!open) onClose() }}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Raise Sub-issue</DialogTitle>
          <DialogDescription>
            Create a sub-task for &ldquo;{parentTitle}&rdquo;
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <input type="hidden" {...register("parentId")} />

          <div className="space-y-2">
            <Label htmlFor="sub-title">Title</Label>
            <Input
              id="sub-title"
              placeholder="e.g. Create social media version"
              {...register("title")}
            />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-description">Description</Label>
            <Textarea
              id="sub-description"
              placeholder="What needs to be done..."
              rows={4}
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="sub-priority">Priority</Label>
            <Select
              defaultValue="medium"
              onValueChange={(val) => setValue("priority", val as "low" | "medium" | "high" | "urgent")}
            >
              <SelectTrigger id="sub-priority">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Create Sub-issue
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
