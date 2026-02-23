import { Pressable, Text, View } from "react-native";
import type { AuthSession } from "@/services/auth/sessionStorage";
import { GlassPanel } from "@/components/GlassPanel";

export function SessionStatusCard({
  session,
  onSignOut,
  onCloudLogin,
}: {
  session: AuthSession | null;
  onSignOut: () => void;
  onCloudLogin: () => void;
}) {
  return (
    <GlassPanel
      className="mb-4 rounded-2xl border-[#1f2937]"
      contentStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
    >
      <View className="flex-row items-center justify-between">
        <View className="flex-1 pr-3">
          <Text className="text-[#e2e8f0] text-sm font-semibold">
            {session ? `Logged in as ${session.user.name}` : "Not logged in"}
          </Text>
          <Text className="text-[#94a3b8] text-xs mt-1">
            {session
              ? "Cloud backup is ready to use."
              : "Login is required for cloud uploads."}
          </Text>
        </View>
        {session ? (
          <Pressable
            onPress={onSignOut}
            className="rounded-xl bg-[#ef4444] px-3 py-2 active:opacity-80"
          >
            <Text className="text-white text-xs font-semibold">Sign Out</Text>
          </Pressable>
        ) : (
          <Pressable
            onPress={onCloudLogin}
            className="rounded-xl bg-[#2563eb] px-3 py-2 active:opacity-80"
          >
            <Text className="text-white text-xs font-semibold">Login</Text>
          </Pressable>
        )}
      </View>
    </GlassPanel>
  );
}
