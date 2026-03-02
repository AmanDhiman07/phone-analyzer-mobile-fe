import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HistoryTab } from "@/features/history/types";
import { GlassPanel } from "@/components/GlassPanel";

export function HistoryHeader({
  activeTab,
  onBack,
  onOpenSidebar,
  onRefresh,
}: {
  activeTab: HistoryTab;
  onBack: () => void;
  onOpenSidebar: () => void;
  onRefresh: () => void;
}) {
  return (
    <View className="px-4 pt-2 pb-4 border-b border-[#1e293b]">
      <View className="flex-row items-center mb-2">
        <Pressable
          onPress={onBack}
          className="w-10 h-10 rounded-full border border-[#1d3354] bg-[#1a2942] items-center justify-center mr-3 active:opacity-80"
        >
          <Ionicons name="arrow-back" size={22} color="#e2e8f0" />
        </Pressable>
        <Text className="text-white text-lg font-bold flex-1">History</Text>
      </View>
      <Text className="text-[#94a3b8] text-xs mt-2">
        {activeTab === "local"
          ? "Manage device backups stored on this phone"
          : "Upload and manage cloud VCF backups"}
      </Text>
    </View>
  );
}
