import type { LoginUser } from "./types";

export function getHistoryCloudPath(user: LoginUser, token: string) {
  const query = new URLSearchParams({
    tab: "cloud",
    name: user.name,
    mobileNumber: user.mobileNumber,
    role: user.role,
    active: String(user.active),
    token,
  }).toString();

  return `/history?${query}`;
}
