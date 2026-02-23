import type { ReactNode } from "react";
import { View, type StyleProp, type ViewStyle } from "react-native";
import { BlurView } from "expo-blur";
import { cn } from "@/utils/cn";

export const GLASS_BLUR_INTENSITY = 68;
export const GLASS_OVERLAY_COLOR = "rgba(8, 15, 29, 0.46)";

export function GlassPanel({
  children,
  className,
  contentStyle,
  intensity = GLASS_BLUR_INTENSITY,
  overlayColor = GLASS_OVERLAY_COLOR,
  tint = "dark",
}: {
  children: ReactNode;
  className?: string;
  contentStyle?: StyleProp<ViewStyle>;
  intensity?: number;
  overlayColor?: string;
  tint?: "light" | "dark" | "default";
}) {
  return (
    <View className={cn("overflow-hidden border border-white/20", className)}>
      <BlurView
        intensity={intensity}
        tint={tint}
        experimentalBlurMethod="dimezisBlurView"
        style={[{ backgroundColor: overlayColor }, contentStyle]}
      >
        {children}
      </BlurView>
    </View>
  );
}
