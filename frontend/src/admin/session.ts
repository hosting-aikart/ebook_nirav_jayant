import { ApiError, api } from "../lib/api";

export type AdminSession = { token: string; email: string };

const KEY = "still_admin_session";
const listeners = new Set<(session: AdminSession | null) => void>();

export function loadSession(): AdminSession | null {
  try {
    const value = JSON.parse(localStorage.getItem(KEY) ?? "null");
    return value?.token && value?.email ? value : null;
  } catch {
    return null;
  }
}

export function saveSession(session: AdminSession | null) {
  if (session) localStorage.setItem(KEY, JSON.stringify(session));
  else localStorage.removeItem(KEY);
  listeners.forEach((fn) => fn(session));
}

export function onSessionChange(fn: (session: AdminSession | null) => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

export async function signIn(email: string, password: string) {
  saveSession(await api<AdminSession>("/api/admin/login", { body: { email, password } }));
}

export const signOut = () => saveSession(null);

/** Admin API call. An expired or invalid session signs out, which shows the sign-in screen. */
export async function adminApi<T>(path: string, options: Parameters<typeof api>[1] = {}): Promise<T> {
  try {
    return await api<T>(`/api/admin${path}`, { ...options, token: loadSession()?.token });
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) signOut();
    throw err;
  }
}
