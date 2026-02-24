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
  PUBLIC_BACKUP_ROOT_FOLDER,
  PUBLIC_CONTACTS_FOLDER,
  PUBLIC_SMS_FOLDER,
  PUBLIC_CALLS_FOLDER,
} from "@/constants/backup";
import type { BackupManifest, BackupRecord, BackupType } from "@/types/backup";
import {
  isSmsAvailable,
  isCallLogAvailable,
  getSmsList,
  getCallLogList,
} from "./nativeSmsAndCallLog";
import {
  restoreMessagesNative,
  restoreCallLogsNative,
} from "@/services/permissions";

const getBackupRoot = () =>
  `${FileSystem.documentDirectory}Backups/${BACKUP_FOLDER_NAME}`;
const getBackupsDir = () => `${getBackupRoot()}/${BACKUPS_SUBFOLDER}`;
const PUBLIC_DOWNLOADS_DIR = "Download";
const PUBLIC_BACKUP_ROOT_PATH = `/storage/emulated/0/${PUBLIC_DOWNLOADS_DIR}/${PUBLIC_BACKUP_ROOT_FOLDER}`;
const PUBLIC_BACKUP_URI_STATE_FILE = `${getBackupRoot()}/public-backup-uri-state.json`;
const PUBLIC_BACKUP_FOLDER_BY_TYPE: Record<BackupType, string> = {
  contacts: PUBLIC_CONTACTS_FOLDER,
  messages: PUBLIC_SMS_FOLDER,
  callLogs: PUBLIC_CALLS_FOLDER,
};
const PUBLIC_BACKUP_FILE_FORMAT: Record<
  BackupType,
  {
    prefix: string;
    extension: "json" | "vcf";
    mimeType: string;
  }
> = {
  contacts: {
    prefix: "contacts",
    extension: "vcf",
    mimeType: "text/vcard",
  },
  messages: {
    prefix: "sms",
    extension: "json",
    mimeType: "application/json",
  },
  callLogs: {
    prefix: "calls",
    extension: "json",
    mimeType: "application/json",
  },
};

let cachedPublicBackupRootUri: string | null = null;
let cachedPublicBackupRootPath = PUBLIC_BACKUP_ROOT_PATH;
let publicRootLoadedFromDisk = false;

function getTimestampFolder(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function getSafLeafName(uri: string): string {
  try {
    const decoded = decodeURIComponent(uri).replace(/\/+$/, "");
    const index = decoded.lastIndexOf("/");
    return index >= 0 ? decoded.slice(index + 1) : decoded;
  } catch {
    return uri;
  }
}

function getStoragePathFromSafUri(uri: string): string | null {
  try {
    const decoded = decodeURIComponent(uri);
    const marker = "primary:";
    const markerIndex = decoded.lastIndexOf(marker);
    if (markerIndex < 0) return null;
    const relativePath = decoded
      .slice(markerIndex + marker.length)
      .replace(/^\/+/, "");
    return relativePath
      ? `/storage/emulated/0/${relativePath}`
      : "/storage/emulated/0";
  } catch {
    return null;
  }
}

function escapeVCardValue(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,");
}

function normalizeVCardType(label: string, fallback: string): string {
  const normalized = label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "");
  return normalized || fallback;
}

function toVCardContacts(contacts: Contacts.Contact[]): string {
  return contacts
    .map((contact) => {
      const firstName = (contact.firstName ?? "").trim();
      const lastName = (contact.lastName ?? "").trim();
      const fullName =
        (contact.name ?? "").trim() ||
        `${firstName} ${lastName}`.trim() ||
        "Unknown";

      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `FN:${escapeVCardValue(fullName)}`,
        `N:${escapeVCardValue(lastName)};${escapeVCardValue(firstName)};;;`,
      ];

      const phones = Array.isArray(contact.phoneNumbers)
        ? contact.phoneNumbers
        : [];
      for (const phone of phones) {
        const number = (phone?.number ?? "").trim();
        if (!number) continue;
        const type = normalizeVCardType(phone?.label ?? "", "CELL");
        lines.push(`TEL;TYPE=${type}:${escapeVCardValue(number)}`);
      }

      const emails = Array.isArray(contact.emails) ? contact.emails : [];
      for (const emailEntry of emails) {
        const email = (emailEntry?.email ?? "").trim();
        if (!email) continue;
        const type = normalizeVCardType(emailEntry?.label ?? "", "INTERNET");
        lines.push(`EMAIL;TYPE=${type}:${escapeVCardValue(email)}`);
      }

      lines.push("END:VCARD");
      return lines.join("\r\n");
    })
    .join("\r\n");
}

async function loadPersistedPublicRootState(): Promise<void> {
  if (publicRootLoadedFromDisk) return;
  publicRootLoadedFromDisk = true;

  try {
    const info = await FileSystem.getInfoAsync(PUBLIC_BACKUP_URI_STATE_FILE);
    if (!info.exists) return;

    const raw = await FileSystem.readAsStringAsync(
      PUBLIC_BACKUP_URI_STATE_FILE,
    );
    const parsed = JSON.parse(raw) as {
      uri?: string;
      path?: string;
    };
    const persistedUri = (parsed.uri ?? "").trim();
    const persistedPath = (parsed.path ?? "").trim();
    if (!persistedUri) return;

    await FileSystem.StorageAccessFramework.readDirectoryAsync(persistedUri);
    cachedPublicBackupRootUri = persistedUri;
    if (persistedPath) {
      cachedPublicBackupRootPath = persistedPath;
    }
  } catch {
    cachedPublicBackupRootUri = null;
  }
}

async function persistPublicRootState(
  uri: string,
  path: string,
): Promise<void> {
  try {
    await FileSystem.writeAsStringAsync(
      PUBLIC_BACKUP_URI_STATE_FILE,
      JSON.stringify({ uri, path }),
    );
  } catch {
    // best effort cache to avoid repeated picker prompts across app launches
  }
}

async function ensureSafDirectory(
  parentUri: string,
  dirName: string,
): Promise<string> {
  const children =
    await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
  const existing = children.find(
    (childUri) => getSafLeafName(childUri) === dirName,
  );
  if (existing) return existing;
  return FileSystem.StorageAccessFramework.makeDirectoryAsync(
    parentUri,
    dirName,
  );
}

async function getPublicBackupRootUri(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  await loadPersistedPublicRootState();
  if (cachedPublicBackupRootUri) return cachedPublicBackupRootUri;

  const initialUri =
    FileSystem.StorageAccessFramework.getUriForDirectoryInRoot(
      PUBLIC_DOWNLOADS_DIR,
    );
  const permission =
    await FileSystem.StorageAccessFramework.requestDirectoryPermissionsAsync(
      initialUri,
    );
  if (!permission.granted || !permission.directoryUri) return null;

  const selectedDirName = getSafLeafName(permission.directoryUri);
  const selectedIsRootFolder = selectedDirName === PUBLIC_BACKUP_ROOT_FOLDER;
  const rootUri = selectedIsRootFolder
    ? permission.directoryUri
    : await ensureSafDirectory(
        permission.directoryUri,
        PUBLIC_BACKUP_ROOT_FOLDER,
      );
  const selectedRootPath = getStoragePathFromSafUri(permission.directoryUri);
  if (selectedRootPath) {
    cachedPublicBackupRootPath = selectedIsRootFolder
      ? selectedRootPath
      : `${selectedRootPath}/${PUBLIC_BACKUP_ROOT_FOLDER}`;
  }
  cachedPublicBackupRootUri = rootUri;
  await persistPublicRootState(rootUri, cachedPublicBackupRootPath);
  return rootUri;
}

async function ensurePublicBackupFolderPermission(): Promise<void> {
  if (Platform.OS !== "android") return;
  const rootUri = await getPublicBackupRootUri();
  if (!rootUri) {
    throw new Error("Backup folder permission denied.");
  }
}

async function exportBackupToPublicFolder(
  type: BackupType,
  folderName: string,
  payload: string,
): Promise<string | null> {
  if (Platform.OS !== "android") return null;

  try {
    const publicRootUri = await getPublicBackupRootUri();
    if (!publicRootUri) return null;

    const subfolder = PUBLIC_BACKUP_FOLDER_BY_TYPE[type];
    const subfolderUri = await ensureSafDirectory(publicRootUri, subfolder);
    const { prefix, extension, mimeType } = PUBLIC_BACKUP_FILE_FORMAT[type];
    const fileName = `${prefix}_${folderName}.${extension}`;
    const fileUri = await FileSystem.StorageAccessFramework.createFileAsync(
      subfolderUri,
      fileName,
      mimeType,
    );
    await FileSystem.StorageAccessFramework.writeAsStringAsync(
      fileUri,
      payload,
    );
    return `${cachedPublicBackupRootPath}/${subfolder}`;
  } catch (error) {
    console.warn("Public backup export failed:", error);
    return null;
  }
}

async function findSafChildUri(
  parentUri: string,
  childName: string,
): Promise<string | null> {
  try {
    const children =
      await FileSystem.StorageAccessFramework.readDirectoryAsync(parentUri);
    return (
      children.find((childUri) => getSafLeafName(childUri) === childName) ??
      null
    );
  } catch {
    return null;
  }
}

async function getPersistedPublicBackupRootUri(): Promise<string | null> {
  if (Platform.OS !== "android") return null;
  await loadPersistedPublicRootState();
  return cachedPublicBackupRootUri;
}

async function deletePublicBackupFiles(folderName: string): Promise<void> {
  if (Platform.OS !== "android") return;

  const publicRootUri = await getPersistedPublicBackupRootUri();
  if (!publicRootUri) return;

  const backupTypes = Object.keys(PUBLIC_BACKUP_FILE_FORMAT) as BackupType[];
  for (const type of backupTypes) {
    const subfolder = PUBLIC_BACKUP_FOLDER_BY_TYPE[type];
    const subfolderUri = await findSafChildUri(publicRootUri, subfolder);
    if (!subfolderUri) continue;

    const { prefix, extension } = PUBLIC_BACKUP_FILE_FORMAT[type];
    const expectedFileName = `${prefix}_${folderName}.${extension}`;
    const files =
      await FileSystem.StorageAccessFramework.readDirectoryAsync(subfolderUri);

    for (const fileUri of files) {
      if (getSafLeafName(fileUri) !== expectedFileName) continue;
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    }
  }
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
const WRITE_CALL_LOG = "android.permission.WRITE_CALL_LOG";

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

async function requestWriteCallLogPermission(): Promise<boolean> {
  if (Platform.OS !== "android") return false;
  try {
    const permission =
      PermissionsAndroid.PERMISSIONS.WRITE_CALL_LOG ?? WRITE_CALL_LOG;
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
  await ensurePublicBackupFolderPermission();

  const { status } = await Contacts.requestPermissionsAsync();
  if (status !== "granted") {
    throw new Error("Contacts permission denied.");
  }

  await ensureBackupDirsExist();
  const folderName = getTimestampFolder();
  const backupDir = `${getBackupsDir()}/${folderName}`;
  await FileSystem.makeDirectoryAsync(backupDir, { intermediates: true });

  const result = await Contacts.getContactsAsync({
    fields: [
      Contacts.Fields.Name,
      Contacts.Fields.PhoneNumbers,
      Contacts.Fields.Emails,
    ],
  });
  const contacts = result.data;

  const contactsJson = JSON.stringify(contacts, null, 0);
  const contactsVcf = toVCardContacts(contacts);
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

  const publicPath = await exportBackupToPublicFolder(
    "contacts",
    folderName,
    contactsVcf,
  );
  if (Platform.OS === "android" && !publicPath) {
    await FileSystem.deleteAsync(backupDir, { idempotent: true });
    throw new Error("Backup folder permission denied.");
  }

  return { path: publicPath ?? backupDir, count: contacts.length };
}

export async function backupMessages(): Promise<{
  path: string;
  count: number;
}> {
  await ensurePublicBackupFolderPermission();

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

  const publicPath = await exportBackupToPublicFolder(
    "messages",
    folderName,
    messagesJson,
  );
  if (Platform.OS === "android" && !publicPath) {
    await FileSystem.deleteAsync(backupDir, { idempotent: true });
    throw new Error("Backup folder permission denied.");
  }

  return { path: publicPath ?? backupDir, count: messages.length };
}

export async function backupCallLogs(): Promise<{
  path: string;
  count: number;
}> {
  await ensurePublicBackupFolderPermission();

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

  const publicPath = await exportBackupToPublicFolder(
    "callLogs",
    folderName,
    callLogsJson,
  );
  if (Platform.OS === "android" && !publicPath) {
    await FileSystem.deleteAsync(backupDir, { idempotent: true });
    throw new Error("Backup folder permission denied.");
  }

  return { path: publicPath ?? backupDir, count: callLogs.length };
}

export async function prepareBackupContactsVcf(
  backupFolderName: string,
): Promise<{
  uri: string;
  name: string;
  size: number;
  mimeType: string;
}> {
  await ensureBackupDirsExist();

  const backupDir = `${getBackupsDir()}/${backupFolderName}`;
  const contactsPath = `${backupDir}/${CONTACTS_FILE}`;
  const info = await FileSystem.getInfoAsync(contactsPath);
  if (!info.exists) {
    throw new Error("Selected backup does not include contacts.");
  }

  const raw = await FileSystem.readAsStringAsync(contactsPath);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid contacts backup format.");
  }

  const contacts = parsed as Contacts.Contact[];
  if (contacts.length === 0) {
    throw new Error("Selected backup has no contacts.");
  }

  const payload = toVCardContacts(contacts);
  const outputDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory;
  if (!outputDir) {
    throw new Error("Unable to prepare contacts file.");
  }

  const fileName = `contacts_${backupFolderName}.vcf`;
  const outputUri = `${outputDir}${fileName}`;
  await FileSystem.writeAsStringAsync(outputUri, payload);

  return {
    uri: outputUri,
    name: fileName,
    size: new Blob([payload]).size,
    mimeType: "text/vcard",
  };
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

  const readGranted = await requestCallLogPermission();
  if (!readGranted) {
    throw new Error("READ_CALL_LOG permission denied.");
  }

  const writeGranted = await requestWriteCallLogPermission();
  if (!writeGranted) {
    throw new Error("WRITE_CALL_LOG permission denied.");
  }

  const raw = await FileSystem.readAsStringAsync(callLogsPath);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid call logs backup format.");
  }

  return restoreCallLogsNative(parsed);
}

export async function restoreMessages(backupFolderName: string): Promise<{
  restored: number;
  skipped: number;
  failed: number;
  total: number;
}> {
  if (Platform.OS !== "android") {
    throw new Error("SMS restore is supported on Android only.");
  }

  const backupDir = `${getBackupsDir()}/${backupFolderName}`;
  const messagesPath = `${backupDir}/${MESSAGES_FILE}`;
  const info = await FileSystem.getInfoAsync(messagesPath);
  if (!info.exists) {
    throw new Error("Selected backup does not include messages.");
  }

  const smsGranted = await requestSmsPermission();
  if (!smsGranted) {
    throw new Error("SMS permission denied.");
  }

  const raw = await FileSystem.readAsStringAsync(messagesPath);
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Invalid messages backup format.");
  }

  return restoreMessagesNative(parsed);
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

  try {
    await deletePublicBackupFiles(folderName);
  } catch (error) {
    console.warn("Public backup delete failed:", error);
  }
}

export function getBackupRootPath(): string {
  if (Platform.OS === "android") {
    return cachedPublicBackupRootPath;
  }
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
