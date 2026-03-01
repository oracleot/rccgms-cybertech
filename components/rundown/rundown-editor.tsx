"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, type DragEndEvent } from "@dnd-kit/core"
import { arrayMove, SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable"
import { Plus, RefreshCw } from "lucide-react"
import { toast } from "sonner"

import {
  addRundownItem,
  deleteRundownItem,
  reorderRundownItems,
} from "@/app/(dashboard)/rundown/actions"
import { createClient } from "@/lib/supabase/client"
import { formatDuration } from "@/lib/utils"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { AddItemModal } from "@/components/rundown/add-item-modal"
import { SortableItem } from "@/components/rundown/sortable-item"
import { TemplateSelector } from "@/components/rundown/template-selector"
import type { RundownEditorItem } from "@/components/rundown/types"
import type { RundownItemType } from "@/types/rundown"

interface RundownEditorProps {
  rundownId: string
  initialItems: RundownEditorItem[]
  canEdit: boolean
}

interface ItemQueryResult {
  id: string
  order: number
  type: RundownItemType
  title: string
  duration_seconds: number
  notes: string | null
  assigned_user?: { id: string; name: string; avatar_url: string | null } | null
}

export function RundownEditor({ rundownId, initialItems, canEdit }: RundownEditorProps) {
  const [items, setItems] = useState<RundownEditorItem[]>(() =>
    [...initialItems].sort((a, b) => a.order - b.order)
  )
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<RundownEditorItem | null>(null)
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null)
  const sensors = useSensors(useSensor(PointerSensor))

  const supabase = createClient()

  const totalDuration = useMemo(
    () => items.reduce((acc, item) => acc + (item.durationSeconds || 0), 0),
    [items]
  )

  const fetchItems = useCallback(async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from("rundown_items")
        .select(
          `id, order, type, title, duration_seconds, notes,
           assigned_user:profiles!rundown_items_assigned_to_fkey(id, name, avatar_url)`
        )
        .eq("rundown_id", rundownId)
        .order("order", { ascending: true })

      if (error) throw error

      const typedItems = (data ?? []) as ItemQueryResult[]

      const mapped = typedItems.map((item) => ({
        id: item.id,
        order: item.order || 0,
        type: item.type as RundownItemType,
        title: item.title,
        durationSeconds: item.duration_seconds || 0,
        notes: item.notes,
        assignedTo: item.assigned_user
          ? {
              id: item.assigned_user.id,
              name: item.assigned_user.name,
              avatarUrl: item.assigned_user.avatar_url,
            }
          : null,
      })) as RundownEditorItem[]

      setItems(mapped)
    } catch (error) {
      console.error("Error loading rundown items", error)
      toast.error("Failed to load rundown items")
    } finally {
      setLoading(false)
    }
  }, [rundownId, supabase])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  useEffect(() => {
    const channel = supabase
      .channel(`rundown:${rundownId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "rundown_items", filter: `rundown_id=eq.${rundownId}` },
        () => {
          fetchItems()
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [fetchItems, rundownId, supabase])

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = items.findIndex((item) => item.id === active.id)
    const newIndex = items.findIndex((item) => item.id === over.id)
    const reordered = arrayMove(items, oldIndex, newIndex).map((item, index) => ({
      ...item,
      order: index + 1,
    }))

    setItems(reordered)

    const result = await reorderRundownItems({
      rundownId,
      itemIds: reordered.map((item) => item.id),
    })

    if (!result.success) {
      toast.error(result.error)
    }
  }

  const handleItemSaved = (item: RundownEditorItem) => {
    setItems((prev) => {
      const existingIndex = prev.findIndex((i) => i.id === item.id)
      if (existingIndex >= 0) {
        const copy = [...prev]
        copy[existingIndex] = { ...copy[existingIndex], ...item }
        return copy
      }
      return [...prev, { ...item, order: prev.length + 1 }]
    })
    setEditingItem(null)
  }

  const handleDelete = (id: string) => {
    setDeleteConfirmId(id)
  }

  const handleConfirmedDelete = async () => {
    if (!deleteConfirmId) return
    const id = deleteConfirmId
    setDeleteConfirmId(null)
    const result = await deleteRundownItem(id)
    if (!result.success) {
      toast.error(result.error)
      return
    }
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const handleDeleteDialogChange = (open: boolean) => {
    if (!open) setDeleteConfirmId(null)
  }

  const handleTemplateApply = async (
    templateItems: Array<{ title: string; type: string; durationSeconds: number; notes: string | null; order: number }>
  ) => {
    const sorted = [...templateItems].sort((a, b) => a.order - b.order)
    for (const templateItem of sorted) {
      const result = await addRundownItem({
        rundownId,
        title: templateItem.title,
        type: templateItem.type as RundownItemType,
        durationSeconds: templateItem.durationSeconds,
        notes: templateItem.notes || undefined,
      })
      if (!result.success) {
        toast.error(result.error)
        return
      }
    }
    fetchItems()
    toast.success("Template applied")
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">Total duration</p>
          <p className="text-lg font-semibold">{formatDuration(totalDuration)}</p>
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" onClick={fetchItems}>
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button onClick={() => { setEditingItem(null); setModalOpen(true) }}>
              <Plus className="mr-2 h-4 w-4" />
              Add item
            </Button>
          </div>
        )}
      </div>

      {canEdit && <TemplateSelector items={items} onApply={handleTemplateApply} />}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Items</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-2">
              {[1, 2, 3].map((key) => (
                <Skeleton key={key} className="h-16 w-full" />
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-6 text-muted-foreground">
              {canEdit ? "Add your first item to get started" : "No items yet"}
            </div>
          ) : (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={items.map((item) => item.id)} strategy={verticalListSortingStrategy}>
                <div className="space-y-2">
                  {items
                    .slice()
                    .sort((a, b) => a.order - b.order)
                    .map((item) => (
                      <SortableItem
                        key={item.id}
                        item={item}
                        onEdit={(it) => {
                          setEditingItem(it)
                          setModalOpen(true)
                        }}
                        onDelete={handleDelete}
                        isDraggable={canEdit}
                        canEdit={canEdit}
                      />
                    ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </CardContent>
      </Card>

      {canEdit && (
        <AddItemModal
          open={modalOpen}
          onOpenChange={(open) => {
            setModalOpen(open)
            if (!open) setEditingItem(null)
          }}
          rundownId={rundownId}
          initialItem={editingItem}
          onItemSaved={handleItemSaved}
        />
      )}

      <AlertDialog open={!!deleteConfirmId} onOpenChange={handleDeleteDialogChange}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete item?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the item from the rundown. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmedDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
