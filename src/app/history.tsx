import { useState, useCallback } from "react";
import { View, Text, Pressable, FlatList, Modal } from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  listBackups,
  deleteBackup,
  formatSize,
  formatBackupDate,
} from "@/services/backup";
import type { BackupRecord } from "@/types/backup";

function BackupListItem({
  item,
  onDelete,
}: {
  item: BackupRecord;
  onDelete: () => void;
}) {
  const hasContacts = item.counts.contacts > 0;
  const hasMessages = item.counts.messages > 0;
  const hasCallLogs = item.counts.callLogs > 0;
  const selectedCount = [hasContacts, hasMessages, hasCallLogs].filter(
    Boolean,
  ).length;
  const title =
    selectedCount > 1
      ? "Device Backup"
      : hasContacts
        ? "Contacts Backup"
        : hasMessages
          ? "Messages Backup"
          : hasCallLogs
            ? "Call Logs Backup"
            : "Backup";
  const iconName =
    selectedCount > 1
      ? "phone-portrait-outline"
      : hasContacts
        ? "people-outline"
        : hasMessages
          ? "chatbubbles-outline"
          : hasCallLogs
            ? "call-outline"
            : "document-outline";

  return (
    <View className="flex-row items-center bg-[#1e293b] rounded-xl p-3 mb-3">
      <View className="w-10 h-10 rounded-lg bg-[#1e3a5f] items-center justify-center mr-3">
        <Ionicons name={iconName} size={20} color="#38bdf8" />
      </View>
      <View className="flex-1">
        <Text className="text-white font-medium">{title}</Text>
        <Text className="text-[#94a3b8] text-xs">
          {formatBackupDate(item.date)} • {formatSize(item.sizeBytes)}
        </Text>
      </View>
      <Pressable className="p-2 mx-1" onPress={() => {}}>
        <Ionicons name="sync" size={20} color="#94a3b8" />
      </Pressable>
      <Pressable className="p-2" onPress={onDelete}>
        <Ionicons name="trash-outline" size={20} color="#ef4444" />
      </Pressable>
    </View>
  );
}

export default function HistoryScreen() {
  const router = useRouter();
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadBackups = useCallback(async () => {
    const list = await listBackups();
    setBackups(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBackups();
    }, [loadBackups]),
  );

  const handleDelete = useCallback((item: BackupRecord) => {
    setDeleteTarget(item);
  }, []);

  const confirmDelete = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await deleteBackup(deleteTarget.folderName);
      setDeleteTarget(null);
      await loadBackups();
    } finally {
      setIsDeleting(false);
    }
  }, [deleteTarget, loadBackups]);

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]" edges={["top", "bottom"]}>
      <Modal
        transparent
        animationType="fade"
        visible={!!deleteTarget}
        onRequestClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-2xl bg-[#0b1220] border border-[#1e293b] p-5">
            <View className="w-12 h-12 rounded-xl bg-[#3f1d1d] items-center justify-center mb-4 self-center">
              <Ionicons name="trash-outline" size={26} color="#f87171" />
            </View>
            <Text className="text-white text-center text-lg font-bold mb-1">
              Delete Backup?
            </Text>
            <Text className="text-[#94a3b8] text-center text-sm mb-4">
              This backup will be permanently removed from local storage.
            </Text>
            <View className="rounded-xl bg-[#111827] border border-[#1f2937] p-3 mb-4">
              <Text className="text-[#e2e8f0] text-sm font-semibold">
                {deleteTarget ? formatBackupDate(deleteTarget.date) : ""}
              </Text>
              <Text className="text-[#94a3b8] text-xs mt-1">
                {deleteTarget ? formatSize(deleteTarget.sizeBytes) : ""}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                disabled={isDeleting}
                onPress={() => setDeleteTarget(null)}
                className="flex-1 rounded-xl bg-[#1f2937] border border-[#334155] py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-[#e2e8f0] text-center font-semibold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={isDeleting}
                onPress={confirmDelete}
                className="flex-1 rounded-xl bg-[#ef4444] py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-white text-center font-bold">
                  {isDeleting ? "Deleting..." : "Delete"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#1e293b]">
        <Pressable
          onPress={() => router.back()}
          className="w-10 h-10 rounded-full bg-[#1e293b] items-center justify-center active:opacity-80"
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </Pressable>
        <Text className="text-white text-lg font-semibold">History</Text>
        <View className="w-10 h-10 rounded-full bg-[#1e293b] items-center justify-center">
          <Ionicons name="person-outline" size={22} color="#94a3b8" />
        </View>
      </View>

      <View className="flex-1 p-4">
        <View className="bg-[#1e293b] rounded-xl p-4 mb-6">
          <View className="flex-row items-center mb-3">
            <View className="w-12 h-12 rounded-xl bg-[#1e3a5f] items-center justify-center mr-3">
              <Ionicons name="cloud-outline" size={26} color="#38bdf8" />
            </View>
            <View className="flex-1">
              <Text className="text-white font-semibold text-base">
                Cloud Access
              </Text>
              <Text className="text-[#94a3b8] text-sm mt-0.5">
                Login to your organizational account to access cloud backups.
              </Text>
            </View>
          </View>
          <Pressable className="flex-row items-center justify-center py-3 rounded-lg bg-[#2563eb] active:opacity-80">
            <Text className="text-white font-semibold mr-2">
              Login to Cloud
            </Text>
            <Ionicons name="arrow-forward" size={18} color="#fff" />
          </Pressable>
        </View>

        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-white font-semibold text-base">
            Local Backups
          </Text>
          <Pressable onPress={loadBackups}>
            <Text className="text-[#38bdf8] text-sm font-medium">View All</Text>
          </Pressable>
        </View>

        {backups.length === 0 ? (
          <Text className="text-[#94a3b8] text-sm">
            No backups yet. Create one from the Home screen.
          </Text>
        ) : (
          <FlatList
            data={backups}
            keyExtractor={(item) => item.folderName}
            renderItem={({ item }) => (
              <BackupListItem item={item} onDelete={() => handleDelete(item)} />
            )}
            scrollEnabled={true}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
