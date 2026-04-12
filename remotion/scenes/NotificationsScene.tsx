import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
} from "remotion";
import { theme } from "../styles/theme";
import { AnimatedGrid } from "../components/Card";
import { Card, CardContent } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { fadeIn, slideInFromRight, scaleIn } from "../utils/animations";

const NOTIFICATIONS = [
  {
    type: "assignment",
    title: "New Assignment",
    message: "You've been assigned to Camera Operator for Sunday, Jan 12",
    time: "Just now",
    icon: "📅",
  },
  {
    type: "swap",
    title: "Swap Request",
    message: "Sarah Miller wants to swap shifts with you",
    time: "2 min ago",
    icon: "🔄",
  },
  {
    type: "reminder",
    title: "Reminder",
    message: "You're scheduled for tomorrow's service at 9:00 AM",
    time: "1 hour ago",
    icon: "⏰",
  },
];

export const NotificationsScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation
  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  const headerOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Header animation already defined above

  // Phone mockup animation
  const phoneScale = scaleIn(frame, fps, 10);
  const phoneOpacity = fadeIn(frame, 10, 20);

  // Notifications stagger
  const getNotifOpacity = (index: number) => fadeIn(frame, 30 + index * 20, 15);
  const getNotifX = (index: number) => slideInFromRight(frame, fps, 30 + index * 20, 40);

  // Fade out
  const sceneOpacity = interpolate(
    frame,
    [0, 90, 120],
    [1, 1, 0],
    { extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
        padding: 80,
        opacity: sceneOpacity,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AnimatedGrid frame={frame} />
      {/* Header */}
      <div style={{ opacity: headerOpacity, marginBottom: 48 }}>
        <h2
          style={{
            fontFamily: theme.fontFamily.sans,
            fontSize: 48,
            fontWeight: 700,
            color: theme.colors.foreground,
            margin: 0,
          }}
        >
          Stay Notified
        </h2>
        <p
          style={{
            fontFamily: theme.fontFamily.sans,
            fontSize: 22,
            color: theme.colors.mutedForeground,
            marginTop: 12,
          }}
        >
          Get instant updates on assignments, swaps, and reminders
        </p>
      </div>

      {/* Content */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "center",
          gap: 100,
          flex: 1,
        }}
      >
        {/* Phone Mockup */}
        <div
          style={{
            opacity: phoneOpacity,
            transform: `scale(${phoneScale})`,
          }}
        >
          <div
            style={{
              width: 320,
              height: 640,
              backgroundColor: theme.colors.foreground,
              borderRadius: 40,
              padding: 12,
              boxShadow: theme.shadow.lg,
            }}
          >
            <div
              style={{
                width: "100%",
                height: "100%",
                backgroundColor: theme.colors.background,
                borderRadius: 32,
                overflow: "hidden",
              }}
            >
              {/* Phone Header */}
              <div
                style={{
                  padding: "40px 20px 20px 20px",
                  backgroundColor: theme.colors.primary,
                }}
              >
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 18,
                    fontWeight: 600,
                    color: theme.colors.primaryForeground,
                  }}
                >
                  Fusion
                </div>
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 13,
                    color: "rgba(255,255,255,0.8)",
                    marginTop: 4,
                  }}
                >
                  3 new notifications
                </div>
              </div>

              {/* Notifications */}
              <div style={{ padding: 16 }}>
                {NOTIFICATIONS.map((notif, index) => (
                  <div
                    key={index}
                    style={{
                      display: "flex",
                      gap: 12,
                      padding: 12,
                      backgroundColor:
                        index === 0 ? theme.colors.secondary : "transparent",
                      borderRadius: theme.borderRadius.lg,
                      marginBottom: 8,
                      opacity: getNotifOpacity(index),
                      transform: `translateX(${getNotifX(index)}px)`,
                    }}
                  >
                    <div
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: theme.borderRadius.md,
                        backgroundColor: theme.colors.primary,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                        flexShrink: 0,
                      }}
                    >
                      {notif.icon}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <span
                          style={{
                            fontFamily: theme.fontFamily.sans,
                            fontSize: 13,
                            fontWeight: 600,
                            color: theme.colors.foreground,
                          }}
                        >
                          {notif.title}
                        </span>
                        <span
                          style={{
                            fontFamily: theme.fontFamily.sans,
                            fontSize: 11,
                            color: theme.colors.mutedForeground,
                          }}
                        >
                          {notif.time}
                        </span>
                      </div>
                      <div
                        style={{
                          fontFamily: theme.fontFamily.sans,
                          fontSize: 12,
                          color: theme.colors.mutedForeground,
                          marginTop: 2,
                          lineHeight: 1.4,
                        }}
                      >
                        {notif.message}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Features List */}
        <div style={{ marginTop: 60 }}>
          {[
            { icon: "📧", title: "Email notifications", desc: "Get updates in your inbox" },
            { icon: "🔔", title: "Push notifications", desc: "Instant alerts on your phone" },
            { icon: "📆", title: "Calendar sync", desc: "Add services to your calendar" },
          ].map((feature, index) => (
            <div
              key={index}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 28,
                marginBottom: 48,
                opacity: fadeIn(frame, 50 + index * 15, 15),
              }}
            >
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: theme.borderRadius.lg,
                  backgroundColor: theme.colors.secondary,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 36,
                }}
              >
                {feature.icon}
              </div>
              <div>
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 24,
                    fontWeight: 700,
                    color: theme.colors.foreground,
                  }}
                >
                  {feature.title}
                </div>
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 18,
                    color: theme.colors.mutedForeground,
                    marginTop: 4,
                  }}
                >
                  {feature.desc}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AbsoluteFill>
  );
};
