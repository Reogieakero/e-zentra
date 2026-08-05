import { randomUUID } from 'crypto';
import fs from 'fs';
import path from 'path';
import { config } from '../config/env';
import { getSupabaseStorage } from './supabase';
import { ApiError } from '../utils/ApiError';

export type StorageBackend = 'local' | 'supabase';

export interface StoredFile {
  url: string;
  key: string;
  storage: StorageBackend;
  size: number;
}

const MIME_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

export function storageBackend(): StorageBackend {
  return config.storage.backend as StorageBackend;
}

export function newFileKey(dir: string, mimeType: string, originalname: string): string {
  const ext = MIME_EXT[mimeType] ?? path.extname(originalname).replace(/^\./, '');
  return `${dir}/${randomUUID()}${ext ? `.${ext}` : ''}`;
}

function localPathFor(key: string): string {
  return path.resolve(config.security.uploadDir, key);
}

export async function storeFile(opts: {
  dir: string;
  key: string;
  buffer: Buffer;
  contentType: string;
}): Promise<StoredFile> {
  const { dir, key, buffer, contentType } = opts;
  if (config.storage.backend === 'supabase') {
    const { error } = await getSupabaseStorage().storage.from(config.storage.bucket).upload(key, buffer, {
      contentType,
      upsert: false,
    });
    if (error) {
      throw ApiError.internal(`Storage upload failed: ${error.message}`);
    }
    return { url: `/uploads/${key}`, key, storage: 'supabase', size: buffer.length };
  }
  const fullPath = localPathFor(key);
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, buffer);
  return { url: `/uploads/${key}`, key, storage: 'local', size: buffer.length };
}

export async function deleteFile(key: string): Promise<void> {
  if (config.storage.backend === 'supabase') {
    const { error } = await getSupabaseStorage().storage.from(config.storage.bucket).remove([key]);
    if (error) {
      throw ApiError.internal(`Storage delete failed: ${error.message}`);
    }
    return;
  }
  const fullPath = localPathFor(key);
  const baseDir = path.resolve(config.security.uploadDir);
  if (fullPath.startsWith(baseDir + path.sep) && fs.existsSync(fullPath)) {
    fs.rmSync(fullPath, { force: true });
  }
}

export async function fileSize(key: string): Promise<number> {
  if (config.storage.backend === 'supabase') {
    const { data, error } = await getSupabaseStorage().storage.from(config.storage.bucket).info(key);
    if (error || !data) return 0;
    return data.size ?? 0;
  }
  try {
    return fs.statSync(localPathFor(key)).size;
  } catch {
    return 0;
  }
}
