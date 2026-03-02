import { useCallback, useState } from "react";
import { Alert, Clipboard, Linking } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import {
  backupCallLogs,
  backupContacts,
  backupMessages,
  getBackupRootPath,
  getCallLogsCount,
  getContactsCount,
  getMessagesCount,
  listBackups,
  prepareBackupContactsVcf,
  restoreCallLogs,
  restoreContacts,
  restoreMessages,
} from "@/services/backup";
import {
  getAuthSession,
  type AuthSession,
} from "@/services/auth/sessionStorage";
import { uploadVcfFilesToCloud } from "@/services/cloud/vcfUploadService";
import {
  getDefaultSmsPackage,
  isDefaultPhoneApp,
  isDefaultSmsApp,
  requestDefaultPhoneApp,
  requestDefaultSmsApp,
  requestDefaultSmsPackage,
} from "@/services/permissions";
import type {
  CloudUploadFile,
  HomeViewModel,
  SuccessModalState,
} from "../types";

const EMPTY_SUCCESS_MODAL: SuccessModalState = {
  visible: false,
  label: "",
  count: 0,
  path: "",
};

export function useHomeScreen(): HomeViewModel {
  const router = useRouter();
  const [contactsCount, setContactsCount] = useState<number | null>(null);
  const [messagesCount, setMessagesCount] = useState<number | null>(null);
  const [callLogsCount, setCallLogsCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [successModal, setSuccessModal] =
    useState<SuccessModalState>(EMPTY_SUCCESS_MODAL);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [cloudUploadVisible, setCloudUploadVisible] = useState(false);
  const [cloudUploadName, setCloudUploadName] = useState("");
  const [cloudUploadCaseId, setCloudUploadCaseId] = useState("");
  const [cloudUploadFile, setCloudUploadFile] =
    useState<CloudUploadFile | null>(null);
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

  const closeSuccessModal = useCallback(() => {
    setSuccessModal((prev) => ({ ...prev, visible: false }));
  }, []);

  const onCopyPath = useCallback(() => {
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

  const onRefresh = useCallback(() => {
    const run = async () => {
      setRefreshing(true);
      await loadCounts();
      setRefreshing(false);
    };

    run().catch(() => {
      setRefreshing(false);
    });
  }, [loadCounts]);

  const handleBackupContacts = useCallback(async () => {
    setLoading(true);
    try {
      const { path, count } = await backupContacts();
      showBackupSuccess("Contacts", count, path);
      await loadCounts();
    } catch (error) {
      const handled = handleBackupPermissionDenied("Contacts", error);
      if (!handled) {
        Alert.alert("Backup failed", String(error));
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
    } catch (error) {
      Alert.alert("Restore failed", String(error));
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
    } catch (error) {
      const handled = handleBackupPermissionDenied("SMS", error);
      if (!handled) {
        Alert.alert("Backup failed", String(error));
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
        const message = String(error);
        const isNotDefault =
          message.includes("default SMS app") ||
          (error as { code?: string })?.code === "ERR_NOT_DEFAULT_SMS";

        if (isNotDefault) {
          Alert.alert(
            "Default SMS app required",
            "Please set Data Guard as your default SMS app in Settings, then try Restore again.",
          );
        } else {
          Alert.alert("SMS restore failed", message);
        }
      } finally {
        setLoading(false);
      }
    };

    run().catch((error) => {
      const message = String(error);
      const isNotDefault =
        message.includes("default SMS app") ||
        (error as { code?: string })?.code === "ERR_NOT_DEFAULT_SMS";

      if (isNotDefault) {
        Alert.alert(
          "Default SMS app required",
          "Please set Data Guard as your default SMS app in Settings, then try Restore again.",
        );
      } else {
        Alert.alert("SMS restore failed", message);
      }
    });
  }, [loadCounts]);

  const handleBackupCallLogs = useCallback(async () => {
    setLoading(true);
    try {
      const { path, count } = await backupCallLogs();
      showBackupSuccess("Call Logs", count, path);
      await loadCounts();
    } catch (error) {
      const handled = handleBackupPermissionDenied("Call log", error);
      if (!handled) {
        Alert.alert("Backup failed", String(error));
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
                    onPress: () => router.push("/login"),
                  },
                ],
              );
              return;
            }

            const run = async () => {
              setCloudLoadingMessage("Creating backup...");
              setLoading(true);
              try {
                const { count } = await backupContacts();
                if (count === 0) {
                  Alert.alert("No contacts", "No contacts to backup.");
                  return;
                }

                const backups = await listBackups();
                const latest = backups.find((item) => item.counts.contacts > 0);
                if (!latest) {
                  Alert.alert(
                    "Backup failed",
                    "Could not find the created backup.",
                  );
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
              } catch (error) {
                const handled = handleBackupPermissionDenied("Contacts", error);
                if (!handled) {
                  Alert.alert("Backup failed", String(error));
                }
              } finally {
                setCloudLoadingMessage("");
                setLoading(false);
              }
            };

            run().catch((error) => {
              setCloudLoadingMessage("");
              setLoading(false);
              Alert.alert("Backup failed", String(error));
            });
          },
        },
      ],
    );
  }, [session, handleBackupContacts, handleBackupPermissionDenied, router]);

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
                {
                  text: "Store locally",
                  onPress: () => handleBackupMessages(),
                },
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
                {
                  text: "Store locally",
                  onPress: () => handleBackupCallLogs(),
                },
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
      const result = await uploadVcfFilesToCloud({
        token: session.token,
        userName: cloudUploadName.trim(),
        caseId: cloudUploadCaseId.trim(),
        files: [
          {
            uri: cloudUploadFile.uri,
            name: cloudUploadFile.name,
            mimeType: cloudUploadFile.mimeType,
          },
        ],
      });

      setCloudUploadVisible(false);
      setCloudUploadFile(null);
      setCloudUploadName("");
      setCloudUploadCaseId("");

      const summary = result.summary;
      Alert.alert(
        "Upload complete",
        summary
          ? `Total: ${summary.totalContacts}, New: ${summary.newContacts}, Existing: ${summary.existingContacts}`
          : result.message || "Contacts uploaded to cloud.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload.";
      Alert.alert("Upload failed", message);
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
        const message = String(error);
        const isNotDefault =
          message.includes("default Phone app") ||
          (error as { code?: string })?.code === "ERR_NOT_DEFAULT_DIALER";

        if (isNotDefault) {
          Alert.alert(
            "Default Phone app required",
            "Please set Data Guard as your default Phone app in Settings, then try Restore again.",
          );
        } else {
          Alert.alert("Restore failed", message);
        }
      } finally {
        setLoading(false);
      }
    };

    run().catch((error) => {
      const message = String(error);
      const isNotDefault =
        message.includes("default Phone app") ||
        (error as { code?: string })?.code === "ERR_NOT_DEFAULT_DIALER";

      if (isNotDefault) {
        Alert.alert(
          "Default Phone app required",
          "Please set Data Guard as your default Phone app in Settings, then try Restore again.",
        );
      } else {
        Alert.alert("Restore failed", message);
      }
    });
  }, [loadCounts]);

  const onCloudUploadClose = useCallback(() => {
    if (isUploadingVcf) return;
    setCloudUploadVisible(false);
    setCloudUploadFile(null);
  }, [isUploadingVcf]);

  const onCloudUploadCancel = useCallback(() => {
    if (isUploadingVcf) return;
    setCloudUploadVisible(false);
    setCloudUploadFile(null);
    setCloudUploadName("");
    setCloudUploadCaseId("");
  }, [isUploadingVcf]);

  const onOpenProfile = useCallback(() => {
    router.push("/history");
  }, [router]);

  const onOpenLocalBackups = useCallback(() => {
    router.push("/history?tab=local");
  }, [router]);

  const onOpenLogin = useCallback(() => {
    router.push("/login");
  }, [router]);

  return {
    contactsCount,
    messagesCount,
    callLogsCount,
    loading,
    refreshing,
    isUploadingVcf,
    backupPath: getBackupRootPath(),
    session,
    successModal,
    cloudLoadingMessage,
    cloudUploadVisible,
    cloudUploadName,
    cloudUploadCaseId,
    onRefresh,
    onCopyPath,
    onCloseSuccessModal: closeSuccessModal,
    onBackupContacts: handleBackupContactsPress,
    onBackupMessages: handleBackupMessagesPress,
    onBackupCallLogs: handleBackupCallLogsPress,
    onRestoreContacts: handleRestoreContacts,
    onRestoreMessages: handleRestoreMessages,
    onRestoreCallLogs: handleRestoreCallLogs,
    onOpenProfile,
    onOpenLocalBackups,
    onOpenLogin,
    onCloudUploadSubmit: () => {
      handleCloudUploadSubmit().catch((error) => {
        Alert.alert("Upload failed", String(error));
      });
    },
    onCloudUploadCancel,
    onCloudUploadClose,
    onCloudUploadNameChange: setCloudUploadName,
    onCloudUploadCaseIdChange: setCloudUploadCaseId,
  };
}
