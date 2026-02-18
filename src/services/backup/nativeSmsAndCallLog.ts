import { Platform } from "react-native";

/**
 * Optional native modules for SMS and call logs.
 * Require only on Android and only when building with native code (development build).
 * In Expo Go these will be undefined.
 */

let SmsAndroid: {
  list: (
    filter: string,
    fail: (err: string) => void,
    success: (count: number, list: string) => void,
  ) => void;
} | null = null;

let CallLogs: { loadAll: () => Promise<unknown[]> } | null = null;

if (Platform.OS === "android") {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    SmsAndroid = require("react-native-get-sms-android-v2");
  } catch {
    SmsAndroid = null;
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const callLogModule = require("react-native-call-log");
    // Support both CommonJS (`module.exports = ...`) and default export shapes.
    CallLogs = (callLogModule?.default ?? callLogModule) as {
      loadAll: () => Promise<unknown[]>;
    };
  } catch {
    CallLogs = null;
  }
}

export const isSmsAvailable = () => !!SmsAndroid;
export const isCallLogAvailable = () => !!CallLogs;

export function getSmsList(): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    if (!SmsAndroid) {
      reject(
        new Error(
          "SMS not available. Use a development build: npx expo prebuild && npx expo run:android",
        ),
      );
      return;
    }
    const filter = JSON.stringify({ box: "", maxCount: 50000 });
    SmsAndroid.list(
      filter,
      (err) => reject(new Error(err)),
      (count, listStr) => {
        try {
          const arr = JSON.parse(listStr || "[]");
          resolve(Array.isArray(arr) ? arr : []);
        } catch {
          resolve([]);
        }
      },
    );
  });
}

export function getCallLogList(): Promise<unknown[]> {
  if (!CallLogs) {
    return Promise.reject(
      new Error(
        "Call logs need a development build. In the project folder run: npx expo prebuild --clean && npx expo run:android",
      ),
    );
  }
  return CallLogs.loadAll();
}
