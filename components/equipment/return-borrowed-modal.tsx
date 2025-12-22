"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { AlertTriangle, Loader2, RotateCcw } from "lucide-react"
import { toast } from "sonner"

import { updateEquipment } from "@/app/(dashboard)/equipment/actions"
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

interface ReturnBorrowedModalProps {
  equipmentId: string
  equipmentName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ReturnBorrowedModal({
  equipmentId,
  equipmentName,
  open,
  onOpenChange,
}: ReturnBorrowedModalProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  const handleReturn = () => {
    startTransition(async () => {
      // Mark the equipment as returned since it's returned to the owner
      const result = await updateEquipment({ 
        id: equipmentId, 
        status: "returned" 
      })

      if (!result.success) {
        toast.error(result.error)
        return
      }

      toast.success("Equipment returned to owner")
      onOpenChange(false)
      router.refresh()
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <RotateCcw className="h-5 w-5 text-blue-500" />
            Return to owner
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to mark <strong>{equipmentName}</strong> as returned to its owner? 
            This will retire the equipment from inventory since it&apos;s no longer in the church&apos;s possession.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            onClick={handleReturn}
            disabled={isPending}
          >
            {isPending ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RotateCcw className="mr-2 h-4 w-4" />
            )}
            Confirm return
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
