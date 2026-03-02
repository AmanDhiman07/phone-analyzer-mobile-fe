import type { AuthSession } from "@/services/auth/sessionStorage";

export type BackupCardIcon = "people" | "chatbubbles" | "call";

export type SuccessModalState = {
  visible: boolean;
  label: string;
  count: number;
  path: string;
};

export type CloudUploadFile = {
  uri: string;
  name: string;
  size: number;
  mimeType?: string;
};

export type HomeViewModel = {
  contactsCount: number | null;
  messagesCount: number | null;
  callLogsCount: number | null;
  loading: boolean;
  refreshing: boolean;
  isUploadingVcf: boolean;
  backupPath: string;
  session: AuthSession | null;
  successModal: SuccessModalState;
  cloudLoadingMessage: string;
  cloudUploadVisible: boolean;
  cloudUploadName: string;
  cloudUploadCaseId: string;
  onRefresh: () => void;
  onCopyPath: () => void;
  onCloseSuccessModal: () => void;
  onBackupContacts: () => void;
  onBackupMessages: () => void;
  onBackupCallLogs: () => void;
  onRestoreContacts: () => void;
  onRestoreMessages: () => void;
  onRestoreCallLogs: () => void;
  onOpenProfile: () => void;
  onOpenLocalBackups: () => void;
  onOpenLogin: () => void;
  onCloudUploadSubmit: () => void;
  onCloudUploadCancel: () => void;
  onCloudUploadClose: () => void;
  onCloudUploadNameChange: (value: string) => void;
  onCloudUploadCaseIdChange: (value: string) => void;
};
