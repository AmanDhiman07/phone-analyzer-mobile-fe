export type BackupManifest = {
  id: string;
  date: string; // ISO
  types: ("contacts" | "messages" | "callLogs")[];
  counts: { contacts: number; messages: number; callLogs: number };
  sizeBytes: number;
};

export type BackupRecord = BackupManifest & {
  folderName: string; // e.g. "2025-01-15_14-30-00"
};

export type BackupType = "contacts" | "messages" | "callLogs";
