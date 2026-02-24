import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HistoryTab } from "@/features/history/types";
import { GlassPanel } from "@/components/GlassPanel";

export function HistoryTabSwitcher({
  activeTab,
  onChange,
}: {
  activeTab: HistoryTab;
  onChange: (tab: HistoryTab) => void;
}) {
  return (
    <GlassPanel
      className="mb-4 rounded-2xl border-[#2a384d]"
      intensity={82}
      overlayColor="rgba(12, 22, 40, 0.32)"
      contentStyle={{ padding: 4 }}
    >
      <View className="flex-row">
        <Pressable
          onPress={() => onChange("local")}
          className={`flex-1 rounded-xl py-2.5 px-2 ${activeTab === "local" ? "border border-[#3b82f6]/45 bg-[#1e293b]" : "bg-transparent"}`}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons
              name="phone-portrait-outline"
              size={15}
              color={activeTab === "local" ? "#f8fafc" : "#cbd5e1"}
            />
            <Text
              className="ml-1.5 text-center text-sm font-semibold"
              style={{ color: activeTab === "local" ? "#f8fafc" : "#cbd5e1" }}
            >
              Local
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => onChange("cloud")}
          className={`flex-1 rounded-xl py-2.5 px-2 ${activeTab === "cloud" ? "border border-[#3b82f6]/45 bg-[#1e293b]" : "bg-transparent"}`}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons
              name="cloud-outline"
              size={15}
              color={activeTab === "cloud" ? "#f8fafc" : "#cbd5e1"}
            />
            <Text
              className="ml-1.5 text-center text-sm font-semibold"
              style={{ color: activeTab === "cloud" ? "#f8fafc" : "#cbd5e1" }}
            >
              Cloud
            </Text>
          </View>
        </Pressable>
      </View>
    </GlassPanel>
  );
}
