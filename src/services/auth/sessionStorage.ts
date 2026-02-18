/* eslint-disable import/no-unresolved */
import * as SecureStore from "expo-secure-store";
import type { AuthUser } from "./authService";

type AuthSession = {
  token: string;
  user: AuthUser;
};

const AUTH_SESSION_KEY = "auth_session";

function isValidSession(value: unknown): value is AuthSession {
  if (!value || typeof value !== "object") return false;
  const maybe = value as Partial<AuthSession>;
  return (
    typeof maybe.token === "string" &&
    !!maybe.user &&
    typeof maybe.user.name === "string" &&
    typeof maybe.user.mobileNumber === "string" &&
    typeof maybe.user.role === "string" &&
    typeof maybe.user.active === "boolean"
  );
}

export async function saveAuthSession(session: AuthSession) {
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(session));
}

export async function getAuthSession() {
  const raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (isValidSession(parsed)) return parsed;
    return null;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}

export type { AuthSession };
