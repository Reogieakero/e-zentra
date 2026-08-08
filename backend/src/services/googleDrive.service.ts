import { config } from '../config/env';
import { prisma } from '../lib/prisma';
import { encryptToken, decryptToken } from './cryptoToken.service';

const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const OAUTH_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const REVOKE_URL = 'https://oauth2.googleapis.com/revoke';
const DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const DRIVE_FILES_URL = 'https://www.googleapis.com/drive/v3/files';
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';

interface OAuthTokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  id_token?: string;
}

function requisites() {
  if (!config.backup.enabled) {
    throw new Error('Backup is disabled. Enable it in configuration first.');
  }
  if (!config.backup.drive.clientId || !config.backup.drive.clientSecret) {
    throw new Error('Google Drive OAuth is not configured.');
  }
  return {
    clientId: config.backup.drive.clientId,
    clientSecret: config.backup.drive.clientSecret,
    redirectUri: config.backup.drive.redirectUri!,
  };
}

async function postForm(url: string, body: Record<string, string>): Promise<OAuthTokenResponse> {
  const params = new URLSearchParams(body).toString();
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params,
  });
  const json = (await res.json()) as OAuthTokenResponse;
  if (!res.ok) {
    throw new Error(`Google OAuth error (${res.status})`);
  }
  return json;
}

export function buildOAuthUrl(userId: string): string {
  const { clientId, redirectUri } = requisites();
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: `${DRIVE_SCOPE} openid email`,
    access_type: 'offline',
    prompt: 'consent',
    include_granted_scopes: 'true',
    state: userId,
  }).toString();
  return `${OAUTH_AUTH_URL}?${params}`;
}

export async function exchangeCode(code: string): Promise<{ accessToken: string; refreshToken: string | null; expiresAt: Date; email: string }> {
  const { clientId, clientSecret, redirectUri } = requisites();
  const json = await postForm(TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    code,
    redirect_uri: redirectUri,
    grant_type: 'authorization_code',
  });
  if (!json.access_token || !json.refresh_token) {
    throw new Error('Google did not return an offline refresh token.');
  }
  const email = await fetchDriveUserInfo(json.access_token);
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
  return { accessToken: json.access_token, refreshToken: json.refresh_token, expiresAt, email };
}

async function fetchDriveUserInfo(accessToken: string): Promise<string> {
  const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as { email?: string };
  return json.email ?? 'unknown';
}

export async function refreshAccessToken(refreshToken: string): Promise<{ accessToken: string; expiresAt: Date }> {
  const { clientId, clientSecret } = requisites();
  const json = await postForm(TOKEN_URL, {
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: 'refresh_token',
  });
  if (!json.access_token) {
    throw new Error('Google refresh token no longer valid.');
  }
  const expiresAt = new Date(Date.now() + (json.expires_in ?? 3600) * 1000);
  return { accessToken: json.access_token, expiresAt };
}

export async function revokeToken(refreshToken: string): Promise<void> {
  await fetch(`${REVOKE_URL}?token=${encodeURIComponent(refreshToken)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  }).catch(() => undefined);
}

export async function createDriveFolder(userId: string, name: string, parentFolderId: string): Promise<string> {
  const { accessToken } = await getAccessTokenForLink(userId);
  const res = await fetch(DRIVE_FILES_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, mimeType: 'application/vnd.google-apps.folder', parents: [parentFolderId] }),
  });
  if (!res.ok) {
    throw new Error(`Drive folder creation failed (${res.status}).`);
  }
  const json = (await res.json()) as { id?: string };
  const folderId = json.id;
  if (!folderId) {
    throw new Error('Drive did not return a folder id.');
  }
  return folderId;
}

export async function uploadBytes(userId: string, folderId: string, fileName: string, contentType: string, buffer: Buffer): Promise<{ fileId: string; sizeBytes: number }> {
  const { accessToken } = await getAccessTokenForLink(userId);
  const meta = JSON.stringify({ name: fileName, parents: [folderId] });
  const mediaBoundary = `BOUNDARY_${Date.now()}`;
  const parts = [
    `--${mediaBoundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${mediaBoundary}\r\nContent-Type: ${contentType}\r\nContent-Transfer-Encoding: binary\r\n\r\n`,
    buffer,
    `\r\n--${mediaBoundary}--\r\n`,
  ];
  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${mediaBoundary}` },
    body: Buffer.concat(parts.map((p) => (typeof p === 'string' ? Buffer.from(p) : p))),
  });
  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status}).`);
  }
  const json = (await res.json()) as { id?: string };
  return { fileId: json.id ?? '', sizeBytes: Buffer.byteLength(buffer) };
}

async function getAccessTokenForLink(userId: string): Promise<{ accessToken: string; email: string }> {
  const link = await prisma.googleDriveLink.findUnique({ where: { userId } });
  if (!link) throw new Error('Google Drive is not connected.');
  const now = Date.now();
  if (link.tokenExpiresAt.getTime() > now) {
    return { accessToken: decryptToken(link.accessTokenEnc), email: link.email };
  }
  const refreshToken = decryptToken(link.refreshTokenEnc);
  const { accessToken, expiresAt } = await refreshAccessToken(refreshToken);
  await prisma.googleDriveLink.update({
    where: { userId },
    data: { accessTokenEnc: encryptToken(accessToken), tokenExpiresAt: expiresAt },
  });
  return { accessToken, email: link.email };
}

export async function ensureDriveFolder(userId: string): Promise<string> {
  const link = await prisma.googleDriveLink.findUnique({ where: { userId } });
  if (!link) throw new Error('Google Drive is not connected.');
  if (link.folderId) return link.folderId;
  const { accessToken } = await getAccessTokenForLink(userId);

  const searchRes = await fetch(`${DRIVE_FILES_URL}?q=${encodeURIComponent("name='Zentra Backups' and mimeType='application/vnd.google-apps.folder' and trashed=false")}&fields=files(id)`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const search = (await searchRes.json()) as { files?: { id: string }[] };
  let folderId = search.files?.[0]?.id;
  if (!folderId) {
    const createRes = await fetch(DRIVE_FILES_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Zentra Backups', mimeType: 'application/vnd.google-apps.folder' }),
    });
    const created = (await createRes.json()) as { id?: string };
    folderId = created.id;
  }
  if (!folderId) throw new Error('Could not create backup folder in Drive.');
  await prisma.googleDriveLink.update({ where: { id: link.id }, data: { folderId } });
  return folderId;
}

export async function uploadSnapshot(userId: string, fileName: string, jsonContent: string): Promise<{ fileId: string; sizeBytes: number }> {
  const folderId = await ensureDriveFolder(userId);
  const { accessToken } = await getAccessTokenForLink(userId);
  const body = jsonContent;
  const mediaBoundary = `BOUNDARY_${Date.now()}`;
  const meta = JSON.stringify({ name: fileName, parents: [folderId] });
  const parts = [
    `--${mediaBoundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n`,
    `--${mediaBoundary}\r\nContent-Type: application/json\r\n\r\n${body}\r\n`,
    `--${mediaBoundary}--\r\n`,
  ];
  const payload = parts.join('');
  const res = await fetch(`${DRIVE_UPLOAD_URL}?uploadType=multipart`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': `multipart/related; boundary=${mediaBoundary}` },
    body: payload,
  });
  if (!res.ok) {
    throw new Error(`Drive upload failed (${res.status}).`);
  }
  const json = (await res.json()) as { id?: string };
  return { fileId: json.id ?? '', sizeBytes: Buffer.byteLength(payload) };
}

export async function revokeDriveAccess(userId: string): Promise<void> {
  const link = await prisma.googleDriveLink.findUnique({ where: { userId } });
  if (link) {
    try {
      await revokeToken(decryptToken(link.refreshTokenEnc));
    } catch {
    }
    await prisma.googleDriveLink.delete({ where: { userId } });
  }
}