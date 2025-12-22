"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

import { checkoutEquipment } from "@/app/(dashboard)/equipment/actions"
import {
  checkoutEquipmentSchema,
  type CheckoutEquipmentInput,
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

interface CheckoutModalProps {
  equipmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function CheckoutModal({ equipmentId, open, onOpenChange, onSuccess }: CheckoutModalProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<CheckoutEquipmentInput>({
    resolver: zodResolver(checkoutEquipmentSchema),
    defaultValues: {
      equipmentId,
      expectedReturn: "",
      notes: "",
    },
  })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      // Convert datetime-local format to ISO string
      const expectedReturnIso = new Date(values.expectedReturn).toISOString()
      const result = await checkoutEquipment({
        ...values,
        expectedReturn: expectedReturnIso,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Checked out")
      form.reset({ equipmentId, expectedReturn: "", notes: "" })
      onOpenChange(false)
      onSuccess?.()
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Check out equipment</DialogTitle>
          <DialogDescription>
            Set when you expect to return the item. Status updates automatically.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="expectedReturn"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Expected return</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
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
                    <Textarea rows={3} placeholder="Purpose or destination" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="gap-2 sm:gap-0">
              <Button className="mr-2" type="button" variant="outline" onClick={() => onOpenChange(false)}>
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
