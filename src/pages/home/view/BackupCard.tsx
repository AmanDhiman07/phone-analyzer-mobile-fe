import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassPanel } from "@/components/GlassPanel";
import type { BackupCardIcon } from "../types";

export function BackupCard({
  icon,
  label,
  count,
  onBackup,
  onRestore,
  loading,
  accentBg,
  accentText,
}: {
  icon: BackupCardIcon;
  label: string;
  count: number | null;
  onBackup: () => void;
  onRestore: () => void;
  loading: boolean;
  accentBg: string;
  accentText: string;
}) {
  return (
    <GlassPanel className="mb-4 rounded-3xl" contentStyle={{ padding: 16 }}>
      <View className="mb-4 flex-row items-center justify-between">
        <View className="flex-1 flex-row items-center">
          <View
            className={`mr-3 h-11 w-11 items-center justify-center rounded-2xl ${accentBg}`}
          >
            <Ionicons name={icon} size={22} color={accentText} />
          </View>
          <View className="flex-1">
            <Text className="text-base font-bold text-white">{label}</Text>
            <Text className="mt-0.5 text-xs text-[#cbd5e1]">
              {loading
                ? "Updating..."
                : count !== null
                  ? `${count.toLocaleString()} records found`
                  : "No data loaded"}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={onBackup}
          disabled={loading}
          className="flex-1 rounded-xl bg-[#2563eb] py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-center font-bold text-white">Backup</Text>
        </Pressable>
        <Pressable
          onPress={onRestore}
          disabled={loading}
          className="flex-1 rounded-xl border border-white/20 bg-[#10192b]/85 py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-center font-semibold text-[#e5e7eb]">
            Restore
          </Text>
        </Pressable>
      </View>
    </GlassPanel>
  );
}
