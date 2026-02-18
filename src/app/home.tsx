import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Modal,
  Clipboard,
  RefreshControl,
  ScrollView,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import {
  getBackupRootPath,
  getContactsCount,
  getMessagesCount,
  getCallLogsCount,
  backupContacts,
  backupMessages,
  backupCallLogs,
  restoreContacts,
  listBackups,
} from "@/services/backup";

function BackupCard({
  icon,
  label,
  count,
  onBackup,
  onRestore,
  loading,
}: {
  icon: "people" | "chatbubbles" | "call";
  label: string;
  count: number | null;
  onBackup: () => void;
  onRestore: () => void;
  loading: boolean;
}) {
  return (
    <View className="bg-[#1e293b] rounded-xl p-4 mb-4">
      <View className="flex-row items-center mb-3">
        <View className="w-10 h-10 rounded-lg bg-[#1e3a5f] items-center justify-center mr-3">
          <Ionicons name={icon} size={22} color="#38bdf8" />
        </View>
        <Text className="text-white font-medium text-base">{label}</Text>
      </View>
      <Text className="text-[#94a3b8] text-sm mb-3">
        {loading
          ? "…"
          : count !== null
            ? `${count.toLocaleString()} found`
            : "—"}
      </Text>
      <View className="flex-row gap-3">
        <Pressable
          onPress={onBackup}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-[#2563eb] active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-white text-center font-semibold">Backup</Text>
        </Pressable>
        <Pressable
          onPress={onRestore}
          disabled={loading}
          className="flex-1 py-2.5 rounded-lg bg-[#2563eb] active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-white text-center font-semibold">Restore</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const router = useRouter();
  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [messagesCount, setMessagesCount] = useState<number | null>(null);
  const [callLogsCount, setCallLogsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successModal, setSuccessModal] = useState<{
    visible: boolean;
    label: string;
    count: number;
    path: string;
  }>({
    visible: false,
    label: "",
    count: 0,
    path: "",
  });

  const showBackupSuccess = useCallback(
    (label: string, count: number, path: string) => {
      setSuccessModal({
        visible: true,
        label,
        count,
        path,
      });
    },
    [],
  );

  const handleCopyPath = useCallback(() => {
    if (!successModal.path) return;
    Clipboard.setString(successModal.path);
    Alert.alert("Copied", "Backup path copied to clipboard.");
  }, [successModal.path]);

  const loadCounts = useCallback(async () => {
    // Request permissions one after the other so both dialogs can be shown and granted
    const c = await getContactsCount();
    setContactsCount(c);
    const m = await getMessagesCount();
    setMessagesCount(m);
    const l = await getCallLogsCount();
    setCallLogsCount(l);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadCounts();
    }, [loadCounts]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadCounts();
    setRefreshing(false);
  }, [loadCounts]);

  const handleBackupContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { path, count } = await backupContacts();
      showBackupSuccess("Contacts", count, path);
      await loadCounts();
    } catch (e) {
      Alert.alert("Backup failed", String(e));
    } finally {
      setLoading(false);
    }
  }, [loadCounts, showBackupSuccess]);

  const handleRestoreContacts = useCallback(async () => {
    const backups = await listBackups();
    if (backups.length === 0) {
      Alert.alert("No backups", "Create a backup first.");
      return;
    }
    const latest = backups[0];
    setLoading(true);
    try {
      const restored = await restoreContacts(latest.folderName);
      Alert.alert(
        "Restore complete",
        restored > 0
          ? `Restored ${restored} contacts.`
          : "No contacts restored (restore may be iOS-only).",
      );
      await loadCounts();
    } catch (e) {
      Alert.alert("Restore failed", String(e));
    } finally {
      setLoading(false);
    }
  }, [loadCounts]);

  const handleBackupMessages = useCallback(async () => {
    setLoading(true);
    try {
      const { path, count } = await backupMessages();
      showBackupSuccess("Messages", count, path);
      await loadCounts();
    } catch (e) {
      Alert.alert("Backup failed", String(e));
    } finally {
      setLoading(false);
    }
  }, [loadCounts, showBackupSuccess]);

  const handleRestoreMessages = useCallback(() => {
    Alert.alert(
      "Messages",
      "Restore of SMS is not supported on Android (system restriction).",
    );
  }, []);

  const handleBackupCallLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { path, count } = await backupCallLogs();
      showBackupSuccess("Call logs", count, path);
      await loadCounts();
    } catch (e) {
      Alert.alert("Backup failed", String(e));
    } finally {
      setLoading(false);
    }
  }, [loadCounts, showBackupSuccess]);

  const handleRestoreCallLogs = useCallback(() => {
    Alert.alert(
      "Call logs",
      "Restore of call logs is not supported on Android (system restriction).",
    );
  }, []);

  const backupPath = getBackupRootPath();

  return (
    <SafeAreaView className="flex-1 bg-[#0f172a]" edges={["top", "bottom"]}>
      <Modal
        transparent
        animationType="fade"
        visible={successModal.visible}
        onRequestClose={() =>
          setSuccessModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View className="flex-1 bg-black/60 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-2xl bg-[#0b1220] border border-[#1e293b] p-5">
            <View className="w-12 h-12 rounded-xl bg-[#052e3b] items-center justify-center mb-4 self-center">
              <Ionicons name="checkmark-circle" size={28} color="#22d3ee" />
            </View>
            <Text className="text-white text-center text-lg font-bold mb-1">
              {successModal.label} Backup Complete
            </Text>
            <Text className="text-[#94a3b8] text-center text-sm mb-4">
              {successModal.count.toLocaleString()} items saved successfully
            </Text>
            <View className="rounded-xl bg-[#111827] border border-[#1f2937] p-3 mb-4">
              <Text className="text-[#64748b] text-[11px] uppercase tracking-wider mb-1">
                Location
              </Text>
              <Text className="text-[#38bdf8] text-xs" numberOfLines={3}>
                {successModal.path}
              </Text>
            </View>
            <View className="flex-row gap-3">
              <Pressable
                onPress={handleCopyPath}
                className="flex-1 rounded-xl bg-[#1f2937] border border-[#334155] py-3 active:opacity-80"
              >
                <Text className="text-[#e2e8f0] text-center font-semibold">
                  Copy Path
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setSuccessModal((prev) => ({ ...prev, visible: false }))
                }
                className="flex-1 rounded-xl bg-[#0ea5e9] py-3 active:opacity-80"
              >
                <Text className="text-[#0b1220] text-center font-bold">
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View className="flex-row items-center justify-between px-4 py-3 border-b border-[#1e293b]">
        <View className="flex-row items-center">
          <View className="w-9 h-9 rounded-lg bg-[#1e3a5f] items-center justify-center mr-2">
            <Ionicons name="shield-checkmark" size={20} color="#38bdf8" />
          </View>
          <Text className="text-white text-lg font-bold">DataGuard</Text>
        </View>
        <Pressable
          onPress={() => router.push("/history")}
          className="w-10 h-10 rounded-full bg-[#1e293b] items-center justify-center active:opacity-80"
        >
          <Ionicons name="sync" size={22} color="#38bdf8" />
        </Pressable>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingTop: 16,
          paddingBottom: 24,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
          />
        }
      >
        <View className="mb-2">
          <Text className="text-[#64748b] text-xs uppercase tracking-wider mb-1">
            Local Backup Path
          </Text>
          <Text className="text-[#38bdf8] text-sm" numberOfLines={2}>
            {backupPath}
          </Text>
        </View>

        <BackupCard
          icon="people"
          label="Contacts"
          count={contactsCount}
          onBackup={handleBackupContacts}
          onRestore={handleRestoreContacts}
          loading={loading}
        />
        <BackupCard
          icon="chatbubbles"
          label="Messages"
          count={messagesCount}
          onBackup={handleBackupMessages}
          onRestore={handleRestoreMessages}
          loading={loading}
        />
        <BackupCard
          icon="call"
          label="Call Logs"
          count={callLogsCount}
          onBackup={handleBackupCallLogs}
          onRestore={handleRestoreCallLogs}
          loading={loading}
        />
      </ScrollView>
    </SafeAreaView>
  );
}
