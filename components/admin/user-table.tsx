"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { MoreHorizontal, Edit, Trash2, Mail, Search, Loader2, Building2, Star } from "lucide-react"
import { toast } from "sonner"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { deleteUser } from "./actions"
import type { Profile, Department, UserDepartment } from "@/types/auth"

interface UserWithDepartments extends Profile {
  department: Department | null
  user_departments?: (UserDepartment & { department: Department })[]
}

interface UserTableProps {
  users: UserWithDepartments[]
  departments: Department[]
}

const roleColors: Record<string, string> = {
  admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  leader: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  volunteer: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2)
}

export function UserTable({ users, departments }: UserTableProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<string>("all")
  const [departmentFilter, setDepartmentFilter] = useState<string>("all")
  const [deleteConfirm, setDeleteConfirm] = useState<{
    id: string
    authUserId: string
    name: string
  } | null>(null)

  const handleDeleteUser = () => {
    if (!deleteConfirm) return

    startTransition(async () => {
      const result = await deleteUser(deleteConfirm.id, deleteConfirm.authUserId)
      if (result.success) {
        toast.success("User deleted successfully")
        router.refresh()
      } else {
        toast.error(result.error || "Failed to delete user")
      }
      setDeleteConfirm(null)
    })
  }

  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      search === "" ||
      user.name.toLowerCase().includes(search.toLowerCase()) ||
      user.email.toLowerCase().includes(search.toLowerCase())
    const matchesRole = roleFilter === "all" || user.role === roleFilter
    
    // Check department filter against all user departments
    let matchesDepartment = departmentFilter === "all"
    if (!matchesDepartment) {
      // Check if user has this department in their assignments
      const hasInUserDepts = user.user_departments?.some(
        ud => ud.department_id === departmentFilter
      )
      // Fallback to legacy department_id
      const hasInLegacy = user.department_id === departmentFilter
      matchesDepartment = hasInUserDepts || hasInLegacy
    }

    return matchesSearch && matchesRole && matchesDepartment
  })

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search users..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="leader">Leader</SelectItem>
            <SelectItem value="volunteer">Volunteer</SelectItem>
          </SelectContent>
        </Select>
        <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Filter by department" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Departments</SelectItem>
            {departments.map((dept) => (
              <SelectItem key={dept.id} value={dept.id}>
                {dept.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="h-24 text-center">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url || undefined} />
                        <AvatarFallback>{getInitials(user.name)}</AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{user.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {user.email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={roleColors[user.role] || ""}>
                      {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <DepartmentBadges user={user} />
                  </TableCell>
                  <TableCell>
                    {user.phone || (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users?edit=${user.id}`}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit Role
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/admin/users?departments=${user.id}`}>
                            <Building2 className="mr-2 h-4 w-4" />
                            Manage Departments
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`mailto:${user.email}`}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send Email
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() =>
                            setDeleteConfirm({
                              id: user.id,
                              authUserId: user.auth_user_id,
                              name: user.name,
                            })
                          }
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!deleteConfirm}
        onOpenChange={() => setDeleteConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>{deleteConfirm?.name}</strong> and
              remove all their data including assignments, availability, and history.
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={handleDeleteUser}
              disabled={isPending}
            >
              {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Summary */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredUsers.length} of {users.length} users
      </div>
    </div>
  )
}

// Helper component to display department badges with primary indicator
function DepartmentBadges({ user }: { user: UserWithDepartments }) {
  // Get departments from user_departments array, fallback to legacy department
  const userDepts = user.user_departments || []
  
  if (userDepts.length === 0) {
    // Fallback to legacy department_id
    if (user.department) {
      return (
        <Badge variant="secondary" className="gap-1">
          <Star className="h-3 w-3 fill-current" />
          {user.department.name}
        </Badge>
      )
    }
    return <span className="text-muted-foreground">—</span>
  }

  // Sort with primary first
  const sortedDepts = [...userDepts].sort((a, b) => {
    if (a.is_primary && !b.is_primary) return -1
    if (!a.is_primary && b.is_primary) return 1
    return 0
  })

  // Show max 3 departments, with +N more indicator
  const visibleDepts = sortedDepts.slice(0, 3)
  const remainingCount = sortedDepts.length - 3

  return (
    <TooltipProvider>
      <div className="flex flex-wrap gap-1">
        {visibleDepts.map((ud) => (
          <Tooltip key={ud.department_id}>
            <TooltipTrigger asChild>
              <Badge 
                variant={ud.is_primary ? "default" : "secondary"} 
                className="gap-1 cursor-default"
              >
                {ud.is_primary && <Star className="h-3 w-3 fill-current" />}
                {ud.department?.name || "Unknown"}
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {ud.is_primary ? "Primary department" : "Additional department"}
            </TooltipContent>
          </Tooltip>
        ))}
        {remainingCount > 0 && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Badge variant="outline" className="cursor-default">
                +{remainingCount} more
              </Badge>
            </TooltipTrigger>
            <TooltipContent>
              {sortedDepts.slice(3).map(ud => ud.department?.name).join(", ")}
            </TooltipContent>
          </Tooltip>
        )}
      </div>
    </TooltipProvider>
  )
}
