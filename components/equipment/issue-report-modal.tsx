"use client"

import { useTransition } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { useForm } from "react-hook-form"
import { AlertTriangle, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { z } from "zod"

import { logMaintenance, updateEquipment } from "@/app/(dashboard)/equipment/actions"
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const issueSchema = z.object({
  description: z.string().min(10, "Please include more detail"),
  severity: z.enum(["low", "medium", "high", "critical"]),
})

interface IssueReportModalProps {
  equipmentId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function IssueReportModal({ equipmentId, open, onOpenChange, onSuccess }: IssueReportModalProps) {
  const [isPending, startTransition] = useTransition()

  const form = useForm<z.infer<typeof issueSchema>>({
    resolver: zodResolver(issueSchema),
    defaultValues: { description: "", severity: "medium" },
  })

  const handleSubmit = form.handleSubmit((values) => {
    startTransition(async () => {
      const result = await logMaintenance({
        equipmentId,
        type: "inspection",
        description: `${values.severity.toUpperCase()}: ${values.description}`,
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      if (values.severity === "high" || values.severity === "critical") {
        await updateEquipment({ id: equipmentId, status: "maintenance" })
      }

      toast.success("Issue recorded")
      form.reset({ description: "", severity: "medium" })
      onOpenChange(false)
      onSuccess?.()
    })
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Report issue
          </DialogTitle>
          <DialogDescription>
            Log a problem with this equipment so the team can act quickly.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea rows={4} placeholder="Describe the issue" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="severity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Severity</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select severity" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="low">Low</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="high">High</SelectItem>
                      <SelectItem value="critical">Critical</SelectItem>
                    </SelectContent>
                  </Select>
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
                Submit
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  )
}
