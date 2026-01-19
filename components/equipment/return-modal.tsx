"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { returnEquipment } from "@/app/(dashboard)/equipment/actions"
import {
  returnEquipmentSchema,
  type ReturnEquipmentInput,
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
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

interface ReturnModalProps {
  checkoutId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function ReturnModal({ checkoutId, open, onOpenChange, onSuccess }: ReturnModalProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<ReturnEquipmentInput>({
    resolver: zodResolver(returnEquipmentSchema),
    defaultValues: {
      checkoutId,
      conditionOnReturn: "",
      notes: "",
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await returnEquipment(values)

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Equipment returned")
      form.reset({ checkoutId, conditionOnReturn: "", notes: "" })
      onOpenChange(false)
      onSuccess?.()
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Return equipment</DialogTitle>
          <DialogDescription>Confirm the item has been returned and add condition notes.</DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="conditionOnReturn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Condition</FormLabel>
                  <FormControl>
                    <Input placeholder="Good, damaged, needs repair..." {...field} />
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
                    <Textarea rows={3} {...field} />
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
                {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Confirm return
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
