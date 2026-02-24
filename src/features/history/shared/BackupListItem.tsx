import { Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatBackupDate, formatSize } from "@/services/backup";
import type { BackupRecord } from "@/types/backup";
import { getBackupPresentation } from "./backupPresentation";
import { GlassPanel } from "@/components/GlassPanel";

export function BackupListItem({
  item,
  onDelete,
  onUpload,
  uploadDisabled = false,
}: {
  item: BackupRecord;
  onDelete: () => void;
  onUpload: () => void;
  uploadDisabled?: boolean;
}) {
  const data = getBackupPresentation(item);

  return (
    <GlassPanel
      className="mb-3 rounded-2xl border-[#1f2937]"
      contentStyle={{ padding: 12 }}
    >
      <View className="flex-row items-center">
        <View
          className={`w-11 h-11 rounded-xl items-center justify-center mr-3 ${data.accentBg}`}
        >
          <Ionicons name={data.iconName} size={21} color={data.accentText} />
        </View>
        <View className="flex-1">
          <Text className="text-white font-semibold">{data.title}</Text>
          <Text className="text-[#94a3b8] text-xs mt-0.5">
            {formatBackupDate(item.date)} • {formatSize(item.sizeBytes)}
          </Text>
        </View>
        <Pressable
          disabled={uploadDisabled}
          className={`p-2 rounded-lg mr-2 active:opacity-80 ${uploadDisabled ? "bg-[#1f2937] border border-[#334155] opacity-50" : "bg-[#112d4d] border border-[#27507a]"}`}
          onPress={onUpload}
        >
          <Ionicons name="cloud-upload-outline" size={19} color="#2563eb" />
        </Pressable>
        <Pressable
          className="p-2 rounded-lg bg-[#1e293b] border border-[#2c3e56] mr-2 active:opacity-80"
          onPress={onDelete}
        >
          <Ionicons name="trash-outline" size={19} color="#f87171" />
        </Pressable>
      </View>
    </GlassPanel>
  );
}
