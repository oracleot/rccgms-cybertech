"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { deleteEquipment } from "@/app/(dashboard)/equipment/actions"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"

interface DeleteEquipmentModalProps {
  equipmentId: string
  equipmentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function DeleteEquipmentModal({
  equipmentId,
  equipmentName,
  open,
  onOpenChange,
}: DeleteEquipmentModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteEquipment({ equipmentId })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Equipment deleted successfully")
      onOpenChange(false)
      router.push("/equipment")
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Delete equipment
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{equipmentName}</strong>? This action cannot
            be undone. All maintenance records and return history for this item will also be
            permanently deleted.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Delete
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
