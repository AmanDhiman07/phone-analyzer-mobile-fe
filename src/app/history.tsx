import { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  FlatList,
  Modal,
  Alert,
  TextInput,
} from "react-native";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { File } from "expo-file-system";
import {
  listBackups,
  deleteBackup,
  formatSize,
  formatBackupDate,
} from "@/services/backup";
import {
  clearAuthSession,
  getAuthSession,
  type AuthSession,
} from "@/services/auth/sessionStorage";
import { getApiBaseUrl } from "@/services/auth/authService";
import type { BackupRecord } from "@/types/backup";

function getBackupPresentation(item: BackupRecord) {
  const hasContacts = item.counts.contacts > 0;
  const hasMessages = item.counts.messages > 0;
  const hasCallLogs = item.counts.callLogs > 0;
  const selectedCount = [hasContacts, hasMessages, hasCallLogs].filter(
    Boolean,
  ).length;

  if (selectedCount > 1) {
    return {
      title: "Device Backup",
      iconName: "phone-portrait-outline" as const,
      accentBg: "bg-[#132e4f]",
      accentText: "#7dd3fc",
    };
  }
  if (hasContacts) {
    return {
      title: "Contacts Backup",
      iconName: "people-outline" as const,
      accentBg: "bg-[#10302a]",
      accentText: "#5eead4",
    };
  }
  if (hasMessages) {
    return {
      title: "Messages Backup",
      iconName: "chatbubbles-outline" as const,
      accentBg: "bg-[#35280f]",
      accentText: "#fbbf24",
    };
  }
  if (hasCallLogs) {
    return {
      title: "Call Logs Backup",
      iconName: "call-outline" as const,
      accentBg: "bg-[#31234a]",
      accentText: "#c4b5fd",
    };
  }
  return {
    title: "Backup",
    iconName: "document-outline" as const,
    accentBg: "bg-[#1f2937]",
    accentText: "#cbd5e1",
  };
}

function BackupListItem({
  item,
  onDelete,
}: {
  item: BackupRecord;
  onDelete: () => void;
}) {
  const data = getBackupPresentation(item);

  return (
    <View className="flex-row items-center rounded-2xl border border-[#1f2937] bg-[#0f1729] p-3 mb-3">
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
        className="p-2 rounded-lg bg-[#1e293b] border border-[#2c3e56] mr-2 active:opacity-80"
        onPress={onDelete}
      >
        <Ionicons name="trash-outline" size={19} color="#f87171" />
      </Pressable>
    </View>
  );
}

type HistoryTab = "local" | "cloud";
type SelectedVcf = {
  name: string;
  uri: string;
  size: number;
};

export default function HistoryScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    tab?: string;
    token?: string;
    name?: string;
    mobileNumber?: string;
    role?: string;
    active?: string;
  }>();
  const [activeTab, setActiveTab] = useState<HistoryTab>("local");
  const [backups, setBackups] = useState<BackupRecord[]>([]);
  const [session, setSession] = useState<AuthSession | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [caseId, setCaseId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedVcf[]>([]);
  const [isUploadingVcf, setIsUploadingVcf] = useState(false);

  useEffect(() => {
    if (params.tab === "cloud") {
      setActiveTab("cloud");
      return;
    }
    if (params.tab === "local") {
      setActiveTab("local");
    }
  }, [params.tab]);

  useEffect(() => {
    if (!params.name || !params.mobileNumber) return;

    setSession((prev) => {
      if (prev) return prev;
      return {
        token: params.token ?? "",
        user: {
          name: params.name,
          mobileNumber: params.mobileNumber,
          role: params.role ?? "user",
          active: params.active === "true",
        },
      };
    });
  }, [
    params.active,
    params.mobileNumber,
    params.name,
    params.role,
    params.token,
  ]);

  const loadBackups = useCallback(async () => {
    const list = await listBackups();
    setBackups(list);
  }, []);

  const loadSession = useCallback(async () => {
    const value = await getAuthSession();
    if (value) setSession(value);
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBackups();
      loadSession();
    }, [loadBackups, loadSession]),
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

  const handleCloudLogin = useCallback(() => {
    router.push("/(tabs)/firstTab");
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await clearAuthSession();
    setSession(null);
    setActiveTab("local");
  }, []);

  const handleAddVcf = useCallback(() => {
    setUploadModalVisible(true);
  }, []);

  const handlePickVcfFiles = useCallback(async () => {
    try {
      let pickedFiles: SelectedVcf[] = [];

      try {
        const DocumentPicker = await import("expo-document-picker");
        const result = await DocumentPicker.getDocumentAsync({
          type: "*/*",
          multiple: true,
          copyToCacheDirectory: true,
        });

        if (result.canceled) return;

        pickedFiles = result.assets.map((asset) => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size ?? 0,
        }));
      } catch (pickerImportError) {
        const picked = await File.pickFileAsync();
        const files = Array.isArray(picked) ? picked : [picked];
        pickedFiles = files.map((file) => ({
          name: file.name,
          uri: file.uri,
          size: file.size,
        }));

        if (pickedFiles.length === 0) {
          throw pickerImportError;
        }
      }

      const onlyVcf = pickedFiles.filter((file) =>
        file.name.toLowerCase().endsWith(".vcf"),
      );

      if (onlyVcf.length === 0) {
        Alert.alert("Invalid file", "Please select .vcf files only.");
        return;
      }

      setSelectedFiles((prev) => {
        const dedup = new Map(prev.map((item) => [item.uri, item]));
        for (const file of onlyVcf) {
          dedup.set(file.uri, file);
        }
        const merged = Array.from(dedup.values());
        if (merged.length > 20) {
          Alert.alert("Limit exceeded", "Maximum 20 files are allowed.");
          return merged.slice(0, 20);
        }
        return merged;
      });
    } catch (error) {
      if (error instanceof Error && error.message === "User canceled") {
        return;
      }
      const errorMessage =
        error instanceof Error ? error.message : "Unable to pick VCF files.";
      Alert.alert("File selection failed", errorMessage);
    }
  }, []);

  const handleRemoveSelectedFile = useCallback((uri: string) => {
    setSelectedFiles((prev) => prev.filter((file) => file.uri !== uri));
  }, []);

  const handleUploadVcf = useCallback(async () => {
    if (isUploadingVcf) return;

    if (!session?.token) {
      Alert.alert("Login required", "Please login to cloud first.");
      return;
    }

    if (!uploadName.trim()) {
      Alert.alert("Name required", "Please enter a backup name.");
      return;
    }
    if (!caseId.trim()) {
      Alert.alert("Case ID required", "Please enter the case ID.");
      return;
    }
    if (selectedFiles.length === 0) {
      Alert.alert("No files selected", "Please select one or more VCF files.");
      return;
    }
    if (selectedFiles.length > 20) {
      Alert.alert("Limit exceeded", "Maximum 20 files are allowed.");
      return;
    }
    if (selectedFiles.some((file) => file.size > 10 * 1024 * 1024)) {
      Alert.alert("File too large", "Each file must be 10MB or less.");
      return;
    }

    const formData = new FormData();
    formData.append("userName", uploadName.trim());
    formData.append("caseId", caseId.trim());
    selectedFiles.forEach((file) => {
      formData.append("vcfFiles", {
        uri: file.uri,
        name: file.name,
        type: "text/vcard",
      } as unknown as Blob);
    });

    setIsUploadingVcf(true);
    try {
      const response = await fetch(`${getApiBaseUrl()}/contact/analyze-vcf`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.token}`,
        },
        body: formData,
      });
      const json = (await response.json()) as {
        statusCode?: number;
        success?: boolean;
        message?: string;
        data?: {
          caseId?: string;
          summary?: {
            totalContacts: number;
            newContacts: number;
            existingContacts: number;
          };
        };
      };

      if (!response.ok || json.success !== true) {
        throw new Error(json.message || "Failed to upload VCF files");
      }

      const summary = json.data?.summary;
      const summaryText = summary
        ? `\nTotal: ${summary.totalContacts}\nNew: ${summary.newContacts}\nExisting: ${summary.existingContacts}`
        : "";

      Alert.alert(
        "Upload completed",
        `${json.message || "VCF analysis completed"}${summaryText}`,
      );
      setUploadModalVisible(false);
      setUploadName("");
      setCaseId("");
      setSelectedFiles([]);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to upload VCF files";
      Alert.alert("Upload failed", message);
    } finally {
      setIsUploadingVcf(false);
    }
  }, [caseId, isUploadingVcf, selectedFiles, session?.token, uploadName]);

  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      <Modal
        transparent
        animationType="fade"
        visible={!!deleteTarget}
        onRequestClose={() => {
          if (!isDeleting) setDeleteTarget(null);
        }}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-3xl border border-[#1e293b] bg-[#070d1d] p-5">
            <View className="w-14 h-14 rounded-2xl bg-[#3f1d1d] items-center justify-center mb-4 self-center">
              <Ionicons name="trash-outline" size={28} color="#f87171" />
            </View>
            <Text className="text-white text-center text-lg font-bold mb-1">
              Delete Backup?
            </Text>
            <Text className="text-[#9ca3af] text-center text-sm mb-4">
              This action is permanent and cannot be undone.
            </Text>
            <View className="rounded-2xl border border-[#1f2937] bg-[#0f172a] p-3 mb-4">
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
                className="flex-1 rounded-xl border border-[#334155] bg-[#111827] py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-[#e5e7eb] text-center font-semibold">
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

      <Modal
        transparent
        animationType="fade"
        visible={uploadModalVisible}
        onRequestClose={() => setUploadModalVisible(false)}
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-3xl border border-[#1e293b] bg-[#111c33] p-5">
            <View className="w-14 h-14 rounded-2xl bg-[#173f85] items-center justify-center mb-4 self-center">
              <Ionicons name="cloud-upload" size={28} color="#60a5fa" />
            </View>
            <Text className="text-white text-center text-2xl font-bold mb-1">
              Upload to Cloud?
            </Text>
            <Text className="text-[#9ca3af] text-center text-sm mb-4">
              Add details and upload one or more VCF files.
            </Text>

            <Text className="text-[#94a3b8] text-[11px] font-semibold mb-1 uppercase">
              Name
            </Text>
            <View className="rounded-xl border border-[#23324a] bg-[#0f1729] px-3 mb-3">
              <TextInput
                value={uploadName}
                onChangeText={setUploadName}
                placeholder="e.g., Work Contacts Oct 2023"
                placeholderTextColor="#64748b"
                className="py-3 text-[#e2e8f0]"
              />
            </View>

            <Text className="text-[#94a3b8] text-[11px] font-semibold mb-1 uppercase">
              Case ID
            </Text>
            <View className="rounded-xl border border-[#23324a] bg-[#0f1729] px-3 mb-3">
              <TextInput
                value={caseId}
                onChangeText={setCaseId}
                placeholder="Enter case ID"
                placeholderTextColor="#64748b"
                className="py-3 text-[#e2e8f0]"
              />
            </View>

            <Pressable
              onPress={handlePickVcfFiles}
              disabled={isUploadingVcf}
              className="rounded-xl border border-[#2c4f88] bg-[#162746] py-3 mb-3 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-[#93c5fd] text-center font-semibold">
                Add VCF File
              </Text>
            </Pressable>
            <Text className="text-[#64748b] text-[11px] mb-2">
              Add files one by one. You can upload up to 20 files.
            </Text>

            {selectedFiles.length > 0 ? (
              <View className="rounded-xl border border-[#1f2937] bg-[#0b1224] px-3 py-2 mb-3">
                {selectedFiles.map((file) => (
                  <View
                    key={file.uri}
                    className="flex-row items-center justify-between py-1.5"
                  >
                    <Text
                      numberOfLines={1}
                      className="text-[#cbd5e1] text-xs flex-1 mr-2"
                    >
                      {file.name}
                    </Text>
                    <Pressable
                      onPress={() => handleRemoveSelectedFile(file.uri)}
                      className="active:opacity-80"
                    >
                      <Ionicons name="close-circle" size={18} color="#f87171" />
                    </Pressable>
                  </View>
                ))}
              </View>
            ) : null}

            <Pressable
              onPress={handleUploadVcf}
              disabled={isUploadingVcf}
              className="rounded-xl bg-[#2563eb] py-3.5 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-white text-center font-bold">
                {isUploadingVcf ? "Uploading..." : "Upload"}
              </Text>
            </Pressable>
            <Pressable
              disabled={isUploadingVcf}
              onPress={() => setUploadModalVisible(false)}
              className="py-3.5 mt-1 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-[#94a3b8] text-center font-semibold">
                Cancel
              </Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#0d2a4d]/50" />

      <View className="px-4 pt-2 pb-4 border-b border-[#1e293b]">
        <View className="flex-row items-center justify-between">
          <Pressable
            onPress={() => router.back()}
            className="w-11 h-11 rounded-2xl border border-[#23324a] bg-[#0f1729] items-center justify-center active:opacity-80"
          >
            <Ionicons name="arrow-back" size={21} color="#e2e8f0" />
          </Pressable>
          <Text className="text-white text-lg font-bold">History</Text>
          <Pressable
            onPress={() => {
              loadBackups();
              loadSession();
            }}
            className="w-11 h-11 rounded-2xl border border-[#23324a] bg-[#0f1729] items-center justify-center active:opacity-80"
          >
            <Ionicons name="refresh-outline" size={21} color="#7dd3fc" />
          </Pressable>
        </View>
      </View>

      <View className="flex-1 px-4 pt-4">
        {session ? (
          <View className="rounded-2xl border border-[#1f2937] bg-[#0b1224] px-4 py-4 mb-4">
            <View className="flex-row items-center">
              <View className="w-11 h-11 rounded-xl bg-[#10302a] items-center justify-center mr-3">
                <Ionicons name="person-outline" size={21} color="#5eead4" />
              </View>
              <View className="flex-1">
                <Text className="text-[#e2e8f0] text-base font-semibold">
                  {session.user.name}
                </Text>
                <Text className="text-[#94a3b8] text-xs mt-0.5">
                  {session.user.mobileNumber}
                </Text>
              </View>
              <Pressable onPress={handleSignOut} className="active:opacity-80">
                <Text className="text-[#22c55e] text-xs font-semibold">
                  SIGN OUT
                </Text>
              </Pressable>
            </View>
          </View>
        ) : (
          <View className="rounded-2xl border border-[#1f2937] bg-[#0b1224] px-4 py-4 mb-4">
            <View className="flex-row items-center mb-3">
              <View className="w-11 h-11 rounded-xl bg-[#132e4f] items-center justify-center mr-3">
                <Ionicons name="cloud-outline" size={22} color="#7dd3fc" />
              </View>
              <View className="flex-1">
                <Text className="text-[#e2e8f0] text-sm font-semibold">
                  Cloud Access
                </Text>
                <Text className="text-[#94a3b8] text-xs mt-0.5">
                  Login to your organization account for cloud backups.
                </Text>
              </View>
            </View>
            <Pressable
              onPress={handleCloudLogin}
              className="rounded-xl bg-[#0ea5e9] py-3 active:opacity-80"
            >
              <Text className="text-[#031324] text-center font-bold">
                Login to Cloud
              </Text>
            </Pressable>
          </View>
        )}

        <View className="rounded-2xl border border-[#2a384d] bg-[#0b1224] p-1 mb-4 flex-row">
          <Pressable
            onPress={() => setActiveTab("local")}
            className={`flex-1 rounded-xl py-2.5 ${activeTab === "local" ? "bg-[#334155]" : ""}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${activeTab === "local" ? "text-[#cbd5e1]" : "text-[#64748b]"}`}
            >
              Local Backups
            </Text>
          </Pressable>
          <Pressable
            onPress={() => setActiveTab("cloud")}
            className={`flex-1 rounded-xl py-2.5 ${activeTab === "cloud" ? "bg-[#334155]" : ""}`}
          >
            <Text
              className={`text-center text-sm font-semibold ${activeTab === "cloud" ? "text-[#cbd5e1]" : "text-[#64748b]"}`}
            >
              Cloud Backups
            </Text>
          </Pressable>
        </View>

        {activeTab === "local" ? (
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
              </View>
            ) : (
              <FlatList
                data={backups}
                keyExtractor={(item) => item.folderName}
                renderItem={({ item }) => (
                  <BackupListItem
                    item={item}
                    onDelete={() => handleDelete(item)}
                  />
                )}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={{ paddingBottom: 24 }}
              />
            )}
          </>
        ) : (
          <View className="rounded-2xl border border-[#1f2937] bg-[#0b1224] px-4 py-4">
            <View className="flex-row items-center mb-3">
              <View className="w-11 h-11 rounded-xl bg-[#132e4f] items-center justify-center mr-3">
                <Ionicons
                  name="cloud-upload-outline"
                  size={22}
                  color="#7dd3fc"
                />
              </View>
              <View className="flex-1">
                <Text className="text-[#e2e8f0] text-base font-semibold">
                  Cloud Backups
                </Text>
                <Text className="text-[#94a3b8] text-xs mt-0.5">
                  Upload and manage VCF files in your cloud account.
                </Text>
              </View>
            </View>

            {!session ? (
              <Pressable
                onPress={handleCloudLogin}
                className="rounded-xl bg-[#2563eb] py-3 active:opacity-80"
              >
                <Text className="text-white text-center font-bold">
                  Login to Continue
                </Text>
              </Pressable>
            ) : (
              <>
                <Pressable
                  onPress={handleAddVcf}
                  className="rounded-xl bg-[#2563eb] py-3 active:opacity-80"
                >
                  <Text className="text-white text-center font-bold">
                    Upload VCF to Cloud
                  </Text>
                </Pressable>
                <Text className="text-[#64748b] text-xs mt-3 text-center">
                  Cloud backup list will appear here.
                </Text>
              </>
            )}
          </View>
        )}
      </View>
    </SafeAreaView>
  );
}
