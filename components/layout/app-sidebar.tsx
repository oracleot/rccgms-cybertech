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
} from "lucide-react"

import { ROUTES } from "@/lib/constants"
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
    title: "Team",
    href: ROUTES.TEAM,
    icon: Users,
  },
  {
    title: "Settings",
    href: ROUTES.SETTINGS,
    icon: Settings,
  },
]

interface AppSidebarProps {
  userRole?: "admin" | "leader" | "volunteer"
}

export function AppSidebar({ userRole = "volunteer" }: AppSidebarProps) {
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
        <div className="flex items-center gap-2 px-2 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <MonitorPlay className="h-4 w-4" />
          </div>
          <span className="font-semibold">Cyber Tech</span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.href}>
                  <SidebarMenuButton
                    asChild
                    isActive={isActive(item.href)}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {(userRole === "admin" || userRole === "leader") && (
          <SidebarGroup>
            <SidebarGroupLabel>Admin</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {adminItems.map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive(item.href)}
                    >
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
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
        <div className="px-2 py-4">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} RCCG Morning Star
          </p>
        </div>
      </SidebarFooter>
    </Sidebar>
  )
}
