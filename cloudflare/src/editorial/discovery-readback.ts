import * as parse5 from 'parse5';
import { SaxesParser, type SaxesTagNS } from 'saxes';
import { CANONICAL_SITE_ORIGIN } from './site-readback.js';

type DiscoveryKind = 'writing' | 'feed' | 'sitemap';
type HtmlNode = { tagName?: string; attrs?: { name: string; value: string }[]; childNodes?: HtmlNode[] };

function canonicalLink(value: string): string | null {
  try {
    const link = new URL(value, CANONICAL_SITE_ORIGIN);
    return link.origin === CANONICAL_SITE_ORIGIN && !link.username && !link.password &&
      !link.search && !link.hash && /^\/notes\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(link.pathname) ? link.href : null;
  } catch { return null; }
}

export function readDiscoveryLinks(kind: DiscoveryKind, body: string): Set<string> {
  if (body.length > 2_000_000) throw new Error('discovery response exceeds bound');
  const links = new Set<string>();
  const add = (value: string) => { const link = canonicalLink(value); if (link) links.add(link); };
  if (kind === 'writing') {
    const pending = [parse5.parse(body) as unknown as HtmlNode];
    while (pending.length) {
      const node = pending.pop()!;
      if (node.tagName === 'a') add(node.attrs?.find(({ name }) => name === 'href')?.value ?? '');
      for (const child of node.childNodes ?? []) pending.push(child);
    }
    return links;
  }

  const feed = kind === 'feed';
  const namespace = feed ? 'http://www.w3.org/2005/Atom' : 'http://www.sitemaps.org/schemas/sitemap/0.9';
  const root = feed ? 'feed' : 'urlset';
  const parents: SaxesTagNS[] = [];
  const parser = new SaxesParser({ xmlns: true });
  let location: string | null = null;
  parser.on('doctype', () => { throw new Error('discovery XML contains a document type'); });
  parser.on('opentag', (tag) => {
    parents.push(tag);
    if (parents.length === 1 && (tag.local !== root || tag.uri !== namespace)) throw new Error('unexpected discovery XML root');
    if (parents.length === 4 && location !== null) throw new Error('nested sitemap location');
    if (parents.length !== 3 || parents.some((parent) => parent.uri !== namespace)) return;
    if (feed && parents[1].local === 'entry' && tag.local === 'link') {
      if (!tag.attributes.rel || tag.attributes.rel.value === 'alternate') add(tag.attributes.href?.value ?? '');
    } else if (!feed && parents[1].local === 'url' && tag.local === 'loc') location = '';
  });
  parser.on('text', (text) => { if (location !== null) location += text; });
  parser.on('closetag', () => {
    if (location !== null && parents.length === 3) { add(location.trim()); location = null; }
    parents.pop();
  });
  parser.write(body).close();
  return links;
}
