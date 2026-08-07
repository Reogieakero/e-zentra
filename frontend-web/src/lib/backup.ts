import { api } from "@/lib/api";
import { getTokens } from "@/lib/auth";

export interface BackupJob {
  id: string;
  kind: "manual" | "automatic";
  status: "running" | "succeeded" | "failed";
  fileName: string | null;
  sizeBytes: number | null;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
  creator?: { firstName: string; lastName: string } | null;
}

export interface BackupStatus {
  enabled: boolean;
  connected: boolean;
  email: string | null;
  folderId: string | null;
  connectedAt: string | null;
  lastBackup: BackupJob | null;
}

function makeToken(): string {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  return token;
}

export async function fetchBackupStatus(): Promise<BackupStatus> {
  return api<BackupStatus>("/backup/status", { token: makeToken() });
}

export async function fetchBackupOAuthUrl(): Promise<{ url: string }> {
  return api<{ url: string }>("/backup/oauth-url", { token: makeToken() });
}

export async function runBackupNow(): Promise<{ id: string; status: string }> {
  return api<{ id: string; status: string }>("/backup/run", { token: makeToken(), method: "POST" });
}

export async function fetchBackupHistory(): Promise<BackupJob[]> {
  return api<BackupJob[]>("/backup/history", { token: makeToken() });
}

export async function disconnectBackupDrive(): Promise<{ ok: boolean }> {
  return api<{ ok: boolean }>("/backup/google", { token: makeToken(), method: "DELETE" });
}