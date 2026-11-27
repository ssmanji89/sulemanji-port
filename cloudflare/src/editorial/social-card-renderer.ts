import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { CARD_HEIGHT, CARD_WIDTH, SocialCardContentError, type SocialCardRenderer } from './social-card-format.js';

const LAYOUTS = [
  { lineLength: 30, fontSize: 54 },
  { lineLength: 42, fontSize: 43 },
  { lineLength: 55, fontSize: 33 },
  { lineLength: 30, fontSize: 25 },
];

const graphemes = new Intl.Segmenter('en', { granularity: 'grapheme' });

// DejaVu Sans contains a full Unicode cmap (format 12). Each group maps a
// consecutive range of code points to consecutive glyph IDs.
function fontCoverage(font: Uint8Array): Array<{ first: number; last: number }> {
  const data = new DataView(font.buffer, font.byteOffset, font.byteLength);
  for (let table = 12; table < 12 + data.getUint16(4) * 16; table += 16) {
    if (data.getUint32(table) !== 0x636d6170) continue; // cmap
    const cmap = data.getUint32(table + 8);
    for (let record = cmap + 4; record < cmap + 4 + data.getUint16(cmap + 2) * 8; record += 8) {
      const offset = cmap + data.getUint32(record + 4);
      if (data.getUint16(offset) !== 12) continue;
      return Array.from({ length: data.getUint32(offset + 12) }, (_, index) => {
        const group = offset + 16 + index * 12;
        const first = data.getUint32(group);
        return { first: first + Number(data.getUint32(group + 8) === 0), last: data.getUint32(group + 4) };
      });
    }
  }
  throw new Error('SOCIAL_CARD_FONT_HAS_NO_UNICODE_CMAP');
}

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function wrapTitle(characters: string[], lineLength: number): string[] {
  const lines: string[] = [];
  let remaining = characters;
  while (remaining.length > lineLength) {
    let count = lineLength;
    for (let index = lineLength - 1; index >= Math.floor(lineLength / 2); index -= 1) {
      if (/^[ –—-]$/u.test(remaining[index])) {
        count = index + 1;
        break;
      }
    }
    lines.push(remaining.slice(0, count).join('').trim());
    remaining = remaining.slice(count);
    if (remaining[0] === ' ') remaining = remaining.slice(1);
  }
  lines.push(remaining.join('').trim());
  return lines;
}

export function createSocialCardRenderer(module: WebAssembly.Module, font: Uint8Array): SocialCardRenderer {
  const coverage = fontCoverage(font);
  const options = { font: { fontBuffers: [font], defaultFontFamily: 'DejaVu Sans' } };
  const svgStart = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">`;
  let ready: Promise<void> | undefined;

  return async (title) => {
    if (!title.trim() || title.length > 180 || /[\u0000-\u001f\u007f]/u.test(title)) throw new SocialCardContentError('SOCIAL_CARD_TITLE_INVALID');
    const normalized = title.trim().replace(/\s+/gu, ' ');
    for (const character of normalized) {
      const codePoint = character.codePointAt(0)!;
      if (!coverage.some(({ first, last }) => codePoint >= first && codePoint <= last)) {
        throw new SocialCardContentError('SOCIAL_CARD_TITLE_UNSUPPORTED_GLYPH');
      }
    }
    const characters = Array.from(graphemes.segment(normalized), ({ segment }) => segment);
    ready ??= initWasm(module);
    await ready;

    for (const { lineLength, fontSize } of LAYOUTS) {
      const lines = wrapTitle(characters, lineLength);
      const baseline = fontSize === 25 ? 210 : 242;
      if (baseline + (lines.length - 1) * (fontSize + 18) > 480) continue;
      const titleMarkup = lines.map((line, index) => `<text x="100" y="${baseline + index * (fontSize + 18)}"
        fill="#232927" font-family="DejaVu Sans" font-weight="bold" font-size="${fontSize}">${escapeXml(line)}</text>`).join('');
      const measurement = new Resvg(`${svgStart}${titleMarkup}</svg>`, options);
      try {
        const bounds = measurement.getBBox();
        if (!bounds) continue;
        try {
          if (bounds.width === 0 || bounds.x + bounds.width > 1098 || bounds.y + bounds.height > 486) continue;
        } finally {
          bounds.free();
        }
      } finally {
        measurement.free();
      }
      const renderer = new Resvg(`${svgStart}
        <rect width="1200" height="630" fill="#232927"/>
        <rect x="30" y="30" width="1140" height="570" rx="8" fill="#f7f4ec"/>
        <rect x="100" y="130" width="46" height="4" fill="#875036"/>
        <text x="160" y="140" fill="#875036" font-family="DejaVu Sans" font-weight="bold" font-size="24">WRITING</text>
        ${titleMarkup}
        <path d="M100 512 H1100" stroke="#cfc6b7"/>
        <text x="100" y="558" fill="#3d4943" font-family="DejaVu Sans" font-weight="bold" font-size="28">Suleman Manji</text>
        </svg>`, options);
      try {
        const image = renderer.render();
        try {
          return Uint8Array.from(image.asPng());
        } finally {
          image.free();
        }
      } finally {
        renderer.free();
      }
    }
    throw new SocialCardContentError('SOCIAL_CARD_TITLE_DOES_NOT_FIT');
  };
}
