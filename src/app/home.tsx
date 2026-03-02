import { useState, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  Alert,
  Linking,
  Modal,
  Clipboard,
  RefreshControl,
  ScrollView,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useRouter, useFocusEffect } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassPanel } from "@/components/GlassPanel";
import {
  getBackupRootPath,
  getContactsCount,
  getMessagesCount,
  getCallLogsCount,
  backupContacts,
  backupMessages,
  backupCallLogs,
  prepareBackupContactsVcf,
  restoreContacts,
  restoreMessages,
  restoreCallLogs,
  listBackups,
} from "@/services/backup";
import { getApiBaseUrl } from "@/services/auth/authService";
import {
  getDefaultSmsPackage,
  isDefaultPhoneApp,
  isDefaultSmsApp,
  requestDefaultPhoneApp,
  requestDefaultSmsPackage,
  requestDefaultSmsApp,
} from "@/services/permissions";
import {
  getAuthSession,
  type AuthSession,
} from "@/services/auth/sessionStorage";

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
    <GlassPanel className="mb-4 rounded-3xl" contentStyle={{ padding: 16 }}>
      <View className="flex-row items-center justify-between mb-4">
        <View className="flex-row items-center flex-1">
          <View
            className={`w-11 h-11 rounded-2xl items-center justify-center mr-3 ${accentBg}`}
          >
            <Ionicons name={icon} size={22} color={accentText} />
          </View>
          <View className="flex-1">
            <Text className="text-white text-base font-bold">{label}</Text>
            <Text className="text-[#cbd5e1] text-xs mt-0.5">
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
          className="flex-1 rounded-xl bg-[#2563eb] py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-white text-center font-bold">Backup</Text>
        </Pressable>
        <Pressable
          onPress={onRestore}
          disabled={loading}
          className="flex-1 rounded-xl border border-white/20 bg-[#10192b]/85 py-3 active:opacity-80 disabled:opacity-50"
        >
          <Text className="text-[#e5e7eb] text-center font-semibold">
            Restore
          </Text>
        </Pressable>
      </View>
    </GlassPanel>
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
  const [session, setSession] = useState<AuthSession | null>(null);
  const [cloudUploadVisible, setCloudUploadVisible] = useState(false);
  const [cloudUploadName, setCloudUploadName] = useState("");
  const [cloudUploadCaseId, setCloudUploadCaseId] = useState("");
  const [cloudUploadFile, setCloudUploadFile] = useState<{
    uri: string;
    name: string;
    size: number;
    mimeType?: string;
  } | null>(null);
  const [isUploadingVcf, setIsUploadingVcf] = useState(false);
  const [cloudLoadingMessage, setCloudLoadingMessage] = useState("");

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

  const openAppSettings = useCallback(() => {
    Linking.openSettings().catch(() => {
      Alert.alert(
        "Unable to open settings",
        "Please open app settings manually and allow required permissions.",
      );
    });
  }, []);

  const handleBackupPermissionDenied = useCallback(
    (permissionLabel: string, error: unknown): boolean => {
      const message = String(error);

      if (message.toLowerCase().includes("folder permission denied")) {
        Alert.alert(
          "Folder Permission Required",
          "Backup folder access was denied. Please allow folder access to create backups.",
        );
        return true;
      }

      if (!message.toLowerCase().includes("permission denied")) {
        return false;
      }

      Alert.alert(
        "Permission Required",
        `${permissionLabel} permission is denied. Open app settings and allow permission to continue backup.`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Open Settings",
            onPress: openAppSettings,
          },
        ],
      );
      return true;
    },
    [openAppSettings],
  );

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
      getAuthSession().then((value) => setSession(value));
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
      const handled = handleBackupPermissionDenied("Contacts", e);
      if (!handled) {
        Alert.alert("Backup failed", String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [handleBackupPermissionDenied, loadCounts, showBackupSuccess]);

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
      const handled = handleBackupPermissionDenied("SMS", e);
      if (!handled) {
        Alert.alert("Backup failed", String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [handleBackupPermissionDenied, loadCounts, showBackupSuccess]);

  const handleRestoreMessages = useCallback(() => {
    const run = async (previousDefaultPackage: string | null = null) => {
      const backups = await listBackups();
      if (backups.length === 0) {
        Alert.alert("No backups", "Create a backup first.");
        return;
      }

      const latestMessagesBackup = backups.find(
        (item) => item.counts.messages > 0,
      );
      if (!latestMessagesBackup) {
        Alert.alert("No message backups", "No backup with messages was found.");
        return;
      }

      const isDefault = await isDefaultSmsApp();
      if (!isDefault) {
        const packageBeforeSwitch =
          previousDefaultPackage ?? (await getDefaultSmsPackage());
        Alert.alert(
          "Default SMS App Required",
          "To restore messages, Data Guard must be the default SMS app temporarily. You can switch your preferred app back later.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue",
              onPress: () => {
                requestDefaultSmsApp()
                  .then((granted) => {
                    if (!granted) {
                      Alert.alert(
                        "Default SMS app not set",
                        "Data Guard is still not your default SMS app.",
                      );
                      return;
                    }
                    run(packageBeforeSwitch).catch((error) => {
                      const errMsg = String(error);
                      const notDefault =
                        errMsg.includes("default SMS app") ||
                        (error as { code?: string })?.code ===
                          "ERR_NOT_DEFAULT_SMS";
                      if (notDefault) {
                        Alert.alert(
                          "Default SMS app required",
                          "Please set Data Guard as your default SMS app in Settings, then try Restore again.",
                        );
                      } else {
                        Alert.alert("SMS restore failed", errMsg);
                      }
                    });
                  })
                  .catch((error) => {
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

      setLoading(true);
      try {
        const result = await restoreMessages(latestMessagesBackup.folderName);
        const detail =
          result.restored > 0
            ? result.failed > 0 || result.skipped > 0
              ? `Restored ${result.restored} of ${result.total}. ${result.skipped} skipped and ${result.failed} failed.`
              : `Restored ${result.restored} messages.`
            : `No new messages restored. ${result.skipped} skipped and ${result.failed} failed.`;

        await loadCounts();

        if (previousDefaultPackage) {
          Alert.alert(
            "Restore complete",
            `${detail}\n\nNext, switch back to your previous SMS app.`,
            [
              {
                text: "Continue",
                onPress: () => {
                  requestDefaultSmsPackage(previousDefaultPackage).catch(
                    (error) => {
                      Alert.alert(
                        "Unable to open SMS switch prompt",
                        String(error),
                      );
                    },
                  );
                },
              },
            ],
          );
        } else {
          Alert.alert("Restore complete", detail);
        }
      } catch (error) {
        const msg = String(error);
        const isNotDefault =
          msg.includes("default SMS app") ||
          (error as { code?: string })?.code === "ERR_NOT_DEFAULT_SMS";
        if (isNotDefault) {
          Alert.alert(
            "Default SMS app required",
            "Please set Data Guard as your default SMS app in Settings, then try Restore again.",
          );
        } else {
          Alert.alert("SMS restore failed", msg);
        }
      } finally {
        setLoading(false);
      }
    };

    run().catch((error) => {
      const msg = String(error);
      const isNotDefault =
        msg.includes("default SMS app") ||
        (error as { code?: string })?.code === "ERR_NOT_DEFAULT_SMS";
      if (isNotDefault) {
        Alert.alert(
          "Default SMS app required",
          "Please set Data Guard as your default SMS app in Settings, then try Restore again.",
        );
      } else {
        Alert.alert("SMS restore failed", msg);
      }
    });
  }, [loadCounts]);

  const handleBackupCallLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { path, count } = await backupCallLogs();
      showBackupSuccess("Call Logs", count, path);
      await loadCounts();
    } catch (e) {
      const handled = handleBackupPermissionDenied("Call log", e);
      if (!handled) {
        Alert.alert("Backup failed", String(e));
      }
    } finally {
      setLoading(false);
    }
  }, [handleBackupPermissionDenied, loadCounts, showBackupSuccess]);

  const handleBackupContactsPress = useCallback(() => {
    Alert.alert(
      "Where to store?",
      "Store backup locally on this device or upload to cloud.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Local", onPress: () => handleBackupContacts() },
        {
          text: "Cloud",
          onPress: () => {
            if (!session) {
              Alert.alert(
                "Login required",
                "Please log in to backup contacts to the cloud.",
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Login",
                    onPress: () => router.push("/(tabs)/firstTab"),
                  },
                ],
              );
              return;
            }
            (async () => {
              setCloudLoadingMessage("Creating backup...");
              setLoading(true);
              try {
                const { count } = await backupContacts();
                if (count === 0) {
                  Alert.alert("No contacts", "No contacts to backup.");
                  return;
                }
                const backups = await listBackups();
                const latest = backups.find((b) => b.counts.contacts > 0);
                if (!latest) {
                  Alert.alert("Backup failed", "Could not find the created backup.");
                  return;
                }
                const file = await prepareBackupContactsVcf(latest.folderName);
                setCloudUploadFile({
                  uri: file.uri,
                  name: file.name,
                  size: file.size,
                  mimeType: file.mimeType,
                });
                setCloudUploadName(latest.folderName);
                setCloudUploadCaseId("");
                setCloudUploadVisible(true);
              } catch (e) {
                const handled = handleBackupPermissionDenied("Contacts", e);
                if (!handled) Alert.alert("Backup failed", String(e));
              } finally {
                setCloudLoadingMessage("");
                setLoading(false);
              }
            })();
          },
        },
      ],
    );
  }, [session, handleBackupContacts, handleBackupPermissionDenied]);

  const handleBackupMessagesPress = useCallback(() => {
    Alert.alert(
      "Where to store?",
      "Store backup locally on this device or upload to cloud.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Local", onPress: () => handleBackupMessages() },
        {
          text: "Cloud",
          onPress: () => {
            Alert.alert(
              "Cloud backup for messages",
              "Cloud backup is only available for contacts. Store messages locally?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Store locally", onPress: () => handleBackupMessages() },
              ],
            );
          },
        },
      ],
    );
  }, [handleBackupMessages]);

  const handleBackupCallLogsPress = useCallback(() => {
    Alert.alert(
      "Where to store?",
      "Store backup locally on this device or upload to cloud.",
      [
        { text: "Cancel", style: "cancel" },
        { text: "Local", onPress: () => handleBackupCallLogs() },
        {
          text: "Cloud",
          onPress: () => {
            Alert.alert(
              "Cloud backup for call logs",
              "Cloud backup is only available for contacts. Store call logs locally?",
              [
                { text: "Cancel", style: "cancel" },
                { text: "Store locally", onPress: () => handleBackupCallLogs() },
              ],
            );
          },
        },
      ],
    );
  }, [handleBackupCallLogs]);

  const handleCloudUploadSubmit = useCallback(async () => {
    if (!session?.token || !cloudUploadFile) return;
    if (!cloudUploadName.trim()) {
      Alert.alert("Name required", "Please enter a backup name.");
      return;
    }
    if (!cloudUploadCaseId.trim()) {
      Alert.alert("Title required", "Please enter the title.");
      return;
    }
    setCloudLoadingMessage("Uploading to cloud...");
    setIsUploadingVcf(true);
    try {
      const formData = new FormData();
      formData.append("userName", cloudUploadName.trim());
      formData.append("caseId", cloudUploadCaseId.trim());
      formData.append("vcfFiles", {
        uri: cloudUploadFile.uri,
        name: cloudUploadFile.name,
        type: cloudUploadFile.mimeType || "text/vcard",
      } as unknown as Blob);
      const response = await fetch(`${getApiBaseUrl()}/contact/analyze-vcf`, {
        method: "POST",
        headers: { Authorization: `Bearer ${session.token}` },
        body: formData,
      });
      const json = (await response.json()) as {
        success?: boolean;
        message?: string;
        data?: { summary?: { totalContacts: number; newContacts: number; existingContacts: number } };
      };
      if (!response.ok || json.success !== true) {
        throw new Error(json.message || "Failed to upload");
      }
      setCloudUploadVisible(false);
      setCloudUploadFile(null);
      setCloudUploadName("");
      setCloudUploadCaseId("");
      const summary = json.data?.summary;
      Alert.alert(
        "Upload complete",
        summary
          ? `Total: ${summary.totalContacts}, New: ${summary.newContacts}, Existing: ${summary.existingContacts}`
          : (json.message || "Contacts uploaded to cloud."),
      );
    } catch (e) {
      Alert.alert("Upload failed", String(e));
    } finally {
      setCloudLoadingMessage("");
      setIsUploadingVcf(false);
    }
  }, [session, cloudUploadFile, cloudUploadName, cloudUploadCaseId]);

  const handleRestoreCallLogs = useCallback(() => {
    const run = async () => {
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
        Alert.alert(
          "Default Phone App Required",
          "To restore call logs, Data Guard must be the default Phone app temporarily. You can switch your preferred app back later.",
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Continue",
              onPress: () => {
                requestDefaultPhoneApp()
                  .then((granted) => {
                    if (!granted) {
                      Alert.alert(
                        "Default Phone app not set",
                        "Data Guard is still not your default Phone app.",
                      );
                      return;
                    }
                    run().catch((error) => {
                      const errMsg = String(error);
                      const notDefault =
                        errMsg.includes("default Phone app") ||
                        (error as { code?: string })?.code ===
                          "ERR_NOT_DEFAULT_DIALER";
                      if (notDefault) {
                        Alert.alert(
                          "Default Phone app required",
                          "Please set Data Guard as your default Phone app in Settings, then try Restore again.",
                        );
                      } else {
                        Alert.alert("Restore failed", errMsg);
                      }
                    });
                  })
                  .catch((error) => {
                    Alert.alert(
                      "Unable to open Phone default screen",
                      String(error),
                    );
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
        const msg = String(error);
        const isNotDefault =
          msg.includes("default Phone app") ||
          (error as { code?: string })?.code === "ERR_NOT_DEFAULT_DIALER";
        if (isNotDefault) {
          Alert.alert(
            "Default Phone app required",
            "Please set Data Guard as your default Phone app in Settings, then try Restore again.",
          );
        } else {
          Alert.alert("Restore failed", msg);
        }
      } finally {
        setLoading(false);
      }
    };

    run().catch((error) => {
      const msg = String(error);
      const isNotDefault =
        msg.includes("default Phone app") ||
        (error as { code?: string })?.code === "ERR_NOT_DEFAULT_DIALER";
      if (isNotDefault) {
        Alert.alert(
          "Default Phone app required",
          "Please set Data Guard as your default Phone app in Settings, then try Restore again.",
        );
      } else {
        Alert.alert("Restore failed", msg);
      }
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
          <GlassPanel
            className="w-full max-w-[360px] rounded-3xl border-[#1e293b]"
            contentStyle={{ padding: 20 }}
          >
            <View className="w-14 h-14 rounded-2xl bg-[#123347] items-center justify-center mb-4 self-center">
              <Ionicons name="checkmark-done" size={30} color="#22d3ee" />
            </View>
            <Text className="text-white text-center text-lg font-bold">
              {successModal.label} Backup Complete
            </Text>
            <Text className="text-[#9ca3af] text-center text-sm mt-1 mb-4">
              {successModal.count.toLocaleString()} items saved
            </Text>
            <GlassPanel
              className="mb-4 rounded-2xl border-[#1f2937]"
              contentStyle={{ padding: 12 }}
            >
              <Text className="text-[#64748b] text-[11px] uppercase tracking-wider mb-1">
                Location
              </Text>
              <Text className="text-[#38bdf8] text-xs" numberOfLines={3}>
                {successModal.path}
              </Text>
            </GlassPanel>
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
                className="flex-1 rounded-xl bg-[#2563eb] py-3 active:opacity-80"
              >
                <Text className="text-white text-center font-bold">Done</Text>
              </Pressable>
            </View>
          </GlassPanel>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={cloudLoadingMessage !== ""}
        statusBarTranslucent
      >
        <View className="flex-1 bg-black/60 justify-center items-center px-6">
          <GlassPanel
            className="rounded-2xl border-[#1e293b] min-w-[200px]"
            contentStyle={{ padding: 24, alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text className="text-white text-base font-semibold mt-4">
              {cloudLoadingMessage}
            </Text>
          </GlassPanel>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={cloudUploadVisible}
        onRequestClose={() => {
          if (!isUploadingVcf) {
            setCloudUploadVisible(false);
            setCloudUploadFile(null);
          }
        }}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <GlassPanel
            className="w-full max-w-[360px] rounded-3xl border-[#1e293b]"
            contentStyle={{ padding: 20 }}
          >
            <View className="w-14 h-14 rounded-2xl bg-[#173f85] items-center justify-center mb-4 self-center">
              <Ionicons name="cloud-upload" size={28} color="#60a5fa" />
            </View>
            <Text className="text-white text-center text-xl font-bold mb-1">
              Upload to Cloud
            </Text>
            <Text className="text-[#9ca3af] text-center text-sm mb-4">
              Backup is ready. Enter name and title to upload.
            </Text>
            <Text className="text-[#94a3b8] text-[11px] font-semibold mb-1 uppercase">
              Name
            </Text>
            <GlassPanel
              className="mb-3 rounded-xl border-[#23324a]"
              contentStyle={{ paddingHorizontal: 12 }}
            >
              <TextInput
                value={cloudUploadName}
                onChangeText={setCloudUploadName}
                placeholder="e.g. My contacts backup"
                placeholderTextColor="#64748b"
                className="py-3 text-[#e2e8f0]"
              />
            </GlassPanel>
            <Text className="text-[#94a3b8] text-[11px] font-semibold mb-1 uppercase">
              Title
            </Text>
            <GlassPanel
              className="mb-4 rounded-xl border-[#23324a]"
              contentStyle={{ paddingHorizontal: 12 }}
            >
              <TextInput
                value={cloudUploadCaseId}
                onChangeText={setCloudUploadCaseId}
                placeholder="Enter title"
                placeholderTextColor="#64748b"
                className="py-3 text-[#e2e8f0]"
              />
            </GlassPanel>
            <View className="flex-row gap-3">
              <Pressable
                disabled={isUploadingVcf}
                onPress={() => {
                  setCloudUploadVisible(false);
                  setCloudUploadFile(null);
                  setCloudUploadName("");
                  setCloudUploadCaseId("");
                }}
                className="flex-1 rounded-xl border border-[#334155] bg-[#111827] py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-[#e5e7eb] text-center font-semibold">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={isUploadingVcf}
                onPress={handleCloudUploadSubmit}
                className="flex-1 rounded-xl bg-[#2563eb] py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-white text-center font-bold">
                  {isUploadingVcf ? "Uploading..." : "Upload"}
                </Text>
              </Pressable>
            </View>
          </GlassPanel>
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
          {session ? (
            <Pressable
              onPress={() => router.push("/history")}
              className="w-12 h-12 rounded-full border border-[#1d3354] bg-[#1a2942] items-center justify-center active:opacity-80"
            >
              <Ionicons name="person" size={22} color="#e2e8f0" />
            </Pressable>
          ) : (
            <View className="flex-row items-center gap-2">
              <Pressable
                onPress={() => router.push("/history?tab=local")}
                className="rounded-full border border-[#1d3354] bg-[#1a2942] px-3 py-2.5 flex-row items-center gap-1.5 active:opacity-80"
              >
                <Ionicons name="folder-open-outline" size={18} color="#e2e8f0" />
                <Text className="text-[#e2e8f0] text-sm font-semibold">
                  Local backups
                </Text>
              </Pressable>
              <Pressable
                onPress={() => router.push("/(tabs)/firstTab")}
                className="rounded-full border border-[#1d3354] bg-[#1a2942] px-4 py-2.5 items-center justify-center active:opacity-80"
              >
                <Text className="text-[#e2e8f0] text-sm font-semibold">
                  Login
                </Text>
              </Pressable>
            </View>
          )}
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
        <GlassPanel className="mb-5 rounded-3xl" contentStyle={{ padding: 16 }}>
          <Text className="text-[#e2e8f0] text-sm font-semibold mb-2">
            Backup Destination
          </Text>
          <Text className="text-[#7dd3fc] text-xs" numberOfLines={2}>
            {backupPath}
          </Text>
          <View className="flex-row items-center mt-3">
            <Ionicons name="lock-closed-outline" size={14} color="#cbd5e1" />
            <Text className="text-[#cbd5e1] text-xs ml-1.5">
              Stored only on this device
            </Text>
          </View>
        </GlassPanel>

        <BackupCard
          icon="people"
          label="Contacts"
          count={contactsCount}
          onBackup={handleBackupContactsPress}
          onRestore={handleRestoreContacts}
          loading={loading || isUploadingVcf}
          accentBg="bg-[#132e4f]"
          accentText="#7dd3fc"
        />
        <BackupCard
          icon="chatbubbles"
          label="Messages"
          count={messagesCount}
          onBackup={handleBackupMessagesPress}
          onRestore={handleRestoreMessages}
          loading={loading || isUploadingVcf}
          accentBg="bg-[#10302a]"
          accentText="#5eead4"
        />
        <BackupCard
          icon="call"
          label="Call Logs"
          count={callLogsCount}
          onBackup={handleBackupCallLogsPress}
          onRestore={handleRestoreCallLogs}
          loading={loading || isUploadingVcf}
          accentBg="bg-[#35280f]"
          accentText="#fbbf24"
        />
      </ScrollView>
    </SafeAreaView>
  );
}
