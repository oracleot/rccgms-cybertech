import React from "react";
import { theme } from "../styles/theme";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "default" | "secondary" | "outline" | "success" | "destructive";
  style?: React.CSSProperties;
}

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = "default",
  style,
}) => {
  const getVariantStyles = (): React.CSSProperties => {
    switch (variant) {
      case "secondary":
        return {
          backgroundColor: theme.colors.secondary,
          color: theme.colors.secondaryForeground,
        };
      case "outline":
        return {
          backgroundColor: "transparent",
          color: theme.colors.foreground,
          border: `1px solid ${theme.colors.border}`,
        };
      case "success":
        return {
          backgroundColor: theme.colors.success,
          color: theme.colors.successForeground,
        };
      case "destructive":
        return {
          backgroundColor: theme.colors.destructive,
          color: theme.colors.destructiveForeground,
        };
      default:
        return {
          backgroundColor: theme.colors.primary,
          color: theme.colors.primaryForeground,
        };
    }
  };

  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: theme.borderRadius.full,
        fontSize: 12,
        fontWeight: 500,
        fontFamily: theme.fontFamily.sans,
        ...getVariantStyles(),
        ...style,
      }}
    >
      {children}
    </span>
  );
};
