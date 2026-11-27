export const CARD_WIDTH = 1200;
export const CARD_HEIGHT = 630;
export const MAX_CARD_BYTES = 150_000;
export type SocialCardRenderer = (title: string) => Promise<Uint8Array>;
export class SocialCardContentError extends Error {}

export function isSocialCardPng(bytes: Uint8Array): boolean {
  if (bytes.byteLength < 45 || bytes.byteLength > MAX_CARD_BYTES) return false;
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  return data.getUint32(0) === 0x89504e47 && data.getUint32(4) === 0x0d0a1a0a &&
    data.getUint32(8) === 13 && data.getUint32(12) === 0x49484452 &&
    data.getUint32(16) === CARD_WIDTH && data.getUint32(20) === CARD_HEIGHT &&
    data.getUint32(bytes.byteLength - 12) === 0 && data.getUint32(bytes.byteLength - 8) === 0x49454e44 &&
    data.getUint32(bytes.byteLength - 4) === 0xae426082;
}

export function encodeSocialCard(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}


export function socialCardPath(articleSourcePath: string): string {
  return `/assets/images/articles/${articleSourcePath.slice('notes/'.length, -'.md'.length)}-social.png`;
}
