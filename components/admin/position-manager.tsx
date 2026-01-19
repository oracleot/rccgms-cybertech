"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Users,
  ChevronDown,
  ChevronRight,
  Loader2,
} from "lucide-react"
import { toast } from "sonner"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
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
import type { Profile, Department, Position } from "@/types/auth"
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
  createPosition,
  deletePosition,
} from "./actions"

interface DepartmentWithDetails extends Department {
  positions: Position[]
  leader: Profile | null
}

interface PositionManagerProps {
  departments: DepartmentWithDetails[]
  leaders: Profile[]
  showAddForm: boolean
  editDeptId?: string
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

const colorOptions = [
  { value: "#ef4444", label: "Red" },
  { value: "#f97316", label: "Orange" },
  { value: "#eab308", label: "Yellow" },
  { value: "#22c55e", label: "Green" },
  { value: "#3b82f6", label: "Blue" },
  { value: "#8b5cf6", label: "Purple" },
  { value: "#ec4899", label: "Pink" },
]

export function PositionManager({
  departments,
  leaders,
  showAddForm,
  editDeptId,
}: PositionManagerProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [expandedDepts, setExpandedDepts] = useState<Set<string>>(new Set())
  const [deleteConfirm, setDeleteConfirm] = useState<{
    type: "department" | "position"
    id: string
    name: string
  } | null>(null)

  // Department form state
  const [deptName, setDeptName] = useState("")
  const [deptDescription, setDeptDescription] = useState("")
  const [deptColor, setDeptColor] = useState("")
  const [deptLeader, setDeptLeader] = useState("")

  // Position form state
  const [addingPositionTo, setAddingPositionTo] = useState<string | null>(null)
  const [positionName, setPositionName] = useState("")

  const editDept = editDeptId
    ? departments.find((d) => d.id === editDeptId)
    : null

  const toggleExpand = (id: string) => {
    setExpandedDepts((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const handleAddDepartment = () => {
    if (!deptName.trim()) {
      toast.error("Department name is required")
      return
    }

    startTransition(async () => {
      const result = await createDepartment({
        name: deptName,
        description: deptDescription || undefined,
        color: deptColor || undefined,
        leaderId: deptLeader || undefined,
      })

      if (result.success) {
        toast.success("Department created")
        setDeptName("")
        setDeptDescription("")
        setDeptColor("")
        setDeptLeader("")
        router.push("/admin/departments")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to create department")
      }
    })
  }

  const handleUpdateDepartment = () => {
    if (!editDept) return

    startTransition(async () => {
      const result = await updateDepartment({
        id: editDept.id,
        name: deptName || editDept.name,
        description: deptDescription,
        color: deptColor,
        leaderId: deptLeader || null,
      })

      if (result.success) {
        toast.success("Department updated")
        router.push("/admin/departments")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to update department")
      }
    })
  }

  const handleDeleteDepartment = (id: string) => {
    startTransition(async () => {
      const result = await deleteDepartment(id)
      if (result.success) {
        toast.success("Department deleted")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete department")
      }
      setDeleteConfirm(null)
    })
  }

  const handleAddPosition = (departmentId: string) => {
    if (!positionName.trim()) {
      toast.error("Position name is required")
      return
    }

    startTransition(async () => {
      const result = await createPosition({
        departmentId,
        name: positionName,
      })

      if (result.success) {
        toast.success("Position added")
        setPositionName("")
        setAddingPositionTo(null)
        router.refresh()
      } else {
        toast.error(result.error || "Failed to add position")
      }
    })
  }

  const handleDeletePosition = (id: string) => {
    startTransition(async () => {
      const result = await deletePosition(id)
      if (result.success) {
        toast.success("Position deleted")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete position")
      }
      setDeleteConfirm(null)
    })
  }

  return (
    <div className="space-y-4">
      {/* Add/Edit Department Dialog */}
      <Dialog
        open={showAddForm || !!editDept}
        onOpenChange={() => router.push("/admin/departments")}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editDept ? "Edit Department" : "Add Department"}
            </DialogTitle>
            <DialogDescription>
              {editDept
                ? "Update department details"
                : "Create a new department for the tech team"}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                placeholder="e.g., Sound Department"
                value={deptName || editDept?.name || ""}
                onChange={(e) => setDeptName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                placeholder="Optional description"
                value={deptDescription || editDept?.description || ""}
                onChange={(e) => setDeptDescription(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Select
                value={deptColor || editDept?.color || "none"}
                onValueChange={(value) => setDeptColor(value === "none" ? "" : value)}
              >
                <SelectTrigger id="color">
                  <SelectValue placeholder="Select a color" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Color</SelectItem>
                  {colorOptions.map((color) => (
                    <SelectItem key={color.value} value={color.value}>
                      <div className="flex items-center gap-2">
                        <div
                          className="h-4 w-4 rounded"
                          style={{ backgroundColor: color.value }}
                        />
                        {color.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="leader">Department Leader</Label>
              <Select
                value={deptLeader || editDept?.leader_id || "none"}
                onValueChange={(value) => setDeptLeader(value === "none" ? "" : value)}
              >
                <SelectTrigger id="leader">
                  <SelectValue placeholder="Select a leader" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No Leader</SelectItem>
                  {leaders.map((leader) => (
                    <SelectItem key={leader.id} value={leader.id}>
                      {leader.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => router.push("/admin/departments")}
              disabled={isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={editDept ? handleUpdateDepartment : handleAddDepartment}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {editDept ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteConfirm?.name}</strong>
              {deleteConfirm?.type === "department" &&
                " and all its positions"}.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deleteConfirm?.type === "department") {
                  handleDeleteDepartment(deleteConfirm.id)
                } else if (deleteConfirm?.type === "position") {
                  handleDeletePosition(deleteConfirm.id)
                }
              }}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Departments List */}
      {departments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Building2 className="h-12 w-12 text-muted-foreground" />
            <h3 className="mt-4 text-lg font-semibold">No departments yet</h3>
            <p className="text-sm text-muted-foreground">
              Create your first department to get started
            </p>
            <Button className="mt-4" asChild>
              <a href="/admin/departments?add=true">
                <Plus className="mr-2 h-4 w-4" />
                Add Department
              </a>
            </Button>
          </CardContent>
        </Card>
      ) : (
        departments.map((dept) => (
          <Collapsible
            key={dept.id}
            open={expandedDepts.has(dept.id)}
            onOpenChange={() => toggleExpand(dept.id)}
          >
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CollapsibleTrigger asChild>
                    <Button
                      variant="ghost"
                      className="h-auto p-0 hover:bg-transparent"
                    >
                      <div className="flex items-center gap-3">
                        {expandedDepts.has(dept.id) ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                        <div
                          className="h-4 w-4 rounded"
                          style={{ backgroundColor: dept.color || "#3b82f6" }}
                        />
                        <CardTitle className="text-lg">{dept.name}</CardTitle>
                        <Badge variant="secondary">
                          {dept.positions.length} position
                          {dept.positions.length !== 1 ? "s" : ""}
                        </Badge>
                      </div>
                    </Button>
                  </CollapsibleTrigger>
                  <div className="flex items-center gap-2">
                    {dept.leader && (
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Avatar className="h-6 w-6">
                          <AvatarImage src={dept.leader.avatar_url || undefined} />
                          <AvatarFallback className="text-xs">
                            {getInitials(dept.leader.name)}
                          </AvatarFallback>
                        </Avatar>
                        {dept.leader.name}
                      </div>
                    )}
                    <Button variant="ghost" size="icon" asChild>
                      <a href={`/admin/departments?edit=${dept.id}`}>
                        <Edit className="h-4 w-4" />
                      </a>
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() =>
                        setDeleteConfirm({
                          type: "department",
                          id: dept.id,
                          name: dept.name,
                        })
                      }
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
                {dept.description && (
                  <CardDescription className="ml-7">
                    {dept.description}
                  </CardDescription>
                )}
              </CardHeader>

              <CollapsibleContent>
                <CardContent className="pt-2">
                  <div className="space-y-2">
                    <h4 className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Positions
                    </h4>

                    {dept.positions.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-2">
                        No positions defined yet
                      </p>
                    ) : (
                      <div className="space-y-1">
                        {dept.positions.map((pos) => (
                          <div
                            key={pos.id}
                            className="flex items-center justify-between rounded-md border px-3 py-2"
                          >
                            <span>{pos.name}</span>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8"
                              onClick={() =>
                                setDeleteConfirm({
                                  type: "position",
                                  id: pos.id,
                                  name: pos.name,
                                })
                              }
                            >
                              <Trash2 className="h-3 w-3 text-destructive" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Add Position Form */}
                    {addingPositionTo === dept.id ? (
                      <div className="flex items-center gap-2 pt-2">
                        <Input
                          placeholder="Position name"
                          value={positionName}
                          onChange={(e) => setPositionName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") {
                              handleAddPosition(dept.id)
                            }
                          }}
                        />
                        <Button
                          size="sm"
                          onClick={() => handleAddPosition(dept.id)}
                          disabled={isPending}
                        >
                          {isPending && (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          )}
                          Add
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            setAddingPositionTo(null)
                            setPositionName("")
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    ) : (
                      <Button
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => setAddingPositionTo(dept.id)}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Add Position
                      </Button>
                    )}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Card>
          </Collapsible>
        ))
      )}
    </div>
  )
}
