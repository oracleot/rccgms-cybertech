"use client"

import Link from "next/link"
import {
  CalendarDays,
  Package,
  MonitorPlay,
  FileText,
  Users,
  Settings,
  RefreshCcw,
  Video,
  Plus,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import type { UserRole } from "@/types/auth"

interface QuickAction {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  roles: UserRole[]
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/rota",
    icon: <CalendarDays className="h-5 w-5" />,
    title: "View Rota",
    description: "Check your schedule",
    roles: ["admin", "leader", "volunteer"],
  },
  {
    href: "/rota/availability",
    icon: <RefreshCcw className="h-5 w-5" />,
    title: "Update Availability",
    description: "Set when you can serve",
    roles: ["admin", "leader", "volunteer"],
  },
  {
    href: "/equipment",
    icon: <Package className="h-5 w-5" />,
    title: "Checkout Equipment",
    description: "Reserve gear for service",
    roles: ["admin", "leader", "volunteer"],
  },
  {
    href: "/rundown",
    icon: <FileText className="h-5 w-5" />,
    title: "View Rundowns",
    description: "Service order & timing",
    roles: ["admin", "leader", "volunteer"],
  },
  {
    href: "/rota/new",
    icon: <Plus className="h-5 w-5" />,
    title: "Create Rota",
    description: "Schedule a new service",
    roles: ["admin", "leader"],
  },
  {
    href: "/rundown/new",
    icon: <Plus className="h-5 w-5" />,
    title: "Create Rundown",
    description: "Plan a new service order",
    roles: ["admin", "leader"],
  },
  {
    href: "/livestream",
    icon: <Video className="h-5 w-5" />,
    title: "Livestream Generator",
    description: "Generate descriptions",
    roles: ["admin", "leader"],
  },
  {
    href: "/rota/team-availability",
    icon: <Users className="h-5 w-5" />,
    title: "Team Availability",
    description: "View team schedules",
    roles: ["admin", "leader"],
  },
  {
    href: "/equipment/new",
    icon: <Package className="h-5 w-5" />,
    title: "Add Equipment",
    description: "Register new gear",
    roles: ["admin", "leader"],
  },
  {
    href: "/admin",
    icon: <Settings className="h-5 w-5" />,
    title: "Admin Settings",
    description: "Manage the system",
    roles: ["admin"],
  },
]

interface QuickActionsProps {
  userRole: UserRole
  maxItems?: number
}

export function QuickActions({ userRole, maxItems = 6 }: QuickActionsProps) {
  const availableActions = QUICK_ACTIONS.filter((action) =>
    action.roles.includes(userRole)
  ).slice(0, maxItems)

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MonitorPlay className="h-5 w-5" />
          Quick Actions
        </CardTitle>
        <CardDescription>Common tasks you might want to do</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-2 sm:grid-cols-2">
          {availableActions.map((action) => (
            <Link
              key={action.href}
              href={action.href}
              className="flex items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                {action.icon}
              </div>
              <div>
                <p className="font-medium">{action.title}</p>
                <p className="text-sm text-muted-foreground">
                  {action.description}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
