import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";

// Priority: EXPO_PUBLIC_API_URL env var → LAN/localhost fallback
// Set EXPO_PUBLIC_API_URL in frontend/.env for deployed backends.
const _fallbackHost = Platform.OS === "android" ? "10.0.2.2" : "localhost";
export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_URL ?? `http://${_fallbackHost}:8000`;

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly detail: unknown,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface ApiFetchInit extends RequestInit {
  /** Override the default 8-second timeout (in ms). 0 disables the timeout. */
  timeout?: number;
}

export async function apiFetch<T>(path: string, init?: ApiFetchInit): Promise<T> {
  const token = await AsyncStorage.getItem("@aingthon_token");

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init?.headers as Record<string, string> | undefined),
  };
  if (token) headers["Authorization"] = `Bearer ${token}`;

  const controller = new AbortController();
  const timeoutMs = init?.timeout ?? 8_000;
  const timer =
    timeoutMs > 0
      ? setTimeout(() => controller.abort(), timeoutMs)
      : null;
  try {
    const { timeout: _t, ...fetchInit } = init ?? {};
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...fetchInit,
      signal: controller.signal,
      headers,
    });
    if (!res.ok) {
      const detail = await res.json().catch(() => ({}));
      throw new ApiError(res.status, detail, `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  } finally {
    if (timer) clearTimeout(timer);
  }
}
