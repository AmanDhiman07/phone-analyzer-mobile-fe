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
