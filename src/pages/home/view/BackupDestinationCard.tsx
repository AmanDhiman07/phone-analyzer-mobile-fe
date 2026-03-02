import { Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassPanel } from "@/components/GlassPanel";

export function BackupDestinationCard({ backupPath }: { backupPath: string }) {
  return (
    <GlassPanel className="mb-5 rounded-3xl" contentStyle={{ padding: 16 }}>
      <Text className="mb-2 text-sm font-semibold text-[#e2e8f0]">
        Backup Destination
      </Text>
      <Text className="text-xs text-[#7dd3fc]" numberOfLines={2}>
        {backupPath}
      </Text>
      <View className="mt-3 flex-row items-center">
        <Ionicons name="lock-closed-outline" size={14} color="#cbd5e1" />
        <Text className="ml-1.5 text-xs text-[#cbd5e1]">
          Stored only on this device
        </Text>
      </View>
    </GlassPanel>
  );
}
