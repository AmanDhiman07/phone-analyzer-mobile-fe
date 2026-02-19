import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { HistoryTab } from "@/features/history/types";

export function HistoryTabSwitcher({
  activeTab,
  onChange,
}: {
  activeTab: HistoryTab;
  onChange: (tab: HistoryTab) => void;
}) {
  return (
    <View className="rounded-2xl border border-[#2a384d] bg-[#0b1224] p-1 mb-4 flex-row">
      <Pressable
        onPress={() => onChange("local")}
        className={`flex-1 rounded-xl py-2.5 px-2 ${activeTab === "local" ? "bg-[#334155]" : ""}`}
      >
        <View className="flex-row items-center justify-center">
          <Ionicons
            name="phone-portrait-outline"
            size={15}
            color={activeTab === "local" ? "#cbd5e1" : "#64748b"}
          />
          <Text
            className={`ml-1.5 text-center text-sm font-semibold ${activeTab === "local" ? "text-[#cbd5e1]" : "text-[#64748b]"}`}
          >
            Local
          </Text>
        </View>
      </Pressable>
      <Pressable
        onPress={() => onChange("cloud")}
        className={`flex-1 rounded-xl py-2.5 px-2 ${activeTab === "cloud" ? "bg-[#334155]" : ""}`}
      >
        <View className="flex-row items-center justify-center">
          <Ionicons
            name="cloud-outline"
            size={15}
            color={activeTab === "cloud" ? "#cbd5e1" : "#64748b"}
          />
          <Text
            className={`ml-1.5 text-center text-sm font-semibold ${activeTab === "cloud" ? "text-[#cbd5e1]" : "text-[#64748b]"}`}
          >
            Cloud
          </Text>
        </View>
      </Pressable>
    </View>
  );
}
