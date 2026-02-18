type AuthUser = {
  name: string;
  mobileNumber: string;
  role: string;
  active: boolean;
};

type LoginRequestResponse = {
  status: boolean;
  message: string;
};

type VerifyOtpResponse = {
  status: boolean;
  message: string;
  data?: {
    token: string;
    user: AuthUser;
  };
};

const DEFAULT_API_BASE_URL = "http://192.168.68.122:3000/api";

export function getApiBaseUrl() {
  const value = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!value) return DEFAULT_API_BASE_URL;
  return value.replace(/\/+$/, "");
}

async function safeReadJson<TResponse>(response: Response) {
  try {
    return (await response.json()) as TResponse;
  } catch {
    return null;
  }
}

async function postJson<TResponse>(
  path: string,
  body: Record<string, string>,
): Promise<TResponse> {
  const baseUrl = getApiBaseUrl();
  const url = `${baseUrl}${path}`;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, 12000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });

    const json = await safeReadJson<TResponse>(response);
    if (!response.ok) {
      const message =
        json && typeof json === "object" && "message" in json
          ? String(json.message)
          : `Request failed with status ${response.status}`;
      throw new Error(message);
    }

    if (!json) {
      throw new Error("Invalid server response");
    }

    return json;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        `Request timed out for ${url}. Check backend connectivity and EXPO_PUBLIC_API_BASE_URL.`,
      );
    }
    if (error instanceof TypeError) {
      throw new Error(
        `Network request failed for ${url}. Set EXPO_PUBLIC_API_BASE_URL for your backend host.`,
      );
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function loginRequest(mobileNumber: string) {
  return postJson<LoginRequestResponse>("/auth/login-request", {
    mobileNumber,
  });
}

export async function verifyOtp(mobileNumber: string, otp: string) {
  return postJson<VerifyOtpResponse>("/auth/verify-otp", {
    mobileNumber,
    otp,
  });
}

export type { AuthUser, LoginRequestResponse, VerifyOtpResponse };
