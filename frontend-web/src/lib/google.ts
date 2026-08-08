import { GOOGLE_SIGNUP_KEY } from "@/constants/storage";

export interface GoogleIdentity {
  accessToken: string;
  email: string;
  name: string;
  avatarUrl: string | null;
}

const KEY = GOOGLE_SIGNUP_KEY;

export function getGoogleIdentity(): GoogleIdentity | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as GoogleIdentity;
  } catch {
    return null;
  }
}

export function setGoogleIdentity(identity: GoogleIdentity): void {
  window.sessionStorage.setItem(KEY, JSON.stringify(identity));
}

export function clearGoogleIdentity(): void {
  window.sessionStorage.removeItem(KEY);
}