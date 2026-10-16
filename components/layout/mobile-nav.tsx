"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  CalendarDays,
  Clapperboard,
  Home,
  MonitorPlay,
  Video,
} from "lucide-react"

import { cn } from "@/lib/utils"
import { ROUTES } from "@/lib/constants"
import { FEATURE_SLUGS } from "@/lib/features/types"

const navItems = [
  {
    title: "Home",
    href: ROUTES.HOME,
    icon: Home,
    feature: FEATURE_SLUGS.DASHBOARD,
  },
  {
    title: "Rota",
    href: ROUTES.ROTA,
    icon: CalendarDays,
    feature: FEATURE_SLUGS.ROTA,
  },
  {
    title: "Meetings",
    href: ROUTES.MEETINGS,
    icon: Video,
    feature: FEATURE_SLUGS.MEETINGS,
  },
  {
    title: "Livestream",
    href: ROUTES.LIVESTREAM,
    icon: MonitorPlay,
    feature: FEATURE_SLUGS.LIVESTREAM,
  },
  {
    title: "Rundown",
    href: ROUTES.RUNDOWN,
    icon: Clapperboard,
    feature: FEATURE_SLUGS.RUNDOWN,
  },
]

interface MobileNavProps {
  enabledFeatures?: string[]
  isDeveloper?: boolean
}

export function MobileNav({ enabledFeatures = [], isDeveloper = false }: MobileNavProps) {
  const pathname = usePathname()

  const isActive = (href: string) => {
    if (href === ROUTES.HOME) {
      return pathname === href
    }
    return pathname.startsWith(href)
  }

  const featureSet = new Set(enabledFeatures)
  const visibleItems = navItems.filter(
    (item) => !item.feature || featureSet.has(item.feature)
  )

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background lg:hidden">
      <div className="flex h-16 items-center justify-around">
        {visibleItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-col items-center justify-center gap-1 px-3 py-2 text-xs transition-colors",
              isActive(item.href)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <item.icon className="h-5 w-5" />
            <span>{item.title}</span>
          </Link>
        ))}
      </div>
    </nav>
  )
}
