import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { expect, it } from 'vitest';
import { createSocialCardRenderer } from '../src/editorial/social-card-renderer.js';
import { isSocialCardPng } from '../src/editorial/social-card-format.js';

it('renders deterministic cards from the private package and vendored font', async () => {
  const require = createRequire(import.meta.url);
  const wasm = await readFile(require.resolve('@resvg/resvg-wasm/index_bg.wasm'));
  const font = await readFile(new URL('../../scripts/fonts/DejaVuSans-Bold.ttf', import.meta.url));
  const render = createSocialCardRenderer(await WebAssembly.compile(Uint8Array.from(wasm)), font);
  const title = 'A practical look at rollout evidence & change windows for working engineers';
  const first = await render(title);
  const repeat = await render(title);
  expect(isSocialCardPng(first)).toBe(true);
  expect(repeat).toEqual(first);
  expect(await render('Cloudflare Worker release evidence')).not.toEqual(first);
});
