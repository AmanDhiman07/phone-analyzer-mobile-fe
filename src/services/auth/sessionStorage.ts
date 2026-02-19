import * as SecureStore from "expo-secure-store";
import type { AuthUser } from "./authService";

type AuthSession = {
  token: string;
  user: AuthUser;
};

const AUTH_SESSION_KEY = "auth_session";

function toBoolean(value: unknown) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value === 1;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "1";
  }
  return false;
}

function normalizeSession(value: unknown): AuthSession | null {
  if (!value || typeof value !== "object") return null;

  const maybe = value as {
    token?: unknown;
    user?: {
      name?: unknown;
      mobileNumber?: unknown;
      mobile?: unknown;
      phone?: unknown;
      role?: unknown;
      active?: unknown;
    };
  };

  if (typeof maybe.token !== "string" || maybe.token.trim().length === 0) {
    return null;
  }

  const userInput = maybe.user ?? {};
  const mobile =
    typeof userInput.mobileNumber === "string"
      ? userInput.mobileNumber
      : typeof userInput.mobile === "string"
        ? userInput.mobile
        : typeof userInput.phone === "string"
          ? userInput.phone
          : "";
  const name =
    typeof userInput.name === "string" && userInput.name.trim().length > 0
      ? userInput.name
      : "User";
  const role =
    typeof userInput.role === "string" && userInput.role.trim().length > 0
      ? userInput.role
      : "user";

  const user: AuthUser = {
    name,
    mobileNumber: mobile,
    role,
    active: toBoolean(userInput.active),
  };

  return {
    token: maybe.token.trim(),
    user,
  };
}

export async function saveAuthSession(session: AuthSession) {
  const normalized = normalizeSession(session);
  if (!normalized) return;
  await SecureStore.setItemAsync(AUTH_SESSION_KEY, JSON.stringify(normalized));
}

export async function getAuthSession() {
  const raw = await SecureStore.getItemAsync(AUTH_SESSION_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as unknown;
    const session = normalizeSession(parsed);
    if (session) return session;
    return null;
  } catch {
    return null;
  }
}

export async function clearAuthSession() {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}

export type { AuthSession };
