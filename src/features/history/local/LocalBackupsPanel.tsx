import { FlatList, Pressable, Text } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import type { BackupRecord } from "@/types/backup";
import { BackupListItem } from "@/features/history/shared/BackupListItem";
import { GlassPanel } from "@/components/GlassPanel";

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
      <GlassPanel
        className="mb-4 rounded-2xl border-[#1f2937]"
        contentStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
      >
        <Text className="text-[#e2e8f0] text-sm font-semibold">
          Recent Backups
        </Text>
        <Text className="text-[#94a3b8] text-xs mt-1">
          {backups.length} total entries
        </Text>
      </GlassPanel>

      {backups.length === 0 ? (
        <GlassPanel
          className="items-center rounded-2xl border-dashed border-[#334155]"
          contentStyle={{ paddingHorizontal: 16, paddingVertical: 40 }}
        >
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
        </GlassPanel>
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
