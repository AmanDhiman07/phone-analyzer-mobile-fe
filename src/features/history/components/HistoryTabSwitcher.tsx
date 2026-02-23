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
      contentStyle={{ padding: 4 }}
    >
      <View className="flex-row">
        <Pressable
          onPress={() => onChange("local")}
          className={`flex-1 rounded-xl py-2.5 px-2 ${activeTab === "local" ? "border border-white/35 bg-white/92" : "bg-transparent"}`}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons
              name="phone-portrait-outline"
              size={15}
              color={activeTab === "local" ? "#0f172a" : "#cbd5e1"}
            />
            <Text
              className={`ml-1.5 text-center text-sm font-semibold ${activeTab === "local" ? "text-[#0f172a]" : "text-[#cbd5e1]"}`}
            >
              Local
            </Text>
          </View>
        </Pressable>
        <Pressable
          onPress={() => onChange("cloud")}
          className={`flex-1 rounded-xl py-2.5 px-2 ${activeTab === "cloud" ? "border border-white/35 bg-white/92" : "bg-transparent"}`}
        >
          <View className="flex-row items-center justify-center">
            <Ionicons
              name="cloud-outline"
              size={15}
              color={activeTab === "cloud" ? "#0f172a" : "#cbd5e1"}
            />
            <Text
              className={`ml-1.5 text-center text-sm font-semibold ${activeTab === "cloud" ? "text-[#0f172a]" : "text-[#cbd5e1]"}`}
            >
              Cloud
            </Text>
          </View>
        </Pressable>
      </View>
    </GlassPanel>
  );
}
