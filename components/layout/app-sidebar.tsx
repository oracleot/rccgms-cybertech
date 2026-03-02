"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  Clapperboard,
  Home,
  MonitorPlay,
  Package,
  Settings,
  Share2,
  GraduationCap,
  Users,
  Building2,
  Bell,
  Shield,
  Palette,
  Code2,
} from "lucide-react"

import { ROUTES } from "@/lib/constants"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const navItems = [
  {
    title: "Home",
    href: ROUTES.HOME,
    icon: Home,
  },
  {
    title: "Rota",
    href: ROUTES.ROTA,
    icon: CalendarDays,
  },
  {
    title: "Livestream",
    href: ROUTES.LIVESTREAM,
    icon: MonitorPlay,
  },
  {
    title: "Designs",
    href: ROUTES.DESIGNS,
    icon: Palette,
  },
  {
    title: "Equipment",
    href: ROUTES.EQUIPMENT,
    icon: Package,
  },
  {
    title: "Rundown",
    href: ROUTES.RUNDOWN,
    icon: Clapperboard,
  },
  {
    title: "Social",
    href: ROUTES.SOCIAL,
    icon: Share2,
  },
  {
    title: "Training",
    href: ROUTES.TRAINING,
    icon: GraduationCap,
  },
]

const adminItems = [
  {
    title: "Admin",
    href: ROUTES.ADMIN,
    icon: Shield,
  },
  {
    title: "Users",
    href: ROUTES.ADMIN_USERS,
    icon: Users,
  },
  {
    title: "Departments",
    href: ROUTES.ADMIN_DEPARTMENTS,
    icon: Building2,
  },
  {
    title: "Notifications",
    href: ROUTES.ADMIN_NOTIFICATIONS,
    icon: Bell,
  },
  {
    title: "Dev Tools",
    href: ROUTES.ADMIN_DEVELOPER_TOOLS,
    icon: Code2,
  },
]

interface AppSidebarProps {
  userRole?: "admin" | "lead_developer" | "developer" | "leader" | "member"
}

export function AppSidebar({ userRole = "member" }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  return (
    <Sidebar>
      <SidebarHeader>
        {/* T049: Animated logo with hover glow effect */}
        <div className="flex items-center gap-2 px-2 py-4 group">
          <div className={cn(
            "flex h-8 w-8 items-center justify-center rounded-lg",
            "bg-gradient-to-br from-violet-600 to-indigo-600",
            "text-white shadow-md",
            "transition-all duration-300 ease-out",
            "group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-violet-500/30",
            "group-hover:rotate-3"
          )}>
            <MonitorPlay className={cn(
              "h-4 w-4 transition-transform duration-300",
              "group-hover:scale-110"
            )} />
          </div>
          <span className={cn(
            "font-semibold transition-colors duration-200",
            "group-hover:text-violet-600 dark:group-hover:text-violet-400"
          )}>
            Cyber Tech
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  {/* T050 & T051: Active indicator and hover animations */}
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                    className={cn(
                      "relative transition-all duration-200 ease-out",
                      "hover:bg-violet-50 dark:hover:bg-violet-900/20",
                      "hover:translate-x-0.5",
                      isActive(item.href) && [
                        "bg-violet-100 dark:bg-violet-900/30",
                        "text-violet-700 dark:text-violet-300",
                        "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                        "before:h-6 before:w-1 before:rounded-r-full",
                        "before:bg-gradient-to-b before:from-violet-500 before:to-indigo-600",
                        "before:shadow-sm before:shadow-violet-400/50"
                      ]
                    )}
                  >
                    <Link href={item.href} className="group/link">
                      <item.icon className={cn(
                        "h-4 w-4 transition-all duration-200",
                        "group-hover/link:scale-110",
                        isActive(item.href) 
                          ? "text-violet-600 dark:text-violet-400" 
                          : "group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400"
                      )} />
                      <span className={cn(
                        "transition-colors duration-200",
                        isActive(item.href) && "font-medium"
                      )}>
                        {item.title}
                      </span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === "admin" || userRole === "lead_developer" || userRole === "developer") && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                      className={cn(
                        "relative transition-all duration-200 ease-out",
                        "hover:bg-violet-50 dark:hover:bg-violet-900/20",
                        "hover:translate-x-0.5",
                        isActive(item.href) && [
                          "bg-violet-100 dark:bg-violet-900/30",
                          "text-violet-700 dark:text-violet-300",
                          "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                          "before:h-6 before:w-1 before:rounded-r-full",
                          "before:bg-gradient-to-b before:from-violet-500 before:to-indigo-600"
                        ]
                      )}
                    >
                      <Link href={item.href} className="group/link">
                        <item.icon className={cn(
                          "h-4 w-4 transition-all duration-200",
                          "group-hover/link:scale-110",
                          isActive(item.href) 
                            ? "text-violet-600 dark:text-violet-400" 
                            : "group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400"
                        )} />
                        <span className={cn(
                          "transition-colors duration-200",
                          isActive(item.href) && "font-medium"
                        )}>
                          {item.title}
                        </span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              isActive={isActive(ROUTES.SETTINGS)}
              className={cn(
                "relative transition-all duration-200 ease-out",
                "hover:bg-violet-50 dark:hover:bg-violet-900/20",
                "hover:translate-x-0.5",
                isActive(ROUTES.SETTINGS) && [
                  "bg-violet-100 dark:bg-violet-900/30",
                  "text-violet-700 dark:text-violet-300",
                  "before:absolute before:left-0 before:top-1/2 before:-translate-y-1/2",
                  "before:h-6 before:w-1 before:rounded-r-full",
                  "before:bg-gradient-to-b before:from-violet-500 before:to-indigo-600"
                ]
              )}
            >
              <Link href={ROUTES.SETTINGS} className="group/link">
                <Settings className={cn(
                  "h-4 w-4 transition-all duration-200",
                  "group-hover/link:scale-110",
                  isActive(ROUTES.SETTINGS)
                    ? "text-violet-600 dark:text-violet-400"
                    : "group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400"
                )} />
                <span className={cn(
                  "transition-colors duration-200",
                  isActive(ROUTES.SETTINGS) && "font-medium"
                )}>
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-2">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RCCG Morning Star
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
