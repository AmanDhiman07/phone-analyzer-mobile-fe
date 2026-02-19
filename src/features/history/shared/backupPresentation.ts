import type { BackupRecord } from "@/types/backup";

export function getBackupPresentation(item: BackupRecord) {
  const hasContacts = item.counts.contacts > 0;
  const hasMessages = item.counts.messages > 0;
  const hasCallLogs = item.counts.callLogs > 0;
  const selectedCount = [hasContacts, hasMessages, hasCallLogs].filter(
    Boolean,
  ).length;

  if (selectedCount > 1) {
    return {
      title: "Device Backup",
      iconName: "phone-portrait-outline" as const,
      accentBg: "bg-[#132e4f]",
      accentText: "#7dd3fc",
    };
  }
  if (hasContacts) {
    return {
      title: "Contacts Backup",
      iconName: "people-outline" as const,
      accentBg: "bg-[#10302a]",
      accentText: "#5eead4",
    };
  }
  if (hasMessages) {
    return {
      title: "Messages Backup",
      iconName: "chatbubbles-outline" as const,
      accentBg: "bg-[#35280f]",
      accentText: "#fbbf24",
    };
  }
  if (hasCallLogs) {
    return {
      title: "Call Logs Backup",
      iconName: "call-outline" as const,
      accentBg: "bg-[#31234a]",
      accentText: "#c4b5fd",
    };
  }

  return {
    title: "Backup",
    iconName: "document-outline" as const,
    accentBg: "bg-[#1f2937]",
    accentText: "#cbd5e1",
  };
}
