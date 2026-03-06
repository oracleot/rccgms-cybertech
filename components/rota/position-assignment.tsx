"use client"

import { useEffect, useState } from "react"
import { GripVertical, Plus, Trash2, User } from "lucide-react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

import { createClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { MemberSelector } from "@/components/rota/member-selector"
import type { Position, Department } from "@/types/auth"

interface Assignment {
  id: string
  positionId: string
  positionName: string
  departmentId: string
  departmentName: string
  departmentColor: string | null
  userId: string | null
  userName: string | null
  userAvatarUrl: string | null
}

interface PositionWithDepartment extends Position {
  department: Department
}

interface PositionAssignmentProps {
  rotaId: string
  date: string
  assignments: Assignment[]
  onAssignmentsChange: (assignments: Assignment[]) => void
  readOnly?: boolean
}

function SortableAssignment({
  assignment,
  onRemove,
  onUserChange,
  date,
  readOnly,
}: {
  assignment: Assignment
  onRemove: () => void
  onUserChange: (userId: string) => void
  date: string
  readOnly?: boolean
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: assignment.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex items-center gap-3 p-3 bg-card border rounded-lg",
        isDragging && "opacity-50 shadow-lg"
      )}
    >
      {!readOnly && (
        <div
          {...attributes}
          {...listeners}
          className="cursor-grab hover:bg-muted rounded p-1"
        >
          <GripVertical className="h-4 w-4 text-muted-foreground" />
        </div>
      )}
      
      <div
        className="w-3 h-3 rounded-full shrink-0"
        style={{ backgroundColor: assignment.departmentColor || "#6b7280" }}
      />
      
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{assignment.positionName}</div>
        <div className="text-xs text-muted-foreground truncate">
          {assignment.departmentName}
        </div>
      </div>

      {readOnly ? (
        assignment.userId && (
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={assignment.userAvatarUrl || undefined} />
              <AvatarFallback>
                <User className="h-4 w-4" />
              </AvatarFallback>
            </Avatar>
            <span className="text-sm truncate">{assignment.userName}</span>
          </div>
        )
      ) : (
        <div className="w-48">
          <MemberSelector
            value={assignment.userId || undefined}
            onValueChange={onUserChange}
            departmentId={assignment.departmentId}
            date={date}
            placeholder="Assign..."
          />
        </div>
      )}

      {!readOnly && (
        <Button
          variant="ghost"
          size="icon"
          onClick={onRemove}
          type="button"
          className="shrink-0"
        >
          <Trash2 className="h-4 w-4 text-destructive" />
        </Button>
      )}
    </div>
  )
}

export function PositionAssignment({
  rotaId: _rotaId,
  date,
  assignments,
  onAssignmentsChange,
  readOnly = false,
}: PositionAssignmentProps) {
  const [positions, setPositions] = useState<PositionWithDepartment[]>([])
  const [_isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  useEffect(() => {
    async function fetchPositions() {
      setIsLoading(true)
      try {
        const { data, error } = await supabase
          .from("positions")
          .select(`
            *,
            department:departments(*)
          `)
          .order("name", { ascending: true })

        if (error) throw error
        setPositions(data || [])
      } catch (error) {
        console.error("Error fetching positions:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchPositions()
  }, [supabase])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    if (over && active.id !== over.id) {
      const oldIndex = assignments.findIndex((a) => a.id === active.id)
      const newIndex = assignments.findIndex((a) => a.id === over.id)
      
      const newAssignments = arrayMove(assignments, oldIndex, newIndex)
      onAssignmentsChange(newAssignments)
    }
  }

  const handleAddPosition = (position: PositionWithDepartment) => {
    const newAssignment: Assignment = {
      id: `temp-${Date.now()}`,
      positionId: position.id,
      positionName: position.name,
      departmentId: position.department_id,
      departmentName: position.department.name,
      departmentColor: position.department.color,
      userId: null,
      userName: null,
      userAvatarUrl: null,
    }
    onAssignmentsChange([...assignments, newAssignment])
  }

  const handleRemoveAssignment = (assignmentId: string) => {
    onAssignmentsChange(assignments.filter((a) => a.id !== assignmentId))
  }

  const handleUserChange = (assignmentId: string, userId: string) => {
    onAssignmentsChange(
      assignments.map((a) =>
        a.id === assignmentId ? { ...a, userId } : a
      )
    )
  }

  // Group positions by department for the add menu
  const positionsByDepartment = positions.reduce((acc, pos) => {
    const deptName = pos.department.name
    if (!acc[deptName]) {
      acc[deptName] = []
    }
    acc[deptName].push(pos)
    return acc
  }, {} as Record<string, PositionWithDepartment[]>)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">Position Assignments</CardTitle>
        <CardDescription>
          Drag to reorder, assign members to each position
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {assignments.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No positions assigned yet. Add positions to get started.
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext
              items={assignments.map((a) => a.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {assignments.map((assignment) => (
                  <SortableAssignment
                    key={assignment.id}
                    assignment={assignment}
                    onRemove={() => handleRemoveAssignment(assignment.id)}
                    onUserChange={(userId) =>
                      handleUserChange(assignment.id, userId)
                    }
                    date={date}
                    readOnly={readOnly}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
        )}

        {!readOnly && (
          <div className="pt-4 border-t">
            <div className="flex flex-wrap gap-2">
              {Object.entries(positionsByDepartment).map(([deptName, deptPositions]) => (
                <div key={deptName} className="flex flex-wrap gap-1">
                  {deptPositions.map((position) => (
                    <Button
                      key={position.id}
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddPosition(position)}
                      type="button"
                      className="gap-1"
                    >
                      <Plus className="h-3 w-3" />
                      {position.name}
                    </Button>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
