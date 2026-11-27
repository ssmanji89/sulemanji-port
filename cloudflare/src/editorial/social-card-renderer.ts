import { initWasm, Resvg } from '@resvg/resvg-wasm';
import { CARD_HEIGHT, CARD_WIDTH, type SocialCardRenderer } from './social-card-format.js';

const LAYOUTS = [
  { lineLength: 30, fontSize: 54 },
  { lineLength: 42, fontSize: 43 },
  { lineLength: 55, fontSize: 33 },
];

function escapeXml(text: string): string {
  return text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

function wrapTitle(title: string, lineLength: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of title.split(/\s+/u)) {
    if (line && line.length + word.length + 1 > lineLength) {
      lines.push(line);
      line = '';
    }
    line = line ? `${line} ${word}` : word;
  }
  lines.push(line);
  return lines;
}

export function createSocialCardRenderer(module: WebAssembly.Module, font: Uint8Array): SocialCardRenderer {
  const options = { font: { fontBuffers: [font], defaultFontFamily: 'DejaVu Sans' } };
  const svgStart = `<svg xmlns="http://www.w3.org/2000/svg" width="${CARD_WIDTH}" height="${CARD_HEIGHT}">`;
  let ready: Promise<void> | undefined;

  return async (title) => {
    if (!title.trim() || title.length > 180 || /[\u0000-\u001f\u007f]/u.test(title)) throw new Error('SOCIAL_CARD_TITLE_INVALID');
    ready ??= initWasm(module);
    await ready;

    for (const { lineLength, fontSize } of LAYOUTS) {
      const lines = wrapTitle(title.trim(), lineLength);
      if (lines.length > 4) continue;
      const titleMarkup = lines.map((line, index) => `<text x="100" y="${242 + index * (fontSize + 18)}"
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
    throw new Error('SOCIAL_CARD_TITLE_DOES_NOT_FIT');
  };
}
