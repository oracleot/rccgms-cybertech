"use client"

import Link from "next/link"
import {
  CalendarDays,
  Package,
  FileText,
  Users,
  Settings,
  RefreshCcw,
  Video,
  Plus,
  ArrowRight,
  Zap,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { BlurFade } from "@/components/ui/blur-fade"
import type { UserRole } from "@/types/auth"

interface QuickAction {
  href: string
  icon: React.ReactNode
  title: string
  description: string
  roles: UserRole[]
  color: string
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    href: "/rota",
    icon: <CalendarDays className="h-5 w-5" />,
    title: "View Rota",
    description: "Check your schedule",
    roles: ["admin", "developer", "leader", "member"],
    color: "violet",
  },
  {
    href: "/rota/availability",
    icon: <RefreshCcw className="h-5 w-5" />,
    title: "Update Availability",
    description: "Set when you can serve",
    roles: ["admin", "developer", "leader", "member"],
    color: "blue",
  },
  {
    href: "/equipment",
    icon: <Package className="h-5 w-5" />,
    title: "Checkout Equipment",
    description: "Reserve gear for service",
    roles: ["admin", "developer", "leader", "member"],
    color: "green",
  },
  {
    href: "/rundown",
    icon: <FileText className="h-5 w-5" />,
    title: "View Rundowns",
    description: "Service order & timing",
    roles: ["admin", "developer", "leader", "member"],
    color: "amber",
  },
  {
    href: "/rota/new",
    icon: <Plus className="h-5 w-5" />,
    title: "Create Rota",
    description: "Schedule a new service",
    roles: ["admin", "developer", "leader"],
    color: "violet",
  },
  {
    href: "/rundown/new",
    icon: <Plus className="h-5 w-5" />,
    title: "Create Rundown",
    description: "Plan a new service order",
    roles: ["admin", "developer", "leader"],
    color: "indigo",
  },
  {
    href: "/livestream",
    icon: <Video className="h-5 w-5" />,
    title: "Livestream Generator",
    description: "Generate descriptions",
    roles: ["admin", "developer", "leader"],
    color: "red",
  },
  {
    href: "/rota/team-availability",
    icon: <Users className="h-5 w-5" />,
    title: "Team Availability",
    description: "View team schedules",
    roles: ["admin", "developer", "leader"],
    color: "cyan",
  },
  {
    href: "/equipment/new",
    icon: <Package className="h-5 w-5" />,
    title: "Add Equipment",
    description: "Register new gear",
    roles: ["admin", "developer", "leader"],
    color: "emerald",
  },
  {
    href: "/admin",
    icon: <Settings className="h-5 w-5" />,
    title: "Admin Settings",
    description: "Manage the system",
    roles: ["admin"],
    color: "slate",
  },
]

const COLOR_CLASSES: Record<string, { bg: string; text: string; hover: string; border: string }> = {
  violet: { 
    bg: "bg-violet-500/10", 
    text: "text-violet-500", 
    hover: "hover:bg-violet-500/5 hover:border-violet-500/30",
    border: "group-hover:border-violet-500/30"
  },
  blue: { 
    bg: "bg-blue-500/10", 
    text: "text-blue-500", 
    hover: "hover:bg-blue-500/5 hover:border-blue-500/30",
    border: "group-hover:border-blue-500/30"
  },
  green: { 
    bg: "bg-green-500/10", 
    text: "text-green-500", 
    hover: "hover:bg-green-500/5 hover:border-green-500/30",
    border: "group-hover:border-green-500/30"
  },
  amber: { 
    bg: "bg-amber-500/10", 
    text: "text-amber-500", 
    hover: "hover:bg-amber-500/5 hover:border-amber-500/30",
    border: "group-hover:border-amber-500/30"
  },
  indigo: { 
    bg: "bg-indigo-500/10", 
    text: "text-indigo-500", 
    hover: "hover:bg-indigo-500/5 hover:border-indigo-500/30",
    border: "group-hover:border-indigo-500/30"
  },
  red: { 
    bg: "bg-red-500/10", 
    text: "text-red-500", 
    hover: "hover:bg-red-500/5 hover:border-red-500/30",
    border: "group-hover:border-red-500/30"
  },
  cyan: { 
    bg: "bg-cyan-500/10", 
    text: "text-cyan-500", 
    hover: "hover:bg-cyan-500/5 hover:border-cyan-500/30",
    border: "group-hover:border-cyan-500/30"
  },
  emerald: { 
    bg: "bg-emerald-500/10", 
    text: "text-emerald-500", 
    hover: "hover:bg-emerald-500/5 hover:border-emerald-500/30",
    border: "group-hover:border-emerald-500/30"
  },
  slate: { 
    bg: "bg-slate-500/10", 
    text: "text-slate-400", 
    hover: "hover:bg-slate-500/5 hover:border-slate-500/30",
    border: "group-hover:border-slate-500/30"
  },
}

interface QuickActionsProps {
  userRole: UserRole
  maxItems?: number
}

export function QuickActions({ userRole, maxItems = 6 }: QuickActionsProps) {
  const availableActions = QUICK_ACTIONS.filter((action) =>
    action.roles.includes(userRole)
  ).slice(0, maxItems)

  return (
    <BlurFade delay={0.25} inView>
      <Card className="relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/5 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        <CardHeader className="relative">
          <CardTitle className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-violet-500/10">
              <Zap className="h-4 w-4 text-violet-500" />
            </div>
            Quick Actions
          </CardTitle>
          <CardDescription>Common tasks you might want to do</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2">
            {availableActions.map((action, index) => {
              const colors = COLOR_CLASSES[action.color] || COLOR_CLASSES.violet
              return (
                <BlurFade key={action.href} delay={0.3 + index * 0.05} inView>
                  <Link
                    href={action.href}
                    className={`flex items-center gap-3 rounded-lg border p-3 transition-all group ${colors.hover}`}
                  >
                    <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${colors.bg} transition-colors group-hover:scale-105`}>
                      <span className={colors.text}>{action.icon}</span>
                    </div>
                    <div className="flex-1">
                      <p className={`font-medium transition-colors group-hover:${colors.text}`}>
                        {action.title}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {action.description}
                      </p>
                    </div>
                    <ArrowRight className={`h-4 w-4 text-muted-foreground opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all ${colors.text}`} />
                  </Link>
                </BlurFade>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </BlurFade>
  )
}
