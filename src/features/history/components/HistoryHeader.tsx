import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HistoryTab } from "@/features/history/types";

export function HistoryHeader({
  activeTab,
  onOpenSidebar,
  onRefresh,
}: {
  activeTab: HistoryTab;
  onOpenSidebar: () => void;
  onRefresh: () => void;
}) {
  return (
    <View className="px-4 pt-2 pb-4 border-b border-[#1e293b]">
      <View className="flex-row items-center justify-between">
        <Pressable
          onPress={onOpenSidebar}
          className="w-11 h-11 rounded-2xl border border-[#23324a] bg-[#0f1729] items-center justify-center active:opacity-80"
        >
          <Ionicons name="menu" size={21} color="#e2e8f0" />
        </Pressable>
        <Text className="text-white text-lg font-bold">History</Text>
        <Pressable
          onPress={onRefresh}
          className="w-11 h-11 rounded-2xl border border-[#23324a] bg-[#0f1729] items-center justify-center active:opacity-80"
        >
          <Ionicons name="refresh-outline" size={21} color="#7dd3fc" />
        </Pressable>
      </View>
      <Text className="text-[#94a3b8] text-xs mt-2">
        {activeTab === "local"
          ? "Manage device backups stored on this phone"
          : "Upload and manage cloud VCF backups"}
      </Text>
    </View>
  );
}
