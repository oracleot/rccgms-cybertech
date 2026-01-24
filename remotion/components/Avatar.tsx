import React from "react";
import { theme } from "../styles/theme";

interface AvatarProps {
  initials: string;
  size?: number;
  backgroundColor?: string;
  style?: React.CSSProperties;
}

export const Avatar: React.FC<AvatarProps> = ({
  initials,
  size = 40,
  backgroundColor,
  style,
}) => {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: theme.borderRadius.full,
        backgroundColor: backgroundColor || theme.colors.primary,
        color: theme.colors.primaryForeground,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: theme.fontFamily.sans,
        fontSize: size * 0.4,
        fontWeight: 600,
        ...style,
      }}
    >
      {initials}
    </div>
  );
};
