import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  AppState,
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
  restoreCallLogs,
  listBackups,
} from "@/services/backup";
import {
  isDefaultPhoneApp,
  isDefaultSmsApp,
  openDefaultPhoneAppSettings,
  requestDefaultSmsApp,
} from "@/services/permissions";

function BackupCard({
  icon,
  label,
  count,
  onBackup,
  onRestore,
  loading,
  accentBg,
  accentText,
}: {
  icon: "people" | "chatbubbles" | "call";
  label: string;
  count: number | null;
  onBackup: () => void;
  onRestore: () => void;
  loading: boolean;
  accentBg: string;
  accentText: string;
}) {
  return (
    <View className="rounded-3xl border border-[#1f2937] bg-[#0f1729] p-4 mb-4">
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1">
          <View
            className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${accentBg}`}
          >
            <Ionicons name={icon} size={22} color={accentText} />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-bold">{label}</Text>
            <Text className="text-[#9ca3af] text-xs mt-0.5">
              {loading
                ? "Updating..."
                : count !== null
                  ? `${count.toLocaleString()} records found`
                  : "No data loaded"}
            </Text>
          </View>
        </View>
      </View>

      <View className="flex-row gap-3">
        <Pressable
          onPress={onBackup}
          disabled={loading}
          className="flex-1 rounded-xl bg-[#0ea5e9] py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-[#031324] text-center font-bold">Backup</Text>
        </Pressable>
        <Pressable
          onPress={onRestore}
          disabled={loading}
          className="flex-1 rounded-xl border border-[#334155] bg-[#111827] py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-[#e5e7eb] text-center font-semibold">
            Restore
          </Text>
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
    const latestContactsBackup = backups.find(
      (item) => item.counts.contacts > 0,
    );
    if (!latestContactsBackup) {
      Alert.alert("No contact backups", "No backup with contacts was found.");
      return;
    }

    setLoading(true);
    try {
      const result = await restoreContacts(latestContactsBackup.folderName);
      if (result.restored > 0) {
        const detail =
          result.failed > 0 || result.skipped > 0
            ? `Restored ${result.restored} of ${result.total}. ${result.skipped} skipped and ${result.failed} failed.`
            : `Restored ${result.restored} contacts.`;
        Alert.alert("Restore complete", detail);
      } else {
        Alert.alert(
          "Restore complete",
          `No new contacts restored. ${result.skipped} skipped and ${result.failed} failed.`,
        );
      }
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
    const run = async (allowPrompt = true) => {
      const isDefault = await isDefaultSmsApp();
      if (!isDefault) {
        if (!allowPrompt) {
          Alert.alert(
            "Default SMS app not set",
            "Please set this app as default SMS app, then continue.",
          );
          return;
        }

        Alert.alert(
          "Default SMS App Required",
          "To restore messages, you need to set Data Guard as your default SMS app.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue",
              onPress: () => {
                const subscription = AppState.addEventListener(
                  "change",
                  (state) => {
                    if (state !== "active") return;
                    subscription.remove();
                    run(false).catch((error) => {
                      Alert.alert("SMS restore failed", String(error));
                    });
                  },
                );
                requestDefaultSmsApp().catch((error) => {
                  subscription.remove();
                  Alert.alert(
                    "Unable to open SMS default screen",
                    String(error),
                  );
                });
              },
            },
          ],
        );
        return;
      }

      Alert.alert(
        "SMS restore",
        "Default SMS role granted. SMS write/restore native implementation is the next step.",
      );
    };

    run().catch((error) => {
      Alert.alert("SMS restore failed", String(error));
    });
  }, []);

  const handleBackupCallLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { path, count } = await backupCallLogs();
      showBackupSuccess("Call Logs", count, path);
      await loadCounts();
    } catch (e) {
      Alert.alert("Backup failed", String(e));
    } finally {
      setLoading(false);
    }
  }, [loadCounts, showBackupSuccess]);

  const handleRestoreCallLogs = useCallback(() => {
    const run = async (allowPrompt = true) => {
      const backups = await listBackups();
      if (backups.length === 0) {
        Alert.alert("No backups", "Create a backup first.");
        return;
      }

      const latestCallLogBackup = backups.find(
        (item) => item.counts.callLogs > 0,
      );
      if (!latestCallLogBackup) {
        Alert.alert(
          "No call log backups",
          "No backup with call logs was found.",
        );
        return;
      }

      const defaultPhoneApp = await isDefaultPhoneApp();
      if (!defaultPhoneApp) {
        if (!allowPrompt) {
          Alert.alert(
            "Default app not set",
            "Please set this app as default Phone app, then try again.",
          );
          return;
        }

        Alert.alert(
          "Default phone app required",
          "Set this app as default Phone app to restore call logs.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Set as Default",
              onPress: () => {
                const subscription = AppState.addEventListener(
                  "change",
                  (state) => {
                    if (state !== "active") return;
                    subscription.remove();
                    run(false).catch((error) => {
                      Alert.alert("Restore failed", String(error));
                    });
                  },
                );
                openDefaultPhoneAppSettings().catch((error) => {
                  subscription.remove();
                  Alert.alert("Unable to open settings", String(error));
                });
              },
            },
          ],
        );
        return;
      }

      setLoading(true);
      try {
        const result = await restoreCallLogs(latestCallLogBackup.folderName);
        Alert.alert(
          "Restore complete",
          `Restored ${result.restored} of ${result.total}. ${result.skipped} skipped and ${result.failed} failed.`,
        );
        await loadCounts();
      } catch (error) {
        Alert.alert("Restore failed", String(error));
      } finally {
        setLoading(false);
      }
    };

    run().catch((error) => {
      Alert.alert("Restore failed", String(error));
    });
  }, [loadCounts]);

  const backupPath = getBackupRootPath();

  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      <Modal
        transparent
        animationType="fade"
        visible={successModal.visible}
        onRequestClose={() =>
          setSuccessModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-3xl border border-[#1e293b] bg-[#070d1d] p-5">
            <View className="w-14 h-14 rounded-2xl bg-[#123347] items-center justify-center mb-4 self-center">
              <Ionicons name="checkmark-done" size={30} color="#22d3ee" />
            </View>
            <Text className="text-white text-center text-lg font-bold">
              {successModal.label} Backup Complete
            </Text>
            <Text className="text-[#9ca3af] text-center text-sm mt-1 mb-4">
              {successModal.count.toLocaleString()} items saved
            </Text>
            <View className="rounded-2xl border border-[#1f2937] bg-[#0f172a] p-3 mb-4">
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
                className="flex-1 rounded-xl border border-[#334155] bg-[#111827] py-3 active:opacity-80"
              >
                <Text className="text-[#e5e7eb] text-center font-semibold">
                  Copy Path
                </Text>
              </Pressable>
              <Pressable
                onPress={() =>
                  setSuccessModal((prev) => ({ ...prev, visible: false }))
                }
                className="flex-1 rounded-xl bg-[#0ea5e9] py-3 active:opacity-80"
              >
                <Text className="text-[#031324] text-center font-bold">
                  Done
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      <View className="absolute -top-24 -right-20 w-72 h-72 rounded-full bg-[#0d2a4d]/60" />
      <View className="absolute top-52 -left-24 w-56 h-56 rounded-full bg-[#0f3a37]/40" />

      <View className="px-4 pt-2 pb-4">
        <View className="flex-row items-center justify-between">
          <View className="flex-row items-center">
            <View className="w-11 h-11 rounded-2xl bg-[#102848] items-center justify-center mr-3 border border-[#1e3a5f]">
              <Ionicons name="shield-checkmark" size={22} color="#38bdf8" />
            </View>
            <View>
              <Text className="text-[#e5e7eb] text-lg font-bold">
                DataGuard
              </Text>
              <Text className="text-[#94a3b8] text-xs">
                Fast local backup manager
              </Text>
            </View>
          </View>
          <Pressable
            onPress={() => router.push("/history")}
            className="w-11 h-11 rounded-2xl border border-[#23324a] bg-[#0f1729] items-center justify-center active:opacity-80"
          >
            <Ionicons name="archive-outline" size={21} color="#7dd3fc" />
          </Pressable>
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{
          paddingHorizontal: 16,
          paddingBottom: 28,
        }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#38bdf8"
          />
        }
      >
        <View className="rounded-3xl border border-[#1f2937] bg-[#0b1224] p-4 mb-5">
          <Text className="text-[#cbd5e1] text-sm font-semibold mb-2">
            Backup Destination
          </Text>
          <Text className="text-[#38bdf8] text-xs" numberOfLines={2}>
            {backupPath}
          </Text>
          <View className="flex-row items-center mt-3">
            <Ionicons name="lock-closed-outline" size={14} color="#94a3b8" />
            <Text className="text-[#94a3b8] text-xs ml-1.5">
              Stored only on this device
            </Text>
          </View>
        </View>

        <BackupCard
          icon="people"
          label="Contacts"
          count={contactsCount}
          onBackup={handleBackupContacts}
          onRestore={handleRestoreContacts}
          loading={loading}
          accentBg="bg-[#132e4f]"
          accentText="#7dd3fc"
        />
        <BackupCard
          icon="chatbubbles"
          label="Messages"
          count={messagesCount}
          onBackup={handleBackupMessages}
          onRestore={handleRestoreMessages}
          loading={loading}
          accentBg="bg-[#10302a]"
          accentText="#5eead4"
        />
        <BackupCard
          icon="call"
          label="Call Logs"
          count={callLogsCount}
          onBackup={handleBackupCallLogs}
          onRestore={handleRestoreCallLogs}
          loading={loading}
          accentBg="bg-[#35280f]"
          accentText="#fbbf24"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
