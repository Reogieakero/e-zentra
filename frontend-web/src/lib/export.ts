import { api } from "@/lib/api";
import { getTokens } from "@/lib/auth";

export interface ExportJob {
  id: string;
  status: "running" | "succeeded" | "failed";
  folderName: string;
  folderUrl: string | null;
  fileCount: number;
  errorMessage: string | null;
  createdAt: string;
  completedAt: string | null;
}

function makeToken(): string {
  const token = getTokens()?.accessToken;
  if (!token) throw new Error("Missing access token");
  return token;
}

export async function runReadableExport(): Promise<ExportJob> {
  return api<ExportJob>("/export/readable", { token: makeToken(), method: "POST" });
}

export async function fetchExportHistory(): Promise<ExportJob[]> {
  return api<ExportJob[]>("/export/history", { token: makeToken() });
}
