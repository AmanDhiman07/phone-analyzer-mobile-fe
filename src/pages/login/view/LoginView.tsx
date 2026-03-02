import { Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { GlassPanel } from "@/components/GlassPanel";
import { LoginSuccessModal } from "./LoginSuccessModal";
import type { LoginViewModel } from "../types";

export function LoginView({
  isCheckingSession,
  mobileNumber,
  otp,
  isVerifyingOtp,
  isRequestingOtp,
  isAuthenticated,
  message,
  token,
  otpRequested,
  userData,
  loginSuccessModal,
  onMobileNumberChange,
  onOtpChange,
  onRequestOtp,
  onVerifyOtp,
  onResetToRequestStep,
  onCloseLoginSuccessModal,
  onContinueAfterLoginSuccess,
}: LoginViewModel) {
  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      {isCheckingSession ? null : (
        <>
          <LoginSuccessModal
            state={loginSuccessModal}
            userData={userData}
            onClose={onCloseLoginSuccessModal}
            onContinue={onContinueAfterLoginSuccess}
          />

          <View className="absolute -left-20 -top-24 h-72 w-72 rounded-full bg-[#0d2a4d]/50" />
          <View className="absolute -right-24 bottom-24 h-72 w-72 rounded-full bg-[#0f3a37]/40" />

          <View className="flex-1 px-5 pt-4">
            <GlassPanel
              className="rounded-3xl border-[#1f2937]"
              contentStyle={{ padding: 20 }}
            >
              <Text className="text-3xl font-bold text-white">
                Organization Login
              </Text>
              <Text className="mb-6 mt-2 text-sm text-[#94a3b8]">
                Enter your mobile number to get OTP, then verify to login.
              </Text>

              <View className="mb-4">
                <View className="mb-2 flex-row items-center justify-between">
                  <Text className="text-sm font-semibold text-[#e2e8f0]">
                    Mobile Number
                  </Text>
                  {otpRequested && !isAuthenticated ? (
                    <Pressable onPress={onResetToRequestStep}>
                      <Text className="text-xs font-semibold text-[#38bdf8]">
                        Change Number
                      </Text>
                    </Pressable>
                  ) : null}
                </View>

                <GlassPanel
                  className="rounded-xl border-[#243041]"
                  contentStyle={{ paddingHorizontal: 12 }}
                >
                  <View className="flex-row items-center">
                    <Ionicons name="call-outline" size={18} color="#7dd3fc" />
                    <TextInput
                      value={mobileNumber}
                      onChangeText={onMobileNumberChange}
                      placeholder="Enter mobile number"
                      placeholderTextColor="#6b7280"
                      keyboardType="number-pad"
                      maxLength={10}
                      editable={!isAuthenticated}
                      className="flex-1 py-3.5 pl-2 text-[#e2e8f0]"
                    />
                  </View>
                </GlassPanel>
              </View>

              {otpRequested || isAuthenticated ? (
                <View className="mb-4">
                  <View className="mb-2 flex-row items-center justify-between">
                    <Text className="text-sm font-semibold text-[#e2e8f0]">
                      Enter OTP
                    </Text>
                    {!isAuthenticated ? (
                      <Pressable
                        disabled={isRequestingOtp}
                        onPress={onRequestOtp}
                        className="active:opacity-80 disabled:opacity-50"
                      >
                        <Text className="text-xs font-semibold text-[#38bdf8]">
                          Resend OTP
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  <GlassPanel
                    className="rounded-xl border-[#243041]"
                    contentStyle={{ paddingHorizontal: 12 }}
                  >
                    <TextInput
                      value={otp}
                      onChangeText={onOtpChange}
                      placeholder="Enter OTP"
                      placeholderTextColor="#6b7280"
                      keyboardType="number-pad"
                      maxLength={6}
                      editable={!isAuthenticated}
                      className="py-3.5 text-[#e2e8f0]"
                    />
                  </GlassPanel>
                </View>
              ) : null}

              {!otpRequested ? (
                <Pressable
                  disabled={isRequestingOtp}
                  onPress={onRequestOtp}
                  className="rounded-xl bg-[#2563eb] py-3.5 active:opacity-80 disabled:opacity-50"
                >
                  <Text className="text-center font-bold text-white">
                    {isRequestingOtp ? "Requesting OTP..." : "Get OTP"}
                  </Text>
                </Pressable>
              ) : (
                <Pressable
                  disabled={isVerifyingOtp || isAuthenticated}
                  onPress={onVerifyOtp}
                  className="rounded-xl bg-[#2563eb] py-3.5 active:opacity-80 disabled:opacity-50"
                >
                  <Text className="text-center font-bold text-white">
                    {isAuthenticated
                      ? "Logged In"
                      : isVerifyingOtp
                        ? "Verifying..."
                        : "Verify & Login"}
                  </Text>
                </Pressable>
              )}

              {message ? (
                <Text className="mt-4 text-sm text-[#93c5fd]">{message}</Text>
              ) : null}
            </GlassPanel>

            {isAuthenticated && userData ? (
              <GlassPanel
                className="mt-4 rounded-3xl border-[#1f2937]"
                contentStyle={{ padding: 20 }}
              >
                <Text className="mb-3 text-lg font-bold text-white">
                  Logged In User
                </Text>
                <Text className="text-sm text-[#cbd5e1]">
                  Name: {userData.name}
                </Text>
                <Text className="mt-1 text-sm text-[#cbd5e1]">
                  Mobile: {userData.mobileNumber}
                </Text>
                <Text className="mt-1 text-sm text-[#cbd5e1]">
                  Role: {userData.role}
                </Text>
                <Text className="mt-1 text-sm text-[#cbd5e1]">
                  Active: {userData.active ? "Yes" : "No"}
                </Text>
                <Text className="mt-3 text-xs text-[#7dd3fc]">
                  Token: {token}
                </Text>
              </GlassPanel>
            ) : null}
          </View>
        </>
      )}
    </SafeAreaView>
  );
}
