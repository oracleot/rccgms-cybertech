"use client"

import Link from "next/link"
import { formatDistanceToNow } from "date-fns"
import {
  Bell,
  ArrowRight,
  CalendarDays,
  ArrowRightLeft,
  Package,
  GraduationCap,
  Check,
  X,
  AlertCircle,
  Sparkles,
} from "lucide-react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { AnimatedList } from "@/components/ui/animated-list"
import { BlurFade } from "@/components/ui/blur-fade"
import type { NotificationItem, NotificationType } from "@/types/notification"

interface NotificationFeedProps {
  notifications: NotificationItem[]
  maxItems?: number
  onMarkAsRead?: (id: string) => void
}

const NOTIFICATION_ICONS: Record<NotificationType, React.ReactNode> = {
  rota_reminder: <CalendarDays className="h-4 w-4" />,
  rota_published: <CalendarDays className="h-4 w-4" />,
  swap_request: <ArrowRightLeft className="h-4 w-4" />,
  swap_accepted: <Check className="h-4 w-4 text-green-600" />,
  swap_approved: <Check className="h-4 w-4 text-green-600" />,
  swap_rejected: <X className="h-4 w-4 text-destructive" />,
  training_assigned: <GraduationCap className="h-4 w-4" />,
  training_completed: <GraduationCap className="h-4 w-4 text-green-600" />,
  equipment_overdue: <Package className="h-4 w-4 text-destructive" />,
}

const NOTIFICATION_COLORS: Record<NotificationType, string> = {
  rota_reminder: "bg-blue-500/10 text-blue-500 border-blue-500/20",
  rota_published: "bg-green-500/10 text-green-500 border-green-500/20",
  swap_request: "bg-amber-500/10 text-amber-500 border-amber-500/20",
  swap_accepted: "bg-green-500/10 text-green-500 border-green-500/20",
  swap_approved: "bg-green-500/10 text-green-500 border-green-500/20",
  swap_rejected: "bg-red-500/10 text-red-500 border-red-500/20",
  training_assigned: "bg-purple-500/10 text-purple-500 border-purple-500/20",
  training_completed: "bg-green-500/10 text-green-500 border-green-500/20",
  equipment_overdue: "bg-red-500/10 text-red-500 border-red-500/20",
}

function NotificationItemComponent({
  notification,
  onMarkAsRead,
}: {
  notification: NotificationItem
  onMarkAsRead?: (id: string) => void
}) {
  return (
    <li
      className={`flex gap-3 rounded-lg border p-3 transition-all cursor-pointer hover:bg-muted/30 group ${
        !notification.isRead 
          ? "bg-gradient-to-r from-violet-500/5 to-transparent border-violet-500/20" 
          : "hover:border-violet-500/20"
      }`}
      onClick={() => onMarkAsRead?.(notification.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          onMarkAsRead?.(notification.id)
        }
      }}
    >
      <div
        className={`flex h-9 w-9 items-center justify-center rounded-xl shrink-0 border ${
          NOTIFICATION_COLORS[notification.type] ||
          "bg-gray-500/10 text-gray-500 border-gray-500/20"
        }`}
      >
        {NOTIFICATION_ICONS[notification.type] || (
          <AlertCircle className="h-4 w-4" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p
            className={`font-medium truncate group-hover:text-violet-500 transition-colors ${
              !notification.isRead ? "" : "text-muted-foreground"
            }`}
          >
            {notification.title}
          </p>
          {!notification.isRead && (
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-500"></span>
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground line-clamp-2">
          {notification.body}
        </p>
        <p className="text-xs text-muted-foreground/70 mt-1">
          {formatDistanceToNow(new Date(notification.createdAt), {
            addSuffix: true,
          })}
        </p>
      </div>
    </li>
  )
}

export function NotificationFeed({
  notifications,
  maxItems = 8,
  onMarkAsRead,
}: NotificationFeedProps) {
  const displayedNotifications = notifications.slice(0, maxItems)
  const unreadCount = notifications.filter((n) => !n.isRead).length

  return (
    <BlurFade delay={0.2} inView>
      <Card className="relative overflow-hidden">
        {unreadCount > 0 && (
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-violet-500/10 to-transparent rounded-full blur-2xl -translate-y-1/2 translate-x-1/2" />
        )}
        <CardHeader className="relative flex flex-row items-center justify-between space-y-0">
          <div>
            <CardTitle className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-violet-500/10">
                <Bell className="h-4 w-4 text-violet-500" />
              </div>
              Notifications
              {unreadCount > 0 && (
                <Badge 
                  variant="destructive" 
                  className="ml-2 bg-violet-500 hover:bg-violet-600 animate-pulse"
                >
                  {unreadCount} new
                </Badge>
              )}
            </CardTitle>
            <CardDescription className="mt-1">
              {notifications.length > 0
                ? "Recent updates and alerts"
                : "No notifications yet"}
            </CardDescription>
          </div>
          {notifications.length > 0 && (
            <Button variant="ghost" size="sm" asChild className="group">
              <Link href="/settings/notifications" className="flex items-center">
                Settings
                <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </Link>
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {displayedNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <div className="relative mb-4">
                <div className="absolute inset-0 animate-pulse rounded-full bg-violet-500/20 blur-xl" />
                <div className="relative p-4 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 border border-violet-500/20">
                  <Sparkles className="h-8 w-8 text-violet-500" />
                </div>
              </div>
              <p className="text-sm font-medium text-muted-foreground">
                You&apos;re all caught up!
              </p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                New notifications will appear here
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[300px] pr-4">
              <AnimatedList delay={100}>
                {displayedNotifications.map((notification) => (
                  <NotificationItemComponent
                    key={notification.id}
                    notification={notification}
                    onMarkAsRead={onMarkAsRead}
                  />
                ))}
              </AnimatedList>
            </ScrollArea>
          )}
          {notifications.length > maxItems && (
            <div className="mt-3 text-center">
              <Button variant="ghost" size="sm" asChild className="group">
                <Link href="/settings" className="flex items-center gap-1">
                  View all {notifications.length} notifications
                  <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
                </Link>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </BlurFade>
  )
}
