import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AuthSession } from "@/services/auth/sessionStorage";

export function HomeHeader({
  session,
  onOpenProfile,
  onOpenLocalBackups,
  onOpenLogin,
}: {
  session: AuthSession | null;
  onOpenProfile: () => void;
  onOpenLocalBackups: () => void;
  onOpenLogin: () => void;
}) {
  return (
    <View className="px-4 pb-4 pt-2">
      <View className="flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View className="mr-3 h-11 w-11 items-center justify-center rounded-2xl border border-[#1e3a5f] bg-[#102848]">
            <Ionicons name="shield-checkmark" size={22} color="#38bdf8" />
          </View>
          <View>
            <Text className="text-lg font-bold text-[#e5e7eb]">DataGuard</Text>
            <Text className="text-xs text-[#94a3b8]">
              Fast local backup manager
            </Text>
          </View>
        </View>

        {session ? (
          <Pressable
            onPress={onOpenProfile}
            className="h-12 w-12 items-center justify-center rounded-full border border-[#1d3354] bg-[#1a2942] active:opacity-80"
          >
            <Ionicons name="person" size={22} color="#e2e8f0" />
          </Pressable>
        ) : (
          <View className="flex-row items-center gap-2">
            <Pressable
              onPress={onOpenLocalBackups}
              className="flex-row items-center gap-1.5 rounded-full border border-[#1d3354] bg-[#1a2942] px-3 py-2.5 active:opacity-80"
            >
              <Ionicons name="folder-open-outline" size={18} color="#e2e8f0" />
              <Text className="text-sm font-semibold text-[#e2e8f0]">
                Local backups
              </Text>
            </Pressable>
            <Pressable
              onPress={onOpenLogin}
              className="items-center justify-center rounded-full border border-[#1d3354] bg-[#1a2942] px-4 py-2.5 active:opacity-80"
            >
              <Text className="text-sm font-semibold text-[#e2e8f0]">
                Login
              </Text>
            </Pressable>
          </View>
        )}
      </View>
    </View>
  );
}
