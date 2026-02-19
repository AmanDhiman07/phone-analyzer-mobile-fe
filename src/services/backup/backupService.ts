import { Platform, PermissionsAndroid } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as Contacts from "expo-contacts";
import {
  BACKUP_FOLDER_NAME,
  BACKUPS_SUBFOLDER,
  MANIFEST_FILE,
  CONTACTS_FILE,
  MESSAGES_FILE,
  CALL_LOGS_FILE,
} from "@/constants/backup";
import type { BackupManifest, BackupRecord } from "@/types/backup";
import {
  isSmsAvailable,
  isCallLogAvailable,
  getSmsList,
  getCallLogList,
} from "./nativeSmsAndCallLog";
import { restoreCallLogsNative } from "@/services/permissions";

const getBackupRoot = () =>
  `${FileSystem.documentDirectory}Backups/${BACKUP_FOLDER_NAME}`;
const getBackupsDir = () => `${getBackupRoot()}/${BACKUPS_SUBFOLDER}`;

function getTimestampFolder(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

export async function ensureBackupDirsExist(): Promise<void> {
  const root = getBackupRoot();
  const backups = getBackupsDir();
  await FileSystem.makeDirectoryAsync(root, { intermediates: true });
  await FileSystem.makeDirectoryAsync(backups, { intermediates: true });
}

export async function getContactsCount(): Promise<number> {
  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") return 0;
  const { data } = await Contacts.getContactsAsync({ fields: [] });
  return data.length;
}

export async function getMessagesCount(): Promise<number> {
  if (Platform.OS !== "android" || !isSmsAvailable()) return 0;
  try {
    const granted = await requestSmsPermission();
    if (!granted) return 0;
    const list = await getSmsList();
    return list.length;
  } catch {
    return 0;
  }
}

export async function getCallLogsCount(): Promise<number> {
  if (Platform.OS !== "android" || !isCallLogAvailable()) return 0;
  try {
    const granted = await requestCallLogPermission();
    if (!granted) return 0;
    const list = await getCallLogList();
    return list.length;
  } catch {
    return 0;
  }
}

async function requestSmsPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const granted = await PermissionsAndroid.request(
      PermissionsAndroid.PERMISSIONS.READ_SMS,
    );
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

const READ_CALL_LOG = "android.permission.READ_CALL_LOG";

async function requestCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const permission =
      PermissionsAndroid.PERMISSIONS.READ_CALL_LOG ?? READ_CALL_LOG;
    const granted = await PermissionsAndroid.request(permission);
    return granted === PermissionsAndroid.RESULTS.GRANTED;
  } catch {
    return false;
  }
}

export async function backupContacts(): Promise<{
  path: string;
  count: number;
}> {
  await ensureBackupDirsExist();
  const folderName = getTimestampFolder();
  const backupDir = `${getBackupsDir()}/${folderName}`;
  await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });

  const { status } = await Contacts.requestPermissionsAsync();
  let contacts: Contacts.Contact[] = [];
  if (status === "granted") {
    const result = await Contacts.getContactsAsync({
      fields: [
        Contacts.Fields.Name,
        Contacts.Fields.PhoneNumbers,
        Contacts.Fields.Emails,
      ],
    });
    contacts = result.data;
  }

  const contactsJson = JSON.stringify(contacts, null, 0);
  const messagesJson = "[]";
  const callLogsJson = "[]";

  await FileSystem.writeAsStringAsync(
    `${backupDir}/${CONTACTS_FILE}`,
    contactsJson,
  );
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${MESSAGES_FILE}`,
    messagesJson,
  );
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${CALL_LOGS_FILE}`,
    callLogsJson,
  );

  const sizeBytes =
    new Blob([contactsJson]).size +
    new Blob([messagesJson]).size +
    new Blob([callLogsJson]).size;

  const manifest: BackupManifest = {
    id: folderName,
    date: new Date().toISOString(),
    types: ["contacts"],
    counts: {
      contacts: contacts.length,
      messages: 0,
      callLogs: 0,
    },
    sizeBytes,
  };

  await FileSystem.writeAsStringAsync(
    `${backupDir}/${MANIFEST_FILE}`,
    JSON.stringify(manifest, null, 0),
  );

  return { path: backupDir, count: contacts.length };
}

export async function backupMessages(): Promise<{
  path: string;
  count: number;
}> {
  if (Platform.OS !== "android" || !isSmsAvailable()) {
    throw new Error(
      "SMS backup requires a development build. Run: npx expo prebuild && npx expo run:android",
    );
  }
  const ok = await requestSmsPermission();
  if (!ok) throw new Error("SMS permission denied.");

  await ensureBackupDirsExist();
  const folderName = getTimestampFolder();
  const backupDir = `${getBackupsDir()}/${folderName}`;
  await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });

  const messages = await getSmsList();
  const messagesJson = JSON.stringify(messages, null, 0);
  const contactsJson = "[]";
  const callLogsJson = "[]";

  await FileSystem.writeAsStringAsync(
    `${backupDir}/${CONTACTS_FILE}`,
    contactsJson,
  );
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${MESSAGES_FILE}`,
    messagesJson,
  );
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${CALL_LOGS_FILE}`,
    callLogsJson,
  );

  const sizeBytes =
    new Blob([messagesJson]).size +
    new Blob([contactsJson]).size +
    new Blob([callLogsJson]).size;
  const manifest: BackupManifest = {
    id: folderName,
    date: new Date().toISOString(),
    types: ["messages"],
    counts: { contacts: 0, messages: messages.length, callLogs: 0 },
    sizeBytes,
  };
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${MANIFEST_FILE}`,
    JSON.stringify(manifest, null, 0),
  );

  return { path: backupDir, count: messages.length };
}

export async function backupCallLogs(): Promise<{
  path: string;
  count: number;
}> {
  if (Platform.OS !== "android" || !isCallLogAvailable()) {
    throw new Error(
      "Call logs need the native module. Run in project folder: npx expo prebuild --clean && npx expo run:android",
    );
  }
  const ok = await requestCallLogPermission();
  if (!ok) throw new Error("Call log permission denied.");

  await ensureBackupDirsExist();
  const folderName = getTimestampFolder();
  const backupDir = `${getBackupsDir()}/${folderName}`;
  await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });

  const callLogs = await getCallLogList();
  const callLogsJson = JSON.stringify(callLogs, null, 0);
  const contactsJson = "[]";
  const messagesJson = "[]";

  await FileSystem.writeAsStringAsync(
    `${backupDir}/${CONTACTS_FILE}`,
    contactsJson,
  );
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${MESSAGES_FILE}`,
    messagesJson,
  );
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${CALL_LOGS_FILE}`,
    callLogsJson,
  );

  const sizeBytes =
    new Blob([callLogsJson]).size +
    new Blob([contactsJson]).size +
    new Blob([messagesJson]).size;
  const manifest: BackupManifest = {
    id: folderName,
    date: new Date().toISOString(),
    types: ["callLogs"],
    counts: { contacts: 0, messages: 0, callLogs: callLogs.length },
    sizeBytes,
  };
  await FileSystem.writeAsStringAsync(
    `${backupDir}/${MANIFEST_FILE}`,
    JSON.stringify(manifest, null, 0),
  );

  return { path: backupDir, count: callLogs.length };
}

export async function restoreContacts(backupFolderName: string): Promise<{
  restored: number;
  skipped: number;
  failed: number;
  total: number;
}> {
  const backupDir = `${getBackupsDir()}/${backupFolderName}`;
  const contactsPath = `${backupDir}/${CONTACTS_FILE}`;
  const info = await FileSystem.getInfoAsync(contactsPath);
  if (!info.exists) {
    throw new Error("Selected backup does not include contacts.");
  }

  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Contacts permission denied.");
  }

  const raw = await FileSystem.readAsStringAsync(contactsPath);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid contacts backup format.");
  }

  const contacts: Contacts.Contact[] = parsed as Contacts.Contact[];
  let restored = 0;
  let skipped = 0;
  let failed = 0;

  const addContact = (
    Contacts as { addContactAsync?: (c: Contacts.Contact) => Promise<string> }
  ).addContactAsync;
  if (!addContact) {
    throw new Error(
      "Contact restore is unavailable in this build. Use a development/release build.",
    );
  }

  const toText = (value: unknown) =>
    typeof value === "string" ? value.trim() : "";

  const normalizePhoneNumbers = (value: unknown) => {
    if (!Array.isArray(value)) return undefined;
    const items = value
      .map((entry) => {
        const raw = entry as { number?: unknown; label?: unknown };
        const number = toText(raw.number);
        if (!number) return null;
        return { number, label: toText(raw.label) || "mobile" };
      })
      .filter(Boolean) as { number: string; label: string }[];
    return items.length > 0 ? items : undefined;
  };

  const normalizeEmails = (value: unknown) => {
    if (!Array.isArray(value)) return undefined;
    const items = value
      .map((entry) => {
        const raw = entry as { email?: unknown; label?: unknown };
        const email = toText(raw.email);
        if (!email) return null;
        return { email, label: toText(raw.label) || "work" };
      })
      .filter(Boolean) as { email: string; label: string }[];
    return items.length > 0 ? items : undefined;
  };

  const toRestorableContact = (source: Contacts.Contact): Contacts.Contact => {
    const firstName = toText(source.firstName);
    const lastName = toText(source.lastName);
    const rawName = toText(source.name) || `${firstName} ${lastName}`.trim();
    const name = rawName || "Unknown";
    const phoneNumbers = normalizePhoneNumbers(source.phoneNumbers);
    const emails = normalizeEmails(source.emails);

    const payload: Contacts.Contact = {
      contactType: Contacts.ContactTypes.Person,
      name,
    };

    if (firstName) payload.firstName = firstName;
    if (lastName) payload.lastName = lastName;
    if (phoneNumbers?.length) payload.phoneNumbers = phoneNumbers;
    if (emails?.length) payload.emails = emails;

    return payload;
  };

  const existing = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
    ],
  });
  const existingKeys = new Set<string>();
  for (const c of existing.data) {
    const key = `${toText(c.name).toLowerCase()}|${normalizePhoneNumbers(c.phoneNumbers)?.[0]?.number ?? ""}|${normalizeEmails(c.emails)?.[0]?.email?.toLowerCase() ?? ""}`;
    existingKeys.add(key);
  }

  for (const c of contacts) {
    try {
      const payload = toRestorableContact(c);
      const key = `${toText(payload.name).toLowerCase()}|${payload.phoneNumbers?.[0]?.number ?? ""}|${payload.emails?.[0]?.email?.toLowerCase() ?? ""}`;
      const hasIdentity =
        !!toText(payload.name) ||
        !!payload.phoneNumbers?.length ||
        !!payload.emails?.length;

      if (!hasIdentity || existingKeys.has(key)) {
        skipped++;
        continue;
      }

      await addContact(payload);
      existingKeys.add(key);
      restored++;
    } catch (error) {
      failed++;
      if (failed <= 3) {
        console.warn("Failed to restore contact:", c.name, error);
      }
    }
  }

  return {
    restored,
    skipped,
    failed,
    total: contacts.length,
  };
}

export async function restoreCallLogs(backupFolderName: string): Promise<{
  restored: number;
  skipped: number;
  failed: number;
  total: number;
}> {
  if (Platform.OS !== "android") {
    throw new Error("Call log restore is supported on Android only.");
  }

  const backupDir = `${getBackupsDir()}/${backupFolderName}`;
  const callLogsPath = `${backupDir}/${CALL_LOGS_FILE}`;
  const info = await FileSystem.getInfoAsync(callLogsPath);
  if (!info.exists) {
    throw new Error("Selected backup does not include call logs.");
  }

  const permission =
    PermissionsAndroid.PERMISSIONS.WRITE_CALL_LOG ??
    "android.permission.WRITE_CALL_LOG";
  const writeGranted = await PermissionsAndroid.request(permission);
  if (writeGranted !== PermissionsAndroid.RESULTS.GRANTED) {
    throw new Error("WRITE_CALL_LOG permission denied.");
  }

  const raw = await FileSystem.readAsStringAsync(callLogsPath);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid call logs backup format.");
  }

  return restoreCallLogsNative(parsed);
}

export async function listBackups(): Promise<BackupRecord[]> {
  await ensureBackupDirsExist();
  const backupsDir = getBackupsDir();
  const list = await FileSystem.readDirectoryAsync(backupsDir);
  const records: BackupRecord[] = [];

  for (const name of list) {
    const dirPath = `${backupsDir}/${name}`;
    const dirInfo = await FileSystem.getInfoAsync(dirPath);
    if (!dirInfo.exists || !(dirInfo as { isDirectory?: boolean }).isDirectory)
      continue;

    const manifestPath = `${dirPath}/${MANIFEST_FILE}`;
    const manifestInfo = await FileSystem.getInfoAsync(manifestPath);
    if (!manifestInfo.exists) continue;

    try {
      const raw = await FileSystem.readAsStringAsync(manifestPath);
      const manifest: BackupManifest = JSON.parse(raw);
      records.push({
        ...manifest,
        folderName: name,
      });
    } catch {
      // skip invalid manifests
    }
  }

  records.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );
  return records;
}

export async function deleteBackup(folderName: string): Promise<void> {
  const backupDir = `${getBackupsDir()}/${folderName}`;
  const info = await FileSystem.getInfoAsync(backupDir);
  if (info.exists) {
    await FileSystem.deleteAsync(backupDir, { idempotent: true });
  }
}

export function getBackupRootPath(): string {
  return getBackupRoot();
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatBackupDate(iso: string): string {
  const d = new Date(iso);
  const now = new Date();
  const today =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  const pad = (n: number) => String(n).padStart(2, "0");
  const time = `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  if (today) return `Today, ${time}`;
  if (isYesterday) return `Yesterday, ${time}`;
  return `${d.toLocaleDateString()} • ${time}`;
}
