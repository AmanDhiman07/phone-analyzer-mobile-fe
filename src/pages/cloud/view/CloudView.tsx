import { Pressable, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassPanel } from "@/components/GlassPanel";
import type { CloudViewModel } from "../hooks/useCloudScreen";

export function CloudView({
  session,
  onOpenCloudHistory,
  onOpenLogin,
  onOpenHome,
}: CloudViewModel) {
  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      <View className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#0d2a4d]/50" />
      <View className="absolute -left-24 bottom-24 h-72 w-72 rounded-full bg-[#0f3a37]/40" />

      <View className="flex-1 justify-center px-5">
        <GlassPanel
          className="rounded-3xl border-[#1f2937]"
          contentStyle={{ padding: 20 }}
        >
          <View className="mb-4 flex-row items-center">
            <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-[#132e4f]">
              <Ionicons name="cloud-upload-outline" size={24} color="#7dd3fc" />
            </View>
            <View className="flex-1">
              <Text className="text-xl font-bold text-white">
                Cloud Workspace
              </Text>
              <Text className="mt-1 text-xs text-[#94a3b8]">
                Manage cloud backups and VCF uploads.
              </Text>
            </View>
          </View>

          <GlassPanel
            className="mb-4 rounded-2xl border-[#223044]"
            contentStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
          >
            <Text className="text-xs text-[#cbd5e1]">
              Status:{" "}
              {session ? `Logged in as ${session.user.name}` : "Not logged in"}
            </Text>
          </GlassPanel>

          <Pressable
            onPress={onOpenCloudHistory}
            className="mb-3 rounded-xl bg-[#2563eb] py-3.5 active:opacity-80"
          >
            <Text className="text-center font-bold text-white">
              Open Cloud Backups
            </Text>
          </Pressable>

          {!session ? (
            <Pressable
              onPress={onOpenLogin}
              className="mb-3 rounded-xl border border-[#334155] bg-[#111827] py-3.5 active:opacity-80"
            >
              <Text className="text-center font-semibold text-[#e5e7eb]">
                Login
              </Text>
            </Pressable>
          ) : null}

          <Pressable
            onPress={onOpenHome}
            className="rounded-xl border border-[#334155] bg-[#111827] py-3.5 active:opacity-80"
          >
            <Text className="text-center font-semibold text-[#e5e7eb]">
              Back to Home
            </Text>
          </Pressable>
        </GlassPanel>
      </View>
    </SafeAreaView>
  );
}
