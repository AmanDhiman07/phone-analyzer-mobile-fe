import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HistoryTab } from "@/features/history/types";
import { GlassPanel } from "@/components/GlassPanel";

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
      <View className="flex-row items-center justify-center mb-2">
        
        <Text className="text-white text-lg font-bold">History</Text>
        
      </View>
      <Text className="text-[#94a3b8] text-xs mt-2">
        {activeTab === "local"
          ? "Manage device backups stored on this phone"
          : "Upload and manage cloud VCF backups"}
      </Text>
    </View>
  );
}
