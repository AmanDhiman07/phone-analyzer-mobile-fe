import { useEffect, useMemo, useState } from "react";
import { Alert } from "react-native";
import type { Router } from "expo-router";
import { loginRequest, verifyOtp } from "@/services/auth/authService";
import {
  clearAuthSession,
  getAuthSession,
  saveAuthSession,
} from "@/services/auth/sessionStorage";
import { getHistoryCloudPath } from "./utils";
import type { LoginSuccessModalState, LoginUser } from "./types";

export function useLoginScreenController(router: Router) {
  const [isCheckingSession, setIsCheckingSession] = useState(true);
  const [mobileNumber, setMobileNumber] = useState("");
  const [otp, setOtp] = useState("");
  const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);
  const [isRequestingOtp, setIsRequestingOtp] = useState(false);
  const [isOtpStep, setIsOtpStep] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [message, setMessage] = useState("");
  const [token, setToken] = useState("");
  const [loginSuccessModal, setLoginSuccessModal] =
    useState<LoginSuccessModalState>({
      visible: false,
      message: "",
      redirectPath: "",
    });
  const [userData, setUserData] = useState<LoginUser | null>(null);

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
        if (!isMounted) return;
        if (!session) {
          setIsCheckingSession(false);
          return;
        }

        setToken(session.token);
        setUserData(session.user);
        setMobileNumber(session.user.mobileNumber);
        setIsAuthenticated(true);
        setIsOtpStep(true);
        setMessage("Cloud session restored.");
        router.replace(getHistoryCloudPath(session.user, session.token));
      } catch (error) {
        console.error("Failed to restore auth session:", error);
      } finally {
        if (isMounted) {
          setIsCheckingSession(false);
        }
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

      setLoginSuccessModal({
        visible: true,
        message: response.message || "OTP verified successfully",
        redirectPath: getHistoryCloudPath(
          response.data.user,
          response.data.token,
        ),
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

  return {
    isCheckingSession,
    mobileNumber,
    setMobileNumber,
    otp,
    setOtp,
    isVerifyingOtp,
    isRequestingOtp,
    isAuthenticated,
    message,
    token,
    loginSuccessModal,
    setLoginSuccessModal,
    userData,
    otpRequested,
    handleRequestOtp,
    handleVerifyOtp,
    resetToRequestStep,
  };
}
