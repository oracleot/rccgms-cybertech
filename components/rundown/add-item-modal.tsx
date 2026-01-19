"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { addRundownItem, updateRundownItem } from "@/app/(dashboard)/rundown/actions"
import { createRundownItemSchema } from "@/lib/validations/rundown"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { ItemTypeSelector } from "@/components/rundown/item-type-selector"
import type { RundownItemType } from "@/types/rundown"
import type { RundownEditorItem } from "./types"

const itemFormSchema = createRundownItemSchema
  .omit({ rundownId: true })
  .extend({
    id: z.string().uuid().optional(),
  })

type ItemFormValues = z.infer<typeof itemFormSchema>

type Mode = "create" | "edit"

interface AddItemModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  rundownId: string
  onItemSaved: (item: RundownEditorItem) => void
  initialItem?: RundownEditorItem | null
}

export function AddItemModal({
  open,
  onOpenChange,
  rundownId,
  onItemSaved,
  initialItem,
}: AddItemModalProps) {
  const mode: Mode = initialItem ? "edit" : "create"
  const [isSubmitting, setIsSubmitting] = useState(false)

  const defaultValues = useMemo<ItemFormValues>(() => ({
    id: initialItem?.id,
    title: initialItem?.title || "",
    type: (initialItem?.type as RundownItemType) || "song",
    durationSeconds: initialItem?.durationSeconds || 0,
    notes: initialItem?.notes || "",
    assignedTo: initialItem?.assignedTo?.id,
    mediaUrl: initialItem?.mediaUrl || undefined,
    songId: initialItem?.songId || undefined,
  }), [initialItem])

  const form = useForm<ItemFormValues>({
    resolver: zodResolver(itemFormSchema),
    defaultValues,
  })

  useEffect(() => {
    form.reset(defaultValues)
  }, [defaultValues, form])

  const handleSubmit = form.handleSubmit(async (values) => {
    setIsSubmitting(true)
    try {
      if (mode === "create") {
        const result = await addRundownItem({
          rundownId,
          type: values.type,
          title: values.title,
          durationSeconds: values.durationSeconds,
          notes: values.notes || undefined,
          assignedTo: values.assignedTo || undefined,
          mediaUrl: values.mediaUrl || undefined,
          songId: values.songId || undefined,
        })

        if (!result.success) {
          toast.error(result.error)
          return
        }

        onItemSaved({
          id: result.data.id,
          order: Number.MAX_SAFE_INTEGER,
          type: values.type,
          title: values.title,
          durationSeconds: values.durationSeconds,
          notes: values.notes || null,
          assignedTo: null,
          mediaUrl: values.mediaUrl || null,
          songId: values.songId || null,
        })
        toast.success("Item added")
        onOpenChange(false)
      } else if (values.id) {
        const result = await updateRundownItem({
          id: values.id,
          type: values.type,
          title: values.title,
          durationSeconds: values.durationSeconds,
          notes: values.notes || null,
          assignedTo: values.assignedTo || null,
          mediaUrl: values.mediaUrl || null,
          songId: values.songId || null,
        })

        if (!result.success) {
          toast.error(result.error)
          return
        }

        onItemSaved({
          id: values.id,
          order: initialItem?.order || 0,
          type: values.type,
          title: values.title,
          durationSeconds: values.durationSeconds,
          notes: values.notes || null,
          assignedTo: initialItem?.assignedTo || null,
          mediaUrl: values.mediaUrl || null,
          songId: values.songId || null,
        })
        toast.success("Item updated")
        onOpenChange(false)
      }
    } catch (error) {
      console.error("Error saving rundown item", error)
      toast.error("Failed to save item")
    } finally {
      setIsSubmitting(false)
    }
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{mode === "create" ? "Add item" : "Edit item"}</DialogTitle>
          <DialogDescription>
            Add timing details and notes for the rundown item.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input placeholder="Welcome, Worship, Sermon..." {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <FormControl>
                    <ItemTypeSelector value={field.value} onChange={field.onChange} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="durationSeconds"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Duration (minutes)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={Math.round((field.value || 0) / 60)}
                        onChange={(event) => {
                          const minutes = Number(event.target.value) || 0
                          field.onChange(minutes * 60)
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea placeholder="Cues, transitions, scripture refs" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === "create" ? (
                  <>
                    <Plus className="mr-2 h-4 w-4" />
                    Add item
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
