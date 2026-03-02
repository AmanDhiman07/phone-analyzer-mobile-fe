export type LoginUser = {
  name: string;
  mobileNumber: string;
  role: string;
  active: boolean;
};

export type LoginSuccessModalState = {
  visible: boolean;
  message: string;
  redirectPath: string;
};

export type LoginViewModel = {
  isCheckingSession: boolean;
  mobileNumber: string;
  otp: string;
  isVerifyingOtp: boolean;
  isRequestingOtp: boolean;
  isAuthenticated: boolean;
  message: string;
  token: string;
  otpRequested: boolean;
  userData: LoginUser | null;
  loginSuccessModal: LoginSuccessModalState;
  onMobileNumberChange: (value: string) => void;
  onOtpChange: (value: string) => void;
  onRequestOtp: () => void;
  onVerifyOtp: () => void;
  onResetToRequestStep: () => void;
  onCloseLoginSuccessModal: () => void;
  onContinueAfterLoginSuccess: () => void;
};
