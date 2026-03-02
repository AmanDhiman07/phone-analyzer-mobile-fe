import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { GlassPanel } from "@/components/GlassPanel";
import type { LoginSuccessModalState, LoginUser } from "../types";

export function LoginSuccessModal({
  state,
  userData,
  onClose,
  onContinue,
}: {
  state: LoginSuccessModalState;
  userData: LoginUser | null;
  onClose: () => void;
  onContinue: () => void;
}) {
  return (
    <Modal
      transparent
      animationType="fade"
      visible={state.visible}
      onRequestClose={onClose}
    >
      <View className="flex-1 items-center justify-center bg-black/70 px-6">
        <GlassPanel
          className="w-full max-w-[360px] rounded-3xl border-[#1e293b]"
          contentStyle={{ padding: 20 }}
        >
          <View className="mb-4 h-14 w-14 self-center rounded-2xl bg-[#14324d] items-center justify-center">
            <Ionicons name="checkmark-done" size={30} color="#22d3ee" />
          </View>
          <Text className="text-center text-xl font-bold text-white">
            Login Successful
          </Text>
          <Text className="mb-4 mt-1 text-center text-sm text-[#94a3b8]">
            {state.message}
          </Text>

          {userData ? (
            <GlassPanel
              className="mb-4 rounded-2xl border-[#1f2937]"
              contentStyle={{ padding: 12 }}
            >
              <Text className="text-sm text-[#cbd5e1]">
                Name: {userData.name}
              </Text>
              <Text className="mt-1 text-sm text-[#93c5fd]">
                Mobile: {userData.mobileNumber}
              </Text>
            </GlassPanel>
          ) : null}

          <Pressable
            onPress={onContinue}
            className="rounded-xl bg-[#2563eb] py-3 active:opacity-80"
          >
            <Text className="text-center font-bold text-white">Continue</Text>
          </Pressable>
        </GlassPanel>
      </View>
    </Modal>
  );
}
