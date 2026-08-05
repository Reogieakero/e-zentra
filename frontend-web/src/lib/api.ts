import { env } from "./env";

export interface ApiErrorBody {
  error?: {
    status?: number;
    code?: string;
    message?: string;
    details?: unknown;
  };
}

export class ApiClientError extends Error {
  readonly status: number;
  readonly code: string;
  readonly details?: unknown;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.name = "ApiClientError";
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export interface ApiRequestOptions {
  token?: string | null;
  method?: string;
  body?: unknown;
}

export async function api<T>(path: string, opts: ApiRequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (opts.token) {
    headers.Authorization = `Bearer ${opts.token}`;
  }

  let res: Response;
  try {
    res = await fetch(`${env.apiUrl}${path}`, {
      method: opts.method ?? "GET",
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new ApiClientError(0, "NETWORK_ERROR", "Could not reach the Zentra server. Check your connection and try again.");
  }

  if (res.status === 204) {
    return undefined as T;
  }

  const body = (await res.json().catch(() => ({}))) as T & ApiErrorBody;

  if (!res.ok) {
    const err = body.error;
    throw new ApiClientError(
      err?.status ?? res.status,
      err?.code ?? "UNKNOWN_ERROR",
      err?.message ?? "Something went wrong. Please try again.",
      err?.details
    );
  }

  return body;
}
