"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { CheckCircle, Loader2 } from "lucide-react"
import { toast } from "sonner"

import { completeMaintenance } from "@/app/(dashboard)/equipment/actions"
import {
  completeMaintenanceSchema,
  type CompleteMaintenanceInput,
} from "@/lib/validations/equipment"
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
import { Textarea } from "@/components/ui/textarea"

interface CompleteMaintenanceModalProps {
  equipmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CompleteMaintenanceModal({
  equipmentId,
  open,
  onOpenChange,
  onSuccess,
}: CompleteMaintenanceModalProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<CompleteMaintenanceInput>({
    resolver: zodResolver(completeMaintenanceSchema),
    defaultValues: {
      equipmentId,
      notes: "",
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await completeMaintenance(values)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Maintenance completed - equipment is now available")
      form.reset({ equipmentId, notes: "" })
      onOpenChange(false)
      onSuccess?.()
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Complete maintenance</DialogTitle>
          <DialogDescription>
            Mark maintenance as complete and return the equipment to available status.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      rows={3}
                      placeholder="Any notes about the completed maintenance..."
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="mr-2 h-4 w-4" />
                )}
                Complete maintenance
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
