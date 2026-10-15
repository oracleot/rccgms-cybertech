"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import {
  BookOpen,
  CalendarDays,
  Clapperboard,
  Home,
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
  Music2,
  Video,
  Church,
} from "lucide-react"

import { ROUTES } from "@/lib/constants"
import { FEATURE_SLUGS } from "@/lib/features/types"
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

interface NavItemDef {
  title: string
  href: string
  icon: React.ElementType
  feature?: string
}

const coreItems: NavItemDef[] = [
  { title: "Home", href: ROUTES.HOME, icon: Home, feature: FEATURE_SLUGS.DASHBOARD },
  { title: "Rota", href: ROUTES.ROTA, icon: CalendarDays, feature: FEATURE_SLUGS.ROTA },
  { title: "Meetings", href: ROUTES.MEETINGS, icon: Video, feature: FEATURE_SLUGS.MEETINGS },
  { title: "Rundown", href: ROUTES.RUNDOWN, icon: Clapperboard, feature: FEATURE_SLUGS.RUNDOWN },
  { title: "Bible", href: ROUTES.BIBLE, icon: BookOpen, feature: FEATURE_SLUGS.BIBLE },
]

const contentItems: NavItemDef[] = [
  { title: "Livestream", href: ROUTES.LIVESTREAM, icon: Radio, feature: FEATURE_SLUGS.LIVESTREAM },
  { title: "Worship Library", href: ROUTES.WORSHIP_LIBRARY, icon: Music2, feature: FEATURE_SLUGS.WORSHIP_LIBRARY },
  { title: "Designs", href: ROUTES.DESIGNS, icon: Palette, feature: FEATURE_SLUGS.DESIGNS },
  { title: "Training", href: ROUTES.TRAINING, icon: GraduationCap, feature: FEATURE_SLUGS.TRAINING },
]

// Admin-only management items (NOT shown to developers)
const adminOnlyItems = [
  { title: "Admin", href: ROUTES.ADMIN, icon: Shield },
  { title: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  { title: "Departments", href: ROUTES.ADMIN_DEPARTMENTS, icon: Building2 },
  { title: "Notifications", href: ROUTES.ADMIN_NOTIFICATIONS, icon: Bell },
  { title: "Parish", href: ROUTES.ADMIN_PARISH, icon: Church },
]

// Admin items also shown to developers (shared management)
const sharedAdminItems = [
  { title: "Admin", href: ROUTES.ADMIN, icon: Shield },
  { title: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  { title: "Departments", href: ROUTES.ADMIN_DEPARTMENTS, icon: Building2 },
  { title: "Notifications", href: ROUTES.ADMIN_NOTIFICATIONS, icon: Bell },
  { title: "Parish", href: ROUTES.ADMIN_PARISH, icon: Church },
]

// Developer-exclusive items
const developerOnlyItems = [
  { title: "Dev Tools", href: ROUTES.ADMIN_DEVELOPER_TOOLS, icon: Code2 },
  { title: "ML Training", href: ROUTES.ADMIN_ML_TRAINING, icon: Brain },
]

function NavItem({ item, active }: { item: { title: string; href: string; icon: React.ElementType }; active: boolean }) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        className={cn(
          "relative transition-all duration-200 ease-out",
          "hover:bg-violet-50 dark:hover:bg-violet-900/20",
          "hover:translate-x-0.5",
          active && [
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
              active
                ? "text-violet-600 dark:text-violet-400"
                : "group-hover/link:text-violet-600 dark:group-hover/link:text-violet-400"
            )}
          />
          <span className={cn("transition-colors duration-200", active && "font-medium")}>
            {item.title}
          </span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

interface AppSidebarProps {
  userRole?: "admin" | "lead_developer" | "developer" | "leader" | "member"
  parishRole?: string | null
  enabledFeatures?: string[]
}

export function AppSidebar({ userRole = "member", parishRole, enabledFeatures = [] }: AppSidebarProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) return pathname === href
    return pathname.startsWith(href)
  }

  const isDeveloper = userRole === "lead_developer" || userRole === "developer"
  const isAdmin = userRole === "admin" || userRole === "leader"
  const isParishAdmin = parishRole === "parish_admin"

  const featureSet = new Set(enabledFeatures)
  const isFeatureEnabled = (item: NavItemDef) =>
    !item.feature || isDeveloper || featureSet.has(item.feature)

  return (
    <Sidebar>
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-4 group">
          <div className="h-8 w-8 rounded-lg overflow-hidden shadow-md transition-all duration-300 ease-out group-hover:scale-110 group-hover:shadow-lg group-hover:shadow-violet-500/30">
            <Image
              src="/icons/icon-192.png"
              alt="Fusion"
              width={32}
              height={32}
              className="object-cover"
            />
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
              {coreItems.filter(isFeatureEnabled).map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Content & Media — everyone */}
        <SidebarGroup>
          <SidebarGroupLabel>Content &amp; Media</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {contentItems.filter(isFeatureEnabled).map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} />)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Administration — admin and leader only (NOT developer) */}
        {isAdmin && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminOnlyItems.map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} />)}
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
                {sharedAdminItems.map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} />)}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {/* Parish Management — parish_admin who is NOT already seeing admin/developer sections */}
        {isParishAdmin && !isAdmin && !isDeveloper && (
          <SidebarGroup>
            <SidebarGroupLabel>Parish</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <NavItem item={{ title: "Parish", href: ROUTES.ADMIN_PARISH, icon: Church }} active={isActive(ROUTES.ADMIN_PARISH)} />
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
                {developerOnlyItems.map((item) => <NavItem key={item.href} item={item} active={isActive(item.href)} />)}
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
            Fusion
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
