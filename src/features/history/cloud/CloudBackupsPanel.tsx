import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { AuthSession } from "@/services/auth/sessionStorage";
import { GlassPanel } from "@/components/GlassPanel";

export function CloudBackupsPanel({
  session,
  onCloudLogin,
  onAddVcf,
}: {
  session: AuthSession | null;
  onCloudLogin: () => void;
  onAddVcf: () => void;
}) {
  return (
    <GlassPanel
      className="rounded-2xl border-[#1f2937]"
      contentStyle={{ paddingHorizontal: 16, paddingVertical: 16 }}
    >
      <View className="flex-row items-center mb-3">
        <View className="w-11 h-11 rounded-xl bg-[#132e4f] items-center justify-center mr-3">
          <Ionicons name="cloud-upload-outline" size={22} color="#7dd3fc" />
        </View>
        <View className="flex-1">
          <Text className="text-[#e2e8f0] text-base font-semibold">
            Cloud Backups
          </Text>
          <Text className="text-[#94a3b8] text-xs mt-0.5">
            Upload and manage VCF files in your cloud account.
          </Text>
        </View>
      </View>

      <GlassPanel
        className="mb-3 rounded-xl border-[#223044]"
        contentStyle={{ paddingHorizontal: 12, paddingVertical: 12 }}
      >
        <Text className="text-[#cbd5e1] text-xs font-semibold">
          Quick Steps
        </Text>
        <Text className="text-[#94a3b8] text-xs mt-1">
          1. Login to cloud 2. Tap upload 3. Select VCF files
        </Text>
      </GlassPanel>

      {!session ? (
        <Pressable
          onPress={onCloudLogin}
          className="rounded-xl bg-[#2563eb] py-3.5 active:opacity-80"
        >
          <Text className="text-white text-center font-bold">
            Login to Cloud
          </Text>
        </Pressable>
      ) : (
        <>
          <Pressable
            onPress={onAddVcf}
            className="rounded-xl bg-[#2563eb] py-3.5 active:opacity-80"
          >
            <Text className="text-white text-center font-bold">
              Upload VCF to Cloud
            </Text>
          </Pressable>
          <Text className="text-[#64748b] text-xs mt-3 text-center">
            You are ready to upload VCF files.
          </Text>
        </>
      )}
    </GlassPanel>
  );
}
