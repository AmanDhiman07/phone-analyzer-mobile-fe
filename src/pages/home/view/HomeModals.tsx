import {
  ActivityIndicator,
  Modal,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassPanel } from "@/components/GlassPanel";
import type { SuccessModalState } from "../types";

export function HomeModals({
  successModal,
  cloudLoadingMessage,
  cloudUploadVisible,
  cloudUploadName,
  cloudUploadCaseId,
  isUploadingVcf,
  onCopyPath,
  onCloseSuccessModal,
  onCloudUploadSubmit,
  onCloudUploadCancel,
  onCloudUploadClose,
  onCloudUploadNameChange,
  onCloudUploadCaseIdChange,
}: {
  successModal: SuccessModalState;
  cloudLoadingMessage: string;
  cloudUploadVisible: boolean;
  cloudUploadName: string;
  cloudUploadCaseId: string;
  isUploadingVcf: boolean;
  onCopyPath: () => void;
  onCloseSuccessModal: () => void;
  onCloudUploadSubmit: () => void;
  onCloudUploadCancel: () => void;
  onCloudUploadClose: () => void;
  onCloudUploadNameChange: (value: string) => void;
  onCloudUploadCaseIdChange: (value: string) => void;
}) {
  return (
    <>
      <Modal
        transparent
        animationType="fade"
        visible={successModal.visible}
        onRequestClose={onCloseSuccessModal}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <GlassPanel
            className="w-full max-w-[360px] rounded-3xl border-[#1e293b]"
            contentStyle={{ padding: 20 }}
          >
            <View className="mb-4 h-14 w-14 self-center rounded-2xl bg-[#123347] items-center justify-center">
              <Ionicons name="checkmark-done" size={30} color="#22d3ee" />
            </View>
            <Text className="text-center text-lg font-bold text-white">
              {successModal.label} Backup Complete
            </Text>
            <Text className="mb-4 mt-1 text-center text-sm text-[#9ca3af]">
              {successModal.count.toLocaleString()} items saved
            </Text>
            <GlassPanel
              className="mb-4 rounded-2xl border-[#1f2937]"
              contentStyle={{ padding: 12 }}
            >
              <Text className="mb-1 text-[11px] uppercase tracking-wider text-[#64748b]">
                Location
              </Text>
              <Text className="text-xs text-[#38bdf8]" numberOfLines={3}>
                {successModal.path}
              </Text>
            </GlassPanel>
            <View className="flex-row gap-3">
              <Pressable
                onPress={onCopyPath}
                className="flex-1 rounded-xl border border-[#334155] bg-[#111827] py-3 active:opacity-80"
              >
                <Text className="text-center font-semibold text-[#e5e7eb]">
                  Copy Path
                </Text>
              </Pressable>
              <Pressable
                onPress={onCloseSuccessModal}
                className="flex-1 rounded-xl bg-[#2563eb] py-3 active:opacity-80"
              >
                <Text className="text-center font-bold text-white">Done</Text>
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
        <View className="flex-1 items-center justify-center bg-black/60 px-6">
          <GlassPanel
            className="min-w-[200px] rounded-2xl border-[#1e293b]"
            contentStyle={{ padding: 24, alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#60a5fa" />
            <Text className="mt-4 text-base font-semibold text-white">
              {cloudLoadingMessage}
            </Text>
          </GlassPanel>
        </View>
      </Modal>

      <Modal
        transparent
        animationType="fade"
        visible={cloudUploadVisible}
        onRequestClose={onCloudUploadClose}
      >
        <View className="flex-1 items-center justify-center bg-black/70 px-6">
          <GlassPanel
            className="w-full max-w-[360px] rounded-3xl border-[#1e293b]"
            contentStyle={{ padding: 20 }}
          >
            <View className="mb-4 h-14 w-14 self-center rounded-2xl bg-[#173f85] items-center justify-center">
              <Ionicons name="cloud-upload" size={28} color="#60a5fa" />
            </View>
            <Text className="mb-1 text-center text-xl font-bold text-white">
              Upload to Cloud
            </Text>
            <Text className="mb-4 text-center text-sm text-[#9ca3af]">
              Backup is ready. Enter name and title to upload.
            </Text>

            <Text className="mb-1 text-[11px] font-semibold uppercase text-[#94a3b8]">
              Name
            </Text>
            <GlassPanel
              className="mb-3 rounded-xl border-[#23324a]"
              contentStyle={{ paddingHorizontal: 12 }}
            >
              <TextInput
                value={cloudUploadName}
                onChangeText={onCloudUploadNameChange}
                placeholder="e.g. My contacts backup"
                placeholderTextColor="#64748b"
                className="py-3 text-[#e2e8f0]"
              />
            </GlassPanel>

            <Text className="mb-1 text-[11px] font-semibold uppercase text-[#94a3b8]">
              Title
            </Text>
            <GlassPanel
              className="mb-4 rounded-xl border-[#23324a]"
              contentStyle={{ paddingHorizontal: 12 }}
            >
              <TextInput
                value={cloudUploadCaseId}
                onChangeText={onCloudUploadCaseIdChange}
                placeholder="Enter title"
                placeholderTextColor="#64748b"
                className="py-3 text-[#e2e8f0]"
              />
            </GlassPanel>

            <View className="flex-row gap-3">
              <Pressable
                disabled={isUploadingVcf}
                onPress={onCloudUploadCancel}
                className="flex-1 rounded-xl border border-[#334155] bg-[#111827] py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-center font-semibold text-[#e5e7eb]">
                  Cancel
                </Text>
              </Pressable>
              <Pressable
                disabled={isUploadingVcf}
                onPress={onCloudUploadSubmit}
                className="flex-1 rounded-xl bg-[#2563eb] py-3 active:opacity-80 disabled:opacity-50"
              >
                <Text className="text-center font-bold text-white">
                  {isUploadingVcf ? "Uploading..." : "Upload"}
                </Text>
              </Pressable>
            </View>
          </GlassPanel>
        </View>
      </Modal>
    </>
  );
}
