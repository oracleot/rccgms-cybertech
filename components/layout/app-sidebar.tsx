"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  Clapperboard,
  Home,
  MonitorPlay,
  Settings,
  GraduationCap,
  Users,
  Building2,
  Bell,
  Shield,
  Palette,
  Code2,
  Brain,
  Radio,
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

// Items every role can see
const coreItems = [
  { title: "Home", href: ROUTES.HOME, icon: Home },
  { title: "Rota", href: ROUTES.ROTA, icon: CalendarDays },
  { title: "Rundown", href: ROUTES.RUNDOWN, icon: Clapperboard },
]

// Content & production items
const contentItems = [
  { title: "Livestream", href: ROUTES.LIVESTREAM, icon: Radio },
  { title: "Designs", href: ROUTES.DESIGNS, icon: Palette },
  { title: "Training", href: ROUTES.TRAINING, icon: GraduationCap },
]

// Admin-only management items (NOT shown to developers)
const adminOnlyItems = [
  { title: "Admin", href: ROUTES.ADMIN, icon: Shield },
  { title: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  { title: "Departments", href: ROUTES.ADMIN_DEPARTMENTS, icon: Building2 },
  { title: "Notifications", href: ROUTES.ADMIN_NOTIFICATIONS, icon: Bell },
]

// Admin items also shown to developers (shared management)
const sharedAdminItems = [
  { title: "Admin", href: ROUTES.ADMIN, icon: Shield },
  { title: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  { title: "Departments", href: ROUTES.ADMIN_DEPARTMENTS, icon: Building2 },
  { title: "Notifications", href: ROUTES.ADMIN_NOTIFICATIONS, icon: Bell },
]

// Developer-exclusive items
const developerOnlyItems = [
  { title: "Dev Tools", href: ROUTES.ADMIN_DEVELOPER_TOOLS, icon: Code2 },
  { title: "ML Training", href: ROUTES.ADMIN_ML_TRAINING, icon: Brain },
]

interface AppSidebarProps {
  userRole?: "admin" | "lead_developer" | "developer" | "leader" | "member"
}

export function AppSidebar({ userRole = "member" }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) return pathname === href
    return pathname.startsWith(href)
  }

  const isDeveloper = userRole === "lead_developer" || userRole === "developer"
  const isAdmin = userRole === "admin" || userRole === "leader"

  function NavItem({ item }: { item: { title: string; href: string; icon: React.ElementType } }) {
    return (
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
              "before:bg-gradient-to-b before:from-violet-500 before:to-indigo-600",
              "before:shadow-sm before:shadow-violet-400/50",
            ]
          )}
        >
          <Link href={item.href} className="group/link">
            <item.icon
              className={cn(
                "h-4 w-4 transition-all duration-200",
                "group-hover/link:scale-110",
                isActive(item.href)
                  ? "text-violet-600 dark:text-violet-400"
                  : "group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400"
              )}
            />
            <span className={cn("transition-colors duration-200", isActive(item.href) && "font-medium")}>
              {item.title}
            </span>
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4 group">
          <div
            className={cn(
              "flex h-8 w-8 items-center justify-center rounded-lg",
              "bg-gradient-to-br from-violet-600 to-indigo-600",
              "text-white shadow-md",
              "transition-all duration-300 ease-out",
              "group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-violet-500/30",
              "group-hover:rotate-3"
            )}
          >
            <MonitorPlay className="h-4 w-4 transition-transform duration-300 group-hover:scale-110" />
          </div>
          <span className="font-semibold transition-colors duration-200 group-hover:text-violet-600 dark:group-hover:text-violet-400">
            Fusion
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* My Space — everyone */}
        <SidebarGroup>
          <SidebarGroupLabel>My Space</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {coreItems.map((item) => <NavItem key={item.href} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content & Media — everyone */}
        <SidebarGroup>
          <SidebarGroupLabel>Content &amp; Media</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.map((item) => <NavItem key={item.href} item={item} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration — admin and leader only (NOT developer) */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminOnlyItems.map((item) => <NavItem key={item.href} item={item} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Management (shared) — shown to developers too */}
        {isDeveloper && (
          <SidebarGroup>
            <SidebarGroupLabel>Management</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {sharedAdminItems.map((item) => <NavItem key={item.href} item={item} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Developer — developers only, never shown to admin */}
        {isDeveloper && (
          <SidebarGroup>
            <SidebarGroupLabel className="text-violet-500 dark:text-violet-400">Developer</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {developerOnlyItems.map((item) => <NavItem key={item.href} item={item} />)}
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
                  "before:bg-gradient-to-b before:from-violet-500 before:to-indigo-600",
                ]
              )}
            >
              <Link href={ROUTES.SETTINGS} className="group/link">
                <Settings
                  className={cn(
                    "h-4 w-4 transition-all duration-200",
                    "group-hover/link:scale-110",
                    isActive(ROUTES.SETTINGS)
                      ? "text-violet-600 dark:text-violet-400"
                      : "group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400"
                  )}
                />
                <span className={cn("transition-colors duration-200", isActive(ROUTES.SETTINGS) && "font-medium")}>
                  Settings
                </span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
        <div className="px-2 py-2" suppressHydrationWarning>
          <p className="text-xs text-muted-foreground" suppressHydrationWarning>
            © {new Date().getFullYear()} RCCG Morning Star
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
