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

export const SwapRequestScene: React.FC = () => {
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

  // Left card animation
  const leftCardProgress = spring({
    frame: frame - 25,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const leftCardOpacity = interpolate(frame, [25, 50], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Right card animation
  const rightCardProgress = spring({
    frame: frame - 45,
    fps,
    config: { damping: 15, stiffness: 100 },
  });
  const rightCardOpacity = interpolate(frame, [45, 70], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

  // Swap arrows animation
  const arrowsProgress = spring({
    frame: frame - 65,
    fps,
    config: { damping: 10, stiffness: 150 },
  });
  const arrowsOpacity = interpolate(frame, [65, 85], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  
  // Pulsing arrow animation
  const arrowPulse = 1 + Math.sin(frame * 0.1) * 0.05;

  // Request button animation
  const buttonOpacity = interpolate(frame, [100, 120], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const buttonProgress = spring({
    frame: frame - 100,
    fps,
    config: { damping: 12, stiffness: 100 },
  });

  // Button click animation
  const buttonClicked = frame > 150;
  const buttonScale = buttonClicked
    ? interpolate(frame, [150, 158, 168], [1, 0.92, 1], {
        extrapolateRight: "clamp",
      })
    : interpolate(buttonProgress, [0, 1], [0.9, 1]);

  // Success message animation
  const successOpacity = interpolate(frame, [170, 195], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const successProgress = spring({
    frame: frame - 170,
    fps,
    config: { damping: 12, stiffness: 150 },
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
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
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
            Request a Swap
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
          Can't make it? Request to swap with another volunteer
        </p>
      </div>

      {/* Swap Interface */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 60,
          flex: 1,
          marginTop: 20,
        }}
      >
        {/* Your Assignment */}
        <div
          style={{
            opacity: leftCardOpacity,
            transform: `translateX(${interpolate(leftCardProgress, [0, 1], [-60, 0])}px)`,
          }}
        >
          <Card
            style={{
              width: 420,
              boxShadow: "0 8px 32px -8px rgba(0,0,0,0.1)",
            }}
          >
            <CardHeader style={{ padding: "24px 28px 12px 28px" }}>
              <div
                style={{
                  fontFamily: theme.fontFamily.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.colors.mutedForeground,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Your Assignment
              </div>
            </CardHeader>
            <CardContent style={{ padding: "12px 28px 28px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <Avatar initials="JD" size={72} />
                <div>
                  <div
                    style={{
                      fontFamily: theme.fontFamily.sans,
                      fontSize: 24,
                      fontWeight: 700,
                      color: theme.colors.foreground,
                    }}
                  >
                    John Doe
                  </div>
                  <div
                    style={{
                      fontFamily: theme.fontFamily.sans,
                      fontSize: 18,
                      color: theme.colors.mutedForeground,
                      marginTop: 4,
                    }}
                  >
                    Camera Operator
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 20,
                  padding: 18,
                  backgroundColor: theme.colors.secondary,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 18,
                    fontWeight: 600,
                    color: theme.colors.foreground,
                  }}
                >
                  Sunday, Jan 12
                </div>
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 16,
                    color: theme.colors.mutedForeground,
                    marginTop: 4,
                  }}
                >
                  Morning Service • 9:00 AM
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Swap Arrows */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 20,
            opacity: arrowsOpacity,
            transform: `scale(${interpolate(arrowsProgress, [0, 1], [0.5, 1]) * arrowPulse})`,
          }}
        >
          <svg
            width="100"
            height="50"
            viewBox="0 0 100 50"
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M10 25 L90 25" />
            <polyline points="70 12 90 25 70 38" />
          </svg>
          <svg
            width="100"
            height="50"
            viewBox="0 0 100 50"
            fill="none"
            stroke={theme.colors.primary}
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M90 25 L10 25" />
            <polyline points="30 12 10 25 30 38" />
          </svg>
        </div>

        {/* Swap Target */}
        <div
          style={{
            opacity: rightCardOpacity,
            transform: `translateX(${interpolate(rightCardProgress, [0, 1], [60, 0])}px)`,
          }}
        >
          <Card
            style={{
              width: 420,
              boxShadow: "0 8px 32px -8px rgba(0,0,0,0.1)",
            }}
          >
            <CardHeader style={{ padding: "24px 28px 12px 28px" }}>
              <div
                style={{
                  fontFamily: theme.fontFamily.sans,
                  fontSize: 14,
                  fontWeight: 600,
                  color: theme.colors.mutedForeground,
                  textTransform: "uppercase",
                  letterSpacing: 1.5,
                }}
              >
                Swap With
              </div>
            </CardHeader>
            <CardContent style={{ padding: "12px 28px 28px 28px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <Avatar
                  initials="SM"
                  size={72}
                  backgroundColor="hsl(221 83% 53%)"
                />
                <div>
                  <div
                    style={{
                      fontFamily: theme.fontFamily.sans,
                      fontSize: 24,
                      fontWeight: 700,
                      color: theme.colors.foreground,
                    }}
                  >
                    Sarah Miller
                  </div>
                  <div
                    style={{
                      fontFamily: theme.fontFamily.sans,
                      fontSize: 18,
                      color: theme.colors.mutedForeground,
                      marginTop: 4,
                    }}
                  >
                    Camera Operator
                  </div>
                </div>
              </div>
              <div
                style={{
                  marginTop: 20,
                  padding: 18,
                  backgroundColor: theme.colors.secondary,
                  borderRadius: theme.borderRadius.md,
                  border: `1px solid ${theme.colors.border}`,
                }}
              >
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 18,
                    fontWeight: 600,
                    color: theme.colors.foreground,
                  }}
                >
                  Sunday, Jan 19
                </div>
                <div
                  style={{
                    fontFamily: theme.fontFamily.sans,
                    fontSize: 16,
                    color: theme.colors.mutedForeground,
                    marginTop: 4,
                  }}
                >
                  Morning Service • 9:00 AM
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Request Button */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          marginTop: 48,
          opacity: buttonOpacity,
        }}
      >
        <div style={{ transform: `scale(${buttonScale})` }}>
          <Button
            size="lg"
            style={{
              fontSize: 20,
              padding: "18px 48px",
              background: buttonClicked
                ? theme.colors.success
                : `linear-gradient(135deg, ${theme.colors.primary} 0%, hsl(280 83% 45%) 100%)`,
              boxShadow: buttonClicked
                ? `0 8px 24px -8px ${theme.colors.success}`
                : `0 8px 24px -8px ${theme.colors.primary}`,
            }}
          >
            {buttonClicked ? "✓ Swap Requested!" : "Request Swap"}
          </Button>
        </div>
      </div>

      {/* Success Notification */}
      {frame > 170 && (
        <div
          style={{
            position: "absolute",
            top: 80,
            right: 80,
            opacity: successOpacity,
            transform: `scale(${interpolate(successProgress, [0, 1], [0.8, 1])}) translateY(${interpolate(successProgress, [0, 1], [-20, 0])}px)`,
          }}
        >
          <Card
            style={{
              backgroundColor: "hsl(142 76% 96%)",
              border: `2px solid ${theme.colors.success}`,
              boxShadow: `0 8px 32px -8px ${theme.colors.success}40`,
            }}
          >
            <CardContent style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: theme.borderRadius.full,
                    backgroundColor: theme.colors.success,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke={theme.colors.successForeground}
                    strokeWidth="3"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </div>
                <div>
                  <div
                    style={{
                      fontFamily: theme.fontFamily.sans,
                      fontSize: 17,
                      fontWeight: 700,
                      color: theme.colors.success,
                    }}
                  >
                    Swap Request Sent!
                  </div>
                  <div
                    style={{
                      fontFamily: theme.fontFamily.sans,
                      fontSize: 14,
                      color: theme.colors.mutedForeground,
                      marginTop: 2,
                    }}
                  >
                    Sarah will be notified via email
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </AbsoluteFill>
  );
};
