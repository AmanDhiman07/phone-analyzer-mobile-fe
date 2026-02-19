import { useState, useCallback, useEffect, useMemo } from "react";
import {
  View,
  Text,
  Pressable,
  Modal,
  Alert,
  TextInput,
  PanResponder,
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
import {
  CloudBackupsPanel,
  HistoryHeader,
  HistorySidebar,
  HistoryTabSwitcher,
  LocalBackupsPanel,
  SessionStatusCard,
  type HistoryTab,
  type SelectedVcf,
} from "@/features/history";

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
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<BackupRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [uploadName, setUploadName] = useState("");
  const [caseId, setCaseId] = useState("");
  const [selectedFiles, setSelectedFiles] = useState<SelectedVcf[]>([]);
  const [isUploadingVcf, setIsUploadingVcf] = useState(false);
  const [uploadSuccessModal, setUploadSuccessModal] = useState<{
    visible: boolean;
    message: string;
    summary: {
      totalContacts: number;
      newContacts: number;
      existingContacts: number;
    } | null;
  }>({
    visible: false,
    message: "",
    summary: null,
  });

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
    setSidebarVisible(false);
    router.push("/(tabs)/firstTab");
  }, [router]);

  const handleSignOut = useCallback(async () => {
    await clearAuthSession();
    setSession(null);
    setActiveTab("local");
    setSidebarVisible(false);
  }, []);

  const handleAddVcf = useCallback(() => {
    setUploadModalVisible(true);
  }, []);

  const isVcfFile = useCallback((file: SelectedVcf) => {
    const name = file.name.toLowerCase();
    const uri = file.uri.toLowerCase();
    const mime = (file.mimeType ?? "").toLowerCase();

    const byExtension = name.endsWith(".vcf") || uri.includes(".vcf");
    const byMime =
      mime.includes("vcard") ||
      mime.includes("x-vcard") ||
      mime.includes("x-vcf") ||
      mime.includes("vcf");

    return byExtension || byMime;
  }, []);

  const handlePickVcfFiles = useCallback(async () => {
    try {
      let pickedFiles: SelectedVcf[] = [];

      try {
        const DocumentPicker = await import("expo-document-picker");
        const result = await DocumentPicker.getDocumentAsync({
          type: ["text/vcard", "text/x-vcard", "application/vcf", "*/*"],
          multiple: true,
          copyToCacheDirectory: true,
        });

        if (result.canceled) return;

        pickedFiles = result.assets.map((asset) => ({
          name: asset.name,
          uri: asset.uri,
          size: asset.size ?? 0,
          mimeType: asset.mimeType,
        }));
      } catch (pickerImportError) {
        const picked = await File.pickFileAsync();
        const files = Array.isArray(picked) ? picked : [picked];
        pickedFiles = files.map((file: any) => ({
          name: file.name,
          uri: file.uri,
          size: file.size,
          mimeType: file.mimeType ?? file.type,
        }));

        if (pickedFiles.length === 0) {
          throw pickerImportError;
        }
      }

      const onlyVcf = pickedFiles.filter(isVcfFile);

      if (onlyVcf.length === 0) {
        Alert.alert(
          "Invalid file",
          "Please select VCF contact files (.vcf / text-vcard).",
        );
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
  }, [isVcfFile]);

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
        type: file.mimeType || "text/vcard",
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

      const summary = json.data?.summary ?? null;
      setUploadSuccessModal({
        visible: true,
        message: json.message || "VCF analysis completed",
        summary,
      });
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

  const sidebarPanResponder = useMemo(
    () =>
      PanResponder.create({
        onMoveShouldSetPanResponderCapture: (_, gestureState) => {
          const isHorizontalSwipe = Math.abs(gestureState.dx) > 6;
          const isMostlyHorizontal =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return isHorizontalSwipe && isMostlyHorizontal;
        },
        onMoveShouldSetPanResponder: (_, gestureState) => {
          const isHorizontalSwipe = Math.abs(gestureState.dx) > 6;
          const isMostlyHorizontal =
            Math.abs(gestureState.dx) > Math.abs(gestureState.dy);
          return isHorizontalSwipe && isMostlyHorizontal;
        },
        onPanResponderMove: (_, gestureState) => {
          if (gestureState.dx < -36) {
            setSidebarVisible(false);
          }
        },
        onPanResponderRelease: (_, gestureState) => {
          const isLeftSwipe = gestureState.dx < -20;
          const hasSwipeVelocity = gestureState.vx < -0.12;
          if (isLeftSwipe || hasSwipeVelocity) {
            setSidebarVisible(false);
          }
        },
      }),
    [],
  );

  const sidebarRecentBackups = useMemo(
    () => (activeTab === "local" ? backups.slice(0, 3) : []),
    [activeTab, backups],
  );

  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      <HistorySidebar
        visible={sidebarVisible}
        session={session}
        activeTab={activeTab}
        recentBackups={sidebarRecentBackups}
        panHandlers={sidebarPanResponder.panHandlers}
        onClose={() => setSidebarVisible(false)}
        onSignOut={handleSignOut}
        onCloudLogin={handleCloudLogin}
        onSelectTab={(tab) => {
          setSidebarVisible(false);
          setActiveTab(tab);
        }}
        onDeleteBackup={handleDelete}
      />

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

      <Modal
        transparent
        animationType="fade"
        visible={uploadSuccessModal.visible}
        onRequestClose={() =>
          setUploadSuccessModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-3xl border border-[#1e293b] bg-[#0b1224] p-5">
            <View className="w-14 h-14 rounded-2xl bg-[#14324d] items-center justify-center mb-4 self-center">
              <Ionicons name="checkmark-done" size={30} color="#22d3ee" />
            </View>
            <Text className="text-white text-center text-xl font-bold">
              Upload Completed
            </Text>
            <Text className="text-[#94a3b8] text-center text-sm mt-1 mb-4">
              {uploadSuccessModal.message}
            </Text>

            {uploadSuccessModal.summary ? (
              <View className="rounded-2xl border border-[#1f2937] bg-[#111827] p-3 mb-4">
                <Text className="text-[#cbd5e1] text-sm">
                  Total Contacts: {uploadSuccessModal.summary.totalContacts}
                </Text>
                <Text className="text-[#86efac] text-sm mt-1">
                  New Contacts: {uploadSuccessModal.summary.newContacts}
                </Text>
                <Text className="text-[#93c5fd] text-sm mt-1">
                  Existing Contacts:{" "}
                  {uploadSuccessModal.summary.existingContacts}
                </Text>
              </View>
            ) : null}

            <Pressable
              onPress={() =>
                setUploadSuccessModal((prev) => ({ ...prev, visible: false }))
              }
              className="rounded-xl bg-[#2563eb] py-3 active:opacity-80"
            >
              <Text className="text-white text-center font-bold">Done</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View className="absolute -top-20 -left-20 w-64 h-64 rounded-full bg-[#0d2a4d]/50" />

      <HistoryHeader
        activeTab={activeTab}
        onOpenSidebar={() => setSidebarVisible(true)}
        onRefresh={() => {
          loadBackups();
          loadSession();
        }}
      />

      <View className="flex-1 px-4 pt-4">
        <SessionStatusCard
          session={session}
          onSignOut={handleSignOut}
          onCloudLogin={handleCloudLogin}
        />
        <HistoryTabSwitcher activeTab={activeTab} onChange={setActiveTab} />

        {activeTab === "local" ? (
          <LocalBackupsPanel
            backups={backups}
            onDelete={handleDelete}
            onGoHome={() => router.push("/home")}
          />
        ) : (
          <CloudBackupsPanel
            session={session}
            onCloudLogin={handleCloudLogin}
            onAddVcf={handleAddVcf}
          />
        )}
      </View>
    </SafeAreaView>
  );
}
