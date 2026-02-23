import { NativeModules, Platform } from "react-native";

type NativeCallLogRestore = {
  isDefaultDialer: () => Promise<boolean>;
  openDefaultDialerSettings: () => Promise<boolean>;
  requestDefaultPhoneApp: () => Promise<boolean>;
  isDefaultSmsApp: () => Promise<boolean>;
  requestDefaultSmsApp: () => Promise<boolean>;
  getDefaultSmsPackage: () => Promise<string | null>;
  requestDefaultSmsPackage: (packageName: string) => Promise<boolean>;
  restoreSmsFromJson: (jsonString: string) => Promise<string>;
  restoreCallLogsFromJson: (jsonString: string) => Promise<string>;
};

const moduleRef: NativeCallLogRestore | null =
  Platform.OS === "android"
    ? ((NativeModules.CallLogRestore as NativeCallLogRestore | undefined) ??
      null)
    : null;

export async function isDefaultPhoneApp() {
  if (!moduleRef) return false;
  return moduleRef.isDefaultDialer();
}

export async function openDefaultPhoneAppSettings() {
  if (!moduleRef) return false;
  return moduleRef.openDefaultDialerSettings();
}

/** Requests to become default Phone app. Shows system picker; resolves true/false when user returns. */
export async function requestDefaultPhoneApp() {
  if (!moduleRef) return false;
  return moduleRef.requestDefaultPhoneApp();
}

export async function isDefaultSmsApp() {
  if (!moduleRef) return false;
  return moduleRef.isDefaultSmsApp();
}

export async function requestDefaultSmsApp() {
  if (!moduleRef) return false;
  return moduleRef.requestDefaultSmsApp();
}

export async function getDefaultSmsPackage() {
  if (!moduleRef) return null;
  return moduleRef.getDefaultSmsPackage();
}

export async function requestDefaultSmsPackage(packageName: string) {
  if (!moduleRef) return false;
  return moduleRef.requestDefaultSmsPackage(packageName);
}

export async function restoreMessagesNative(entries: unknown[]) {
  if (!moduleRef) {
    throw new Error("SMS restore is available on Android native build only.");
  }
  const raw = await moduleRef.restoreSmsFromJson(JSON.stringify(entries));
  const parsed = JSON.parse(raw) as {
    restored: number;
    failed: number;
    skipped: number;
    total: number;
  };
  return parsed;
}

export async function restoreCallLogsNative(entries: unknown[]) {
  if (!moduleRef) {
    throw new Error(
      "Call log restore is available on Android native build only.",
    );
  }
  const raw = await moduleRef.restoreCallLogsFromJson(JSON.stringify(entries));
  const parsed = JSON.parse(raw) as {
    restored: number;
    failed: number;
    skipped: number;
    total: number;
  };
  return parsed;
}
