import React from "react";
import {
  AbsoluteFill,
  useCurrentFrame,
  useVideoConfig,
  interpolate,
  spring,
  Easing,
} from "remotion";
import { theme } from "../styles/theme";
import { AnimatedGrid } from "../components/Card";
import { Calendar } from "../components/Calendar";
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Badge } from "../components/Badge";

export const CalendarScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // Header animation with stagger
  const headerProgress = spring({
    frame,
    fps,
    config: { damping: 15, stiffness: 80 },
  });
  const headerOpacity = interpolate(frame, [0, 25], [0, 1], {
    extrapolateRight: "clamp",
  });

  // Calendar slide in
  const calendarProgress = spring({
    frame: frame - 20,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const calendarOpacity = interpolate(frame, [20, 45], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calendarX = interpolate(calendarProgress, [0, 1], [-80, 0]);

  // Sidebar animation
  const sidebarProgress = spring({
    frame: frame - 40,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const sidebarOpacity = interpolate(frame, [40, 65], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const sidebarX = interpolate(sidebarProgress, [0, 1], [80, 0]);

  // Service items staggered animation
  const getServiceItemAnim = (index: number) => {
    const delay = 60 + index * 15;
    return {
      opacity: interpolate(frame, [delay, delay + 20], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      y: interpolate(
        spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 150 },
        }),
        [0, 1],
        [20, 0]
      ),
    };
  };

  // Highlight dates progressively (slower for longer scene)
  const highlightDate = Math.floor(
    interpolate(frame, [80, 180], [5, 19], {
      extrapolateLeft: "clamp",
      extrapolateRight: "clamp",
    })
  );

  // Service dates (Sundays in January 2026)
  const serviceDates = [4, 5, 11, 12, 18, 19, 25, 26];

  // Feature callout
  const calloutOpacity = interpolate(frame, [120, 145], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const calloutProgress = spring({
    frame: frame - 120,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: theme.colors.background,
        padding: 80,
        display: "flex",
        flexDirection: "column",
      }}
    >
      <AnimatedGrid frame={frame} />
      {/* Header */}
      <div
        style={{
          opacity: headerOpacity,
          transform: `translateY(${interpolate(headerProgress, [0, 1], [30, 0])}px)`,
          marginBottom: 48,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            marginBottom: 12,
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: theme.borderRadius.lg,
              background: `linear-gradient(135deg, ${theme.colors.primary} 0%, hsl(280 83% 45%) 100%)`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke={theme.colors.primaryForeground}
              strokeWidth="2"
            >
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </div>
          <h2
            style={{
              fontFamily: theme.fontFamily.sans,
              fontSize: 48,
              fontWeight: 700,
              color: theme.colors.foreground,
              margin: 0,
            }}
          >
            View Your Schedule
          </h2>
        </div>
        <p
          style={{
            fontFamily: theme.fontFamily.sans,
            fontSize: 22,
            color: theme.colors.mutedForeground,
            marginLeft: 64,
          }}
        >
          See all upcoming services and your assignments at a glance
        </p>
      </div>

      {/* Main Content */}
      <div style={{ display: "flex", gap: 60, flex: 1 }}>
        {/* Calendar */}
        <div
          style={{
            opacity: calendarOpacity,
            transform: `translateX(${calendarX}px)`,
            flex: 1,
          }}
        >
          <Calendar
            month="January 2026"
            selectedDates={serviceDates}
            highlightDate={highlightDate}
            style={{ 
              width: "100%", 
              padding: 32,
              boxShadow: "0 8px 32px -8px rgba(0,0,0,0.1)",
            }}
          />
        </div>

        {/* Upcoming Services Sidebar */}
        <div
          style={{
            width: 480,
            opacity: sidebarOpacity,
            transform: `translateX(${sidebarX}px)`,
          }}
        >
          <Card style={{ boxShadow: "0 8px 32px -8px rgba(0,0,0,0.1)" }}>
            <CardHeader style={{ padding: "28px 28px 16px 28px" }}>
              <CardTitle style={{ fontSize: 24 }}>Upcoming Services</CardTitle>
            </CardHeader>
            <CardContent style={{ padding: "16px 28px 28px 28px" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {[
                  { date: "Sun, Jan 5", service: "Morning Service", time: "9:00 AM" },
                  { date: "Sun, Jan 5", service: "Evening Service", time: "6:00 PM" },
                  { date: "Sun, Jan 12", service: "Morning Service", time: "9:00 AM" },
                ].map((item, i) => {
                  const anim = getServiceItemAnim(i);
                  return (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: 18,
                        backgroundColor: theme.colors.secondary,
                        borderRadius: theme.borderRadius.md,
                        opacity: anim.opacity,
                        transform: `translateY(${anim.y}px)`,
                        border: `1px solid ${theme.colors.border}`,
                      }}
                    >
                      <div>
                        <div
                          style={{
                            fontFamily: theme.fontFamily.sans,
                            fontSize: 18,
                            fontWeight: 600,
                            color: theme.colors.foreground,
                          }}
                        >
                          {item.service}
                        </div>
                        <div
                          style={{
                            fontFamily: theme.fontFamily.sans,
                            fontSize: 15,
                            color: theme.colors.mutedForeground,
                            marginTop: 4,
                          }}
                        >
                          {item.date} at {item.time}
                        </div>
                      </div>
                      <Badge variant="success" style={{ fontSize: 14, padding: "6px 14px" }}>
                        Assigned
                      </Badge>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Feature Callout */}
      <div
        style={{
          marginTop: 40,
          display: "flex",
          alignItems: "center",
          gap: 16,
          padding: 24,
          backgroundColor: theme.colors.secondary,
          borderRadius: theme.borderRadius.lg,
          border: `1px solid ${theme.colors.border}`,
          opacity: calloutOpacity,
          transform: `translateY(${interpolate(calloutProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: theme.borderRadius.full,
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, hsl(280 83% 45%) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke={theme.colors.primaryForeground}
            strokeWidth="2.5"
          >
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <span
          style={{
            fontFamily: theme.fontFamily.sans,
            fontSize: 20,
            color: theme.colors.foreground,
          }}
        >
          Click any date to see service details and your assigned positions
        </span>
      </div>
    </AbsoluteFill>
  );
};
