import { NativeModules, Platform } from "react-native";

type NativeCallLogRestore = {
  isDefaultDialer: () => Promise<boolean>;
  openDefaultDialerSettings: () => Promise<boolean>;
  isDefaultSmsApp: () => Promise<boolean>;
  requestDefaultSmsApp: () => Promise<boolean>;
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

export async function isDefaultSmsApp() {
  if (!moduleRef) return false;
  return moduleRef.isDefaultSmsApp();
}

export async function requestDefaultSmsApp() {
  if (!moduleRef) return false;
  return moduleRef.requestDefaultSmsApp();
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
