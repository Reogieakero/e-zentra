export type SniffedMime = 'image/jpeg' | 'image/png' | 'image/webp' | 'application/pdf';

const PATTERNS: Array<{ mime: SniffedMime; matches: (b: Uint8Array) => boolean }> = [
  {
    mime: 'image/png',
    matches: (b) =>
      b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47 && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a,
  },
  {
    mime: 'image/jpeg',
    matches: (b) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/webp',
    matches: (b) =>
      b.length >= 12 && b.slice(0, 4).every((v, i) => v === 'RIFF'.charCodeAt(i)) && b.slice(8, 12).every((v, i) => v === 'WEBP'.charCodeAt(i)),
  },
  {
    mime: 'application/pdf',
    matches: (b) => b.length >= 5 && b.slice(0, 4).every((v, i) => v === '%PDF'.charCodeAt(i)),
  },
];

export function sniffMimeType(buffer: Uint8Array): SniffedMime | null {
  for (const pattern of PATTERNS) {
    if (pattern.matches(buffer)) {
      return pattern.mime;
    }
  }
  return null;
}

export function declaredMimeMatchesContent(fileMimetype: string, sniffed: SniffedMime | null): boolean {
  if (!sniffed) {
    return false;
  }
  return fileMimetype === sniffed;
}
