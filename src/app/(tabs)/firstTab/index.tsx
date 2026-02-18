import { useEffect, useMemo, useState } from "react";
import { Alert, Modal, Pressable, Text, TextInput, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { loginRequest, verifyOtp } from "@/services/auth/authService";
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from "@/services/auth/sessionStorage";

export default function FirstTab() {
  const router = useRouter();
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [loginSuccessModal, setLoginSuccessModal] = useState<{
    visible: boolean;
    message: string;
    redirectPath: string;
  }>({
    visible: false,
    message: "",
    redirectPath: "",
  });
  const [userData, setUserData] = useState<{
    name: string;
    mobileNumber: string;
    role: string;
    active: boolean;
  } | null>(null);

  const normalizedMobileNumber = useMemo(
    () => mobileNumber.replace(/\D/g, ""),
    [mobileNumber],
  );
  const normalizedOtp = useMemo(() => otp.replace(/\D/g, ""), [otp]);

  const otpRequested = isOtpStep || isAuthenticated;

  useEffect(() => {
    let isMounted = true;

    const restoreSession = async () => {
      try {
        const session = await getAuthSession();
        if (!isMounted || !session) return;

        setToken(session.token);
        setUserData(session.user);
        setMobileNumber(session.user.mobileNumber);
        setIsAuthenticated(true);
        setIsOtpStep(true);
        setMessage("Cloud session restored");
      } catch (error) {
        console.error("Failed to restore auth session:", error);
      }
    };

    restoreSession();

    return () => {
      isMounted = false;
    };
  }, [router]);

  const handleRequestOtp = async () => {
    if (isRequestingOtp) return;

    if (normalizedMobileNumber.length !== 10) {
      Alert.alert(
        "Invalid mobile number",
        "Please enter a valid 10-digit number.",
      );
      return;
    }

    setIsRequestingOtp(true);
    setMessage("");

    try {
      const response = await loginRequest(normalizedMobileNumber);
      const responseMessage = response.message || "OTP request processed";
      const isRequestSuccessful = response.status !== false;
      setMessage(responseMessage);

      if (!isRequestSuccessful) {
        Alert.alert("OTP request failed", responseMessage);
        setIsOtpStep(false);
      } else {
        setIsOtpStep(true);
      }
    } catch (error) {
      console.error("Error requesting OTP:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send OTP";
      setMessage(errorMessage);
      setIsOtpStep(false);
      Alert.alert("OTP request failed", errorMessage);
    } finally {
      setIsRequestingOtp(false);
    }
  };

  const handleVerifyOtp = async () => {
    if (isVerifyingOtp) return;

    if (normalizedMobileNumber.length !== 10) {
      Alert.alert(
        "Invalid mobile number",
        "Please enter a valid 10-digit number.",
      );
      return;
    }

    if (normalizedOtp.length < 4) {
      Alert.alert("Invalid OTP", "Please enter the OTP sent to your mobile.");
      return;
    }

    setIsVerifyingOtp(true);

    try {
      const response = await verifyOtp(normalizedMobileNumber, normalizedOtp);
      const responseMessage = response.message || "OTP verification failed";
      const isVerifySuccessful = response.status !== false && !!response.data;

      if (!isVerifySuccessful) {
        Alert.alert("Verification failed", responseMessage);
        return;
      }

      setToken(response.data.token);
      setUserData(response.data.user);
      setMobileNumber(response.data.user.mobileNumber);
      setIsAuthenticated(true);
      setIsOtpStep(true);
      setMessage(response.message || "OTP verified successfully");
      await saveAuthSession({
        token: response.data.token,
        user: response.data.user,
      });
      const query = new URLSearchParams({
        tab: "cloud",
        name: response.data.user.name,
        mobileNumber: response.data.user.mobileNumber,
        role: response.data.user.role,
        active: String(response.data.user.active),
        token: response.data.token,
      }).toString();
      setLoginSuccessModal({
        visible: true,
        message: response.message || "OTP verified successfully",
        redirectPath: `/history?${query}`,
      });
    } catch (error) {
      console.error("Error verifying OTP:", error);
      Alert.alert("Verification failed", "Failed to verify OTP");
    } finally {
      setIsVerifyingOtp(false);
    }
  };

  const resetToRequestStep = () => {
    clearAuthSession().catch((error) => {
      console.error("Failed to clear auth session:", error);
    });
    setOtp("");
    setMessage("");
    setIsOtpStep(false);
    setIsAuthenticated(false);
    setToken("");
    setUserData(null);
  };

  return (
    <SafeAreaView className="flex-1 bg-[#050a17]" edges={["top", "bottom"]}>
      <Modal
        transparent
        animationType="fade"
        visible={loginSuccessModal.visible}
        onRequestClose={() =>
          setLoginSuccessModal((prev) => ({ ...prev, visible: false }))
        }
      >
        <View className="flex-1 bg-black/70 items-center justify-center px-6">
          <View className="w-full max-w-[360px] rounded-3xl border border-[#1e293b] bg-[#0b1224] p-5">
            <View className="w-14 h-14 rounded-2xl bg-[#14324d] items-center justify-center mb-4 self-center">
              <Ionicons name="checkmark-done" size={30} color="#22d3ee" />
            </View>
            <Text className="text-white text-center text-xl font-bold">
              Login Successful
            </Text>
            <Text className="text-[#94a3b8] text-center text-sm mt-1 mb-4">
              {loginSuccessModal.message}
            </Text>
            {userData ? (
              <View className="rounded-2xl border border-[#1f2937] bg-[#111827] p-3 mb-4">
                <Text className="text-[#cbd5e1] text-sm">
                  Name: {userData.name}
                </Text>
                <Text className="text-[#93c5fd] text-sm mt-1">
                  Mobile: {userData.mobileNumber}
                </Text>
              </View>
            ) : null}
            <Pressable
              onPress={() => {
                const next = loginSuccessModal.redirectPath;
                setLoginSuccessModal((prev) => ({ ...prev, visible: false }));
                if (next) router.replace(next);
              }}
              className="rounded-xl bg-[#2563eb] py-3 active:opacity-80"
            >
              <Text className="text-white text-center font-bold">Continue</Text>
            </Pressable>
          </View>
        </View>
      </Modal>

      <View className="absolute -top-24 -left-20 w-72 h-72 rounded-full bg-[#0d2a4d]/50" />
      <View className="absolute bottom-24 -right-24 w-72 h-72 rounded-full bg-[#0f3a37]/40" />

      <View className="flex-1 px-5 pt-4">
        <View className="rounded-3xl border border-[#1f2937] bg-[#0b1224] p-5">
          <Text className="text-white text-3xl font-bold">
            Organization Login
          </Text>
          <Text className="text-[#94a3b8] text-sm mt-2 mb-6">
            Enter your mobile number to get OTP, then verify to login.
          </Text>

          <View className="mb-4">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-[#e2e8f0] text-sm font-semibold">
                Mobile Number
              </Text>
              {otpRequested && !isAuthenticated ? (
                <Pressable onPress={resetToRequestStep}>
                  <Text className="text-[#38bdf8] text-xs font-semibold">
                    Change Number
                  </Text>
                </Pressable>
              ) : null}
            </View>
            <View className="flex-row items-center rounded-xl border border-[#243041] bg-[#0f1729] px-3">
              <Ionicons name="call-outline" size={18} color="#7dd3fc" />
              <TextInput
                value={mobileNumber}
                onChangeText={setMobileNumber}
                placeholder="Enter mobile number"
                placeholderTextColor="#6b7280"
                keyboardType="number-pad"
                maxLength={10}
                editable={!isAuthenticated}
                className="flex-1 py-3.5 pl-2 text-[#e2e8f0]"
              />
            </View>
          </View>

          {otpRequested || isAuthenticated ? (
            <View className="mb-4">
              <View className="flex-row items-center justify-between mb-2">
                <Text className="text-[#e2e8f0] text-sm font-semibold">
                  Enter OTP
                </Text>
                {!isAuthenticated ? (
                  <Pressable
                    disabled={isRequestingOtp}
                    onPress={handleRequestOtp}
                    className="active:opacity-80 disabled:opacity-50"
                  >
                    <Text className="text-[#38bdf8] text-xs font-semibold">
                      Resend OTP
                    </Text>
                  </Pressable>
                ) : null}
              </View>
              <View className="rounded-xl border border-[#243041] bg-[#0f1729] px-3">
                <TextInput
                  value={otp}
                  onChangeText={setOtp}
                  placeholder="Enter OTP"
                  placeholderTextColor="#6b7280"
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isAuthenticated}
                  className="py-3.5 text-[#e2e8f0]"
                />
              </View>
            </View>
          ) : null}

          {!otpRequested ? (
            <Pressable
              disabled={isRequestingOtp}
              onPress={handleRequestOtp}
              className="rounded-xl bg-[#2563eb] py-3.5 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-white text-center font-bold">
                {isRequestingOtp ? "Requesting OTP..." : "Get OTP"}
              </Text>
            </Pressable>
          ) : (
            <Pressable
              disabled={isVerifyingOtp || isAuthenticated}
              onPress={handleVerifyOtp}
              className="rounded-xl bg-[#2563eb] py-3.5 active:opacity-80 disabled:opacity-50"
            >
              <Text className="text-white text-center font-bold">
                {isAuthenticated
                  ? "Logged In"
                  : isVerifyingOtp
                    ? "Verifying..."
                    : "Verify & Login"}
              </Text>
            </Pressable>
          )}

          {message ? (
            <Text className="text-[#93c5fd] text-sm mt-4">{message}</Text>
          ) : null}
        </View>

        {isAuthenticated && userData ? (
          <View className="mt-4 rounded-3xl border border-[#1f2937] bg-[#0b1224] p-5">
            <Text className="text-white text-lg font-bold mb-3">
              Logged In User
            </Text>
            <Text className="text-[#cbd5e1] text-sm">
              Name: {userData.name}
            </Text>
            <Text className="text-[#cbd5e1] text-sm mt-1">
              Mobile: {userData.mobileNumber}
            </Text>
            <Text className="text-[#cbd5e1] text-sm mt-1">
              Role: {userData.role}
            </Text>
            <Text className="text-[#cbd5e1] text-sm mt-1">
              Active: {userData.active ? "Yes" : "No"}
            </Text>
            <Text className="text-[#7dd3fc] text-xs mt-3">Token: {token}</Text>
          </View>
        ) : null}
      </View>
    </SafeAreaView>
  );
}
