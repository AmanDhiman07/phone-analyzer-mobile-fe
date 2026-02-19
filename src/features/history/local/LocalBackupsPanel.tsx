import { FlatList, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BackupRecord } from "@/types/backup";
import { BackupListItem } from "@/features/history/shared/BackupListItem";

export function LocalBackupsPanel({
  backups,
  onDelete,
  onGoHome,
}: {
  backups: BackupRecord[];
  onDelete: (item: BackupRecord) => void;
  onGoHome: () => void;
}) {
  return (
    <>
      <View className="rounded-2xl border border-[#1f2937] bg-[#0b1224] px-4 py-3 mb-4">
        <Text className="text-[#e2e8f0] text-sm font-semibold">
          Recent Backups
        </Text>
        <Text className="text-[#94a3b8] text-xs mt-1">
          {backups.length} total entries
        </Text>
      </View>

      {backups.length === 0 ? (
        <View className="rounded-2xl border border-dashed border-[#334155] bg-[#0b1224] px-4 py-10 items-center">
          <Ionicons name="archive-outline" size={28} color="#64748b" />
          <Text className="text-[#cbd5e1] text-sm font-semibold mt-3">
            No backups yet
          </Text>
          <Text className="text-[#94a3b8] text-xs mt-1">
            Create one from the Home screen.
          </Text>
          <Pressable
            onPress={onGoHome}
            className="mt-4 rounded-xl bg-[#2563eb] px-4 py-2.5 active:opacity-80"
          >
            <Text className="text-white text-xs font-semibold">Go to Home</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={backups}
          keyExtractor={(item) => item.folderName}
          renderItem={({ item }) => (
            <BackupListItem item={item} onDelete={() => onDelete(item)} />
          )}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        />
      )}
    </>
  );
}
