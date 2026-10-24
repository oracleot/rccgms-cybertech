"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Bell,
  BookOpen,
  Brain,
  Building2,
  CalendarDays,
  Church,
  Clapperboard,
  Code2,
  GraduationCap,
  Home,
  Music2,
  Palette,
  Radio,
  Settings,
  Shield,
  Users,
  Video,
} from "lucide-react"

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
import { ROUTES } from "@/lib/constants"
import { FEATURE_SLUGS } from "@/lib/features/types"
import { cn } from "@/lib/utils"

interface NavigationItem {
  title: string
  href: string
  icon: React.ElementType
  feature?: string
}

const overviewItems: NavigationItem[] = [
  { title: "Home", href: ROUTES.HOME, icon: Home, feature: FEATURE_SLUGS.DASHBOARD },
]

const planningItems: NavigationItem[] = [
  { title: "Rota", href: ROUTES.ROTA, icon: CalendarDays, feature: FEATURE_SLUGS.ROTA },
  { title: "Meetings", href: ROUTES.MEETINGS, icon: Video, feature: FEATURE_SLUGS.MEETINGS },
  { title: "Rundown", href: ROUTES.RUNDOWN, icon: Clapperboard, feature: FEATURE_SLUGS.RUNDOWN },
]

const productionItems: NavigationItem[] = [
  { title: "Bible Studio", href: ROUTES.BIBLE_STUDIO, icon: BookOpen, feature: FEATURE_SLUGS.BIBLE },
  { title: "Worship Library", href: ROUTES.WORSHIP_LIBRARY, icon: Music2, feature: FEATURE_SLUGS.WORSHIP_LIBRARY },
  { title: "Livestream", href: ROUTES.LIVESTREAM, icon: Radio, feature: FEATURE_SLUGS.LIVESTREAM },
]

const growthItems: NavigationItem[] = [
  { title: "Designs", href: ROUTES.DESIGNS, icon: Palette, feature: FEATURE_SLUGS.DESIGNS },
  { title: "Training", href: ROUTES.TRAINING, icon: GraduationCap, feature: FEATURE_SLUGS.TRAINING },
]

const managementItems: NavigationItem[] = [
  { title: "Admin", href: ROUTES.ADMIN, icon: Shield },
  { title: "Users", href: ROUTES.ADMIN_USERS, icon: Users },
  { title: "Departments", href: ROUTES.ADMIN_DEPARTMENTS, icon: Building2 },
  { title: "Notifications", href: ROUTES.ADMIN_NOTIFICATIONS, icon: Bell },
  { title: "Parish", href: ROUTES.ADMIN_PARISH, icon: Church },
]

const developerItems: NavigationItem[] = [
  { title: "Control Center", href: ROUTES.ADMIN_DEVELOPER_TOOLS, icon: Code2 },
  { title: "ML Training", href: ROUTES.ADMIN_ML_TRAINING, icon: Brain },
]

const parishItems: NavigationItem[] = [
  { title: "Parish", href: ROUTES.ADMIN_PARISH, icon: Church },
]

function routeIsActive(pathname: string, href: string) {
  return href === ROUTES.HOME ? pathname === href : pathname.startsWith(href)
}

function NavigationItemRow({ item, pathname }: { item: NavigationItem; pathname: string }) {
  const active = routeIsActive(pathname, item.href)

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        asChild
        isActive={active}
        tooltip={item.title}
        className={cn(
          "relative h-9 rounded-lg px-3 transition-colors duration-150",
          "hover:bg-violet-50 hover:text-violet-800 dark:hover:bg-violet-950/40 dark:hover:text-violet-200",
          active &&
            "bg-violet-100 font-medium text-violet-800 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-violet-600 dark:bg-violet-950/55 dark:text-violet-200"
        )}
      >
        <Link href={item.href}>
          <item.icon className={cn("size-4", active && "text-violet-600 dark:text-violet-300")} />
          <span>{item.title}</span>
        </Link>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

function NavigationGroup({
  label,
  items,
  pathname,
}: {
  label: string
  items: NavigationItem[]
  pathname: string
}) {
  if (items.length === 0) return null

  return (
    <SidebarGroup className="py-2">
      <SidebarGroupLabel className="px-3 text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-muted-foreground/80">
        {label}
      </SidebarGroupLabel>
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <NavigationItemRow key={item.href} item={item} pathname={pathname} />
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

interface AppSidebarProps {
  userRole?: "admin" | "lead_developer" | "developer" | "leader" | "member"
  parishRole?: string | null
  enabledFeatures?: string[]
}

export function AppSidebar({ userRole = "member", parishRole, enabledFeatures = [] }: AppSidebarProps) {
  const pathname = usePathname()
  const isDeveloper = userRole === "lead_developer" || userRole === "developer"
  const isAdmin = userRole === "admin" || userRole === "leader"
  const isParishAdmin = parishRole === "parish_admin"
  const featureSet = new Set(enabledFeatures)
  const enabled = (items: NavigationItem[]) => items.filter((item) => !item.feature || featureSet.has(item.feature))

  return (
    <Sidebar collapsible="icon" className="border-r border-border/70">
      <SidebarHeader className="border-b border-border/70 p-3">
        <Link
          href={ROUTES.HOME}
          className="flex min-h-10 items-center gap-3 rounded-lg px-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-500"
        >
          <Image src="/icons/icon-192.png" alt="Fusion" width={36} height={36} className="size-9 shrink-0 rounded-xl" />
          <span className="min-w-0 group-data-[collapsible=icon]:hidden">
            <span className="block text-sm font-semibold leading-tight">Fusion</span>
            <span className="block truncate text-xs text-muted-foreground">Service workspace</span>
          </span>
        </Link>
      </SidebarHeader>

      <SidebarContent className="py-2">
        <NavigationGroup label="Overview" items={enabled(overviewItems)} pathname={pathname} />
        <NavigationGroup label="Plan & coordinate" items={enabled(planningItems)} pathname={pathname} />
        <NavigationGroup label="Present & broadcast" items={enabled(productionItems)} pathname={pathname} />
        <NavigationGroup label="Grow & create" items={enabled(growthItems)} pathname={pathname} />
        {(isAdmin || isDeveloper) && <NavigationGroup label="Manage" items={managementItems} pathname={pathname} />}
        {isParishAdmin && !isAdmin && !isDeveloper && (
          <NavigationGroup label="Parish" items={parishItems} pathname={pathname} />
        )}
        {isDeveloper && <NavigationGroup label="Developer" items={developerItems} pathname={pathname} />}
      </SidebarContent>

      <SidebarFooter className="border-t border-border/70 p-3">
        <SidebarMenu>
          <NavigationItemRow
            item={{ title: "Settings", href: ROUTES.SETTINGS, icon: Settings }}
            pathname={pathname}
          />
        </SidebarMenu>
        <p
          className="px-3 pt-2 text-[0.68rem] text-muted-foreground group-data-[collapsible=icon]:hidden"
          suppressHydrationWarning
        >
          © {new Date().getFullYear()} RCCG Morning Star
        </p>
      </SidebarFooter>
    </Sidebar>
  )
}
