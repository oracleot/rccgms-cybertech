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
import { Card, CardHeader, CardTitle, CardContent } from "../components/Card";
import { Badge } from "../components/Badge";
import { Avatar } from "../components/Avatar";
import { Button } from "../components/Button";

const POSITIONS = [
  { id: 1, name: "Camera Operator", icon: "🎥", assigned: null },
  { id: 2, name: "Sound Engineer", icon: "🎧", assigned: null },
  { id: 3, name: "Livestream Director", icon: "📺", assigned: null },
  { id: 4, name: "Graphics Operator", icon: "🖥️", assigned: null },
];

const MEMBERS = [
  { initials: "JD", name: "John Doe", color: "hsl(262 83% 58%)" },
  { initials: "SM", name: "Sarah Miller", color: "hsl(221 83% 53%)" },
  { initials: "MJ", name: "Mike Johnson", color: "hsl(142 76% 36%)" },
  { initials: "AW", name: "Amy Wilson", color: "hsl(25 95% 53%)" },
];

export const AssignmentScene: React.FC = () => {
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

  // Service badge animation
  const badgeOpacity = interpolate(frame, [15, 35], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const badgeProgress = spring({
    frame: frame - 15,
    fps,
    config: { damping: 12, stiffness: 150 },
  });

  // Cards stagger animation
  const getCardAnimation = (index: number) => {
    const delay = 30 + index * 18;
    const progress = spring({
      frame: frame - delay,
      fps,
      config: { damping: 12, stiffness: 100 },
    });
    return {
      opacity: interpolate(frame, [delay, delay + 25], [0, 1], {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
      }),
      y: interpolate(progress, [0, 1], [40, 0]),
      scale: interpolate(progress, [0, 1], [0.95, 1]),
    };
  };

  // Assignment animation - members appear with more time
  const assignmentProgress = interpolate(frame, [120, 220], [0, 4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Tip animation
  const tipOpacity = interpolate(frame, [200, 230], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const tipProgress = spring({
    frame: frame - 200,
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
          marginBottom: 40,
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
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="8.5" cy="7" r="4" />
              <line x1="20" y1="8" x2="20" y2="14" />
              <line x1="23" y1="11" x2="17" y2="11" />
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
            Assign Members to Positions
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
          Drag and drop members or select from the dropdown
        </p>
      </div>

      {/* Service Info */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 20,
          marginBottom: 48,
          opacity: badgeOpacity,
          transform: `translateX(${interpolate(badgeProgress, [0, 1], [-20, 0])}px)`,
        }}
      >
        <Badge
          style={{
            fontSize: 16,
            padding: "10px 20px",
            background: `linear-gradient(135deg, ${theme.colors.primary} 0%, hsl(280 83% 45%) 100%)`,
          }}
        >
          Sunday Morning Service
        </Badge>
        <span
          style={{
            fontFamily: theme.fontFamily.sans,
            fontSize: 20,
            color: theme.colors.mutedForeground,
          }}
        >
          January 5, 2026 • 9:00 AM
        </span>
      </div>

      {/* Positions Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(2, 1fr)",
          gap: 32,
          flex: 1,
        }}
      >
        {POSITIONS.map((position, index) => {
          const isAssigned = assignmentProgress > index;
          const member = MEMBERS[index];
          const cardAnim = getCardAnimation(index);
          
          // Individual assignment animation
          const assignDelay = 120 + index * 25;
          const assignOpacity = interpolate(
            frame,
            [assignDelay, assignDelay + 20],
            [0, 1],
            { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
          );
          const assignProgress = spring({
            frame: frame - assignDelay,
            fps,
            config: { damping: 12, stiffness: 150 },
          });

          return (
            <div
              key={position.id}
              style={{
                opacity: cardAnim.opacity,
                transform: `translateY(${cardAnim.y}px) scale(${cardAnim.scale})`,
              }}
            >
              <Card
                style={{
                  border: isAssigned
                    ? `3px solid ${theme.colors.primary}`
                    : `1px solid ${theme.colors.border}`,
                  height: "100%",
                  boxShadow: isAssigned
                    ? `0 8px 32px -8px ${theme.colors.primary}40`
                    : "0 4px 16px -4px rgba(0,0,0,0.1)",
                  transition: "box-shadow 0.3s ease",
                }}
              >
                <CardContent style={{ padding: 28 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <span style={{ fontSize: 44 }}>{position.icon}</span>
                      <div>
                        <div
                          style={{
                            fontFamily: theme.fontFamily.sans,
                            fontSize: 22,
                            fontWeight: 600,
                            color: theme.colors.foreground,
                          }}
                        >
                          {position.name}
                        </div>
                        {isAssigned ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 10,
                              marginTop: 10,
                              opacity: assignOpacity,
                              transform: `translateX(${interpolate(assignProgress, [0, 1], [-15, 0])}px)`,
                            }}
                          >
                            <Avatar
                              initials={member.initials}
                              size={36}
                              backgroundColor={member.color}
                            />
                            <span
                              style={{
                                fontFamily: theme.fontFamily.sans,
                                fontSize: 18,
                                color: theme.colors.foreground,
                                fontWeight: 500,
                              }}
                            >
                              {member.name}
                            </span>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontFamily: theme.fontFamily.sans,
                              fontSize: 18,
                              color: theme.colors.mutedForeground,
                              marginTop: 10,
                              display: "block",
                            }}
                          >
                            Unassigned
                          </span>
                        )}
                      </div>
                    </div>
                    {isAssigned ? (
                      <Badge
                        variant="success"
                        style={{
                          opacity: assignOpacity,
                          fontSize: 15,
                          padding: "8px 16px",
                          transform: `scale(${interpolate(assignProgress, [0, 1], [0.8, 1])})`,
                        }}
                      >
                        Assigned
                      </Badge>
                    ) : (
                      <Button variant="outline" size="md">
                        Assign
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Tip */}
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
          opacity: tipOpacity,
          transform: `translateY(${interpolate(tipProgress, [0, 1], [20, 0])}px)`,
        }}
      >
        <div
          style={{
            width: 52,
            height: 52,
            borderRadius: theme.borderRadius.full,
            background: `linear-gradient(135deg, hsl(45 93% 47%) 0%, hsl(35 93% 50%) 100%)`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 26,
            flexShrink: 0,
          }}
        >
          💡
        </div>
        <span
          style={{
            fontFamily: theme.fontFamily.sans,
            fontSize: 20,
            color: theme.colors.foreground,
          }}
        >
          Leaders and Admins can assign members based on availability and skills
        </span>
      </div>
    </AbsoluteFill>
  );
};
