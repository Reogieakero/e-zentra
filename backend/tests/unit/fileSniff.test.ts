import { sniffMimeType, declaredMimeMatchesContent } from '../../src/utils/fileSniff';

describe('fileSniff', () => {
  const PNG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x01]);
  const JPEG = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10]);
  const WEBP = Buffer.from('RIFF\x24\x00\x00\x00WEBPVP8 ');
  const PDF = Buffer.from('%PDF-1.7\n...');
  const HTML = Buffer.from('<html>polyglot</html>');

  it('detects PNG/JPEG/WebP/PDF by magic bytes', () => {
    expect(sniffMimeType(new Uint8Array(PNG))).toBe('image/png');
    expect(sniffMimeType(new Uint8Array(JPEG))).toBe('image/jpeg');
    expect(sniffMimeType(new Uint8Array(WEBP))).toBe('image/webp');
    expect(sniffMimeType(new Uint8Array(PDF))).toBe('application/pdf');
  });

  it('returns null for unrecognized content', () => {
    expect(sniffMimeType(new Uint8Array(HTML))).toBeNull();
    expect(sniffMimeType(new Uint8Array([]))).toBeNull();
  });

  it('declaredMimeMatchesContent rejects spoofed labels', () => {
    expect(declaredMimeMatchesContent('image/png', sniffMimeType(new Uint8Array(PNG)))).toBe(true);
    expect(declaredMimeMatchesContent('image/png', sniffMimeType(new Uint8Array(HTML)))).toBe(false);
    expect(declaredMimeMatchesContent('application/pdf', sniffMimeType(new Uint8Array(PDF)))).toBe(true);
    expect(declaredMimeMatchesContent('image/png', sniffMimeType(new Uint8Array(PDF)))).toBe(false);
  });
});
