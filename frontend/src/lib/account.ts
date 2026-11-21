import { useEffect, useState } from "react";
import { api, ApiError } from "./api";
import type { OrderReceipt } from "./checkout";

/**
 * Customer sign-in. The session itself is a JWT in an httpOnly cookie set by the server,
 * so page scripts never see it. Only the display profile (name, email) is remembered here,
 * and it is re-checked with the server on every page load.
 */
const PROFILE_KEY = "still-account";

export type Account = { name: string; email: string; memberSince: string };
export type DeliveryStatus = "to_ship" | "shipped" | "delivered" | "cancelled";
export type PastOrder = Omit<OrderReceipt, "items"> & {
  items: { title: string; quantity: number; unitPrice: number; bookId: string }[];
  createdAt: string;
  paidAt: string | null;
  deliveryStatus: DeliveryStatus;
  tracking: string | null;
  shippedAt: string | null;
};

function loadProfile(): Account | null {
  try {
    return JSON.parse(localStorage.getItem(PROFILE_KEY) ?? "null");
  } catch {
    return null;
  }
}

let account: Account | null = loadProfile();
let checked = false;
const listeners = new Set<(a: Account | null) => void>();

function setAccount(next: Account | null) {
  account = next;
  checked = true;
  try {
    if (next) localStorage.setItem(PROFILE_KEY, JSON.stringify(next));
    else localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* storage disabled: still works for this page */
  }
  listeners.forEach((fn) => fn(next));
}

// Signing in or out in another tab updates this one too.
window.addEventListener("storage", (e) => {
  if (e.key === PROFILE_KEY) {
    account = loadProfile();
    listeners.forEach((fn) => fn(account));
  }
});

/** Asks the server who is signed in (the cookie may have expired or been revoked by a password reset). */
export async function refreshAccount(): Promise<Account | null> {
  try {
    const res = await api<{ account: Account | null }>("/api/account/me");
    setAccount(res.account);
  } catch {
    checked = true; // server unreachable: keep what we know
  }
  return account;
}

export const currentAccount = () => account;

/** The signed-in customer, or null. Re-renders when they sign in or out. */
export function useAccount(): Account | null {
  const [current, setCurrent] = useState(account);
  useEffect(() => {
    listeners.add(setCurrent);
    if (!checked) {
      checked = true;
      refreshAccount();
    }
    return () => {
      listeners.delete(setCurrent);
    };
  }, []);
  return current;
}

export async function signUp(name: string, email: string, password: string) {
  const res = await api<{ account: Account }>("/api/account/signup", { body: { name, email, password } });
  setAccount(res.account);
  return res.account;
}

export async function signIn(email: string, password: string) {
  const res = await api<{ account: Account }>("/api/account/login", { body: { email, password } });
  setAccount(res.account);
  return res.account;
}

export async function signOut() {
  setAccount(null);
  await api("/api/account/logout", { body: {} }).catch(() => undefined);
}

/** Call when the server says the session is no longer valid. */
export function sessionExpired() {
  setAccount(null);
}

export async function requestPasswordReset(email: string) {
  return api<{ ok: true; message: string }>("/api/account/forgot-password", { body: { email } });
}

export async function resetPassword(token: string, password: string) {
  const res = await api<{ account: Account }>("/api/account/reset-password", { body: { token, password } });
  setAccount(res.account);
  return res.account;
}

export async function fetchMyOrders() {
  try {
    const { orders } = await api<{ orders: PastOrder[] }>("/api/account/orders");
    return orders;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) sessionExpired();
    throw err;
  }
}
