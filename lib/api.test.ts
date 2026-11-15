import { describe, expect, it } from 'vitest';
import { detectImageMime } from './api';

const bytes = (...values: number[]) => new Uint8Array(values);

function ascii(text: string): number[] {
  return [...text].map((char) => char.charCodeAt(0));
}

describe('detectImageMime', () => {
  it('detects JPEG by magic bytes', () => {
    expect(detectImageMime(bytes(0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10))).toBe('image/jpeg');
  });

  it('detects PNG by signature', () => {
    expect(detectImageMime(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00))).toBe(
      'image/png'
    );
  });

  it('detects GIF87a and GIF89a', () => {
    expect(detectImageMime(bytes(...ascii('GIF87a'), 0x00))).toBe('image/gif');
    expect(detectImageMime(bytes(...ascii('GIF89a'), 0x00))).toBe('image/gif');
  });

  it('detects WEBP (RIFF container)', () => {
    expect(detectImageMime(bytes(...ascii('RIFF'), 0x24, 0x00, 0x00, 0x00, ...ascii('WEBP')))).toBe(
      'image/webp'
    );
  });

  it('detects HEIC and HEIF brands', () => {
    expect(
      detectImageMime(bytes(0x00, 0x00, 0x00, 0x18, ...ascii('ftypheic'), 0x00, 0x00, 0x00, 0x00))
    ).toBe('image/heic');
    expect(
      detectImageMime(bytes(0x00, 0x00, 0x00, 0x18, ...ascii('ftypmif1'), 0x00, 0x00, 0x00, 0x00))
    ).toBe('image/heif');
  });

  it('rejects non-image content even when named like an image', () => {
    expect(detectImageMime(bytes(...ascii('%PDF-1.7')))).toBeNull();
    expect(detectImageMime(bytes(...ascii('MZ\x90\x00')))).toBeNull();
    expect(detectImageMime(bytes())).toBeNull();
  });
});
