import * as parse5 from 'parse5';
import { SaxesParser, type SaxesTagNS } from 'saxes';
import { isSiteOutput } from './evidence-origin.js';
import { htmlAttribute, type HtmlNode } from './site-readback.js';

const ATOM = 'http://www.w3.org/2005/Atom';
const XHTML = 'http://www.w3.org/1999/xhtml';
const RDF = 'http://www.w3.org/1999/02/22-rdf-syntax-ns#';
const DC = new Set(['http://purl.org/dc/elements/1.1/', 'http://purl.org/dc/terms/']);
const MAX_XML_DEPTH = 64;
const MAX_XML_ELEMENTS = 50_000;
const MAX_FEED_ENTRIES = 100;

export type SourceEntry = { title: string; summary: string; url: string; date: string | null; id: string; origin?: unknown[] };
type Element = { tag: SaxesTagNS; base: URL | null; parts: Array<Element | string> };

function absolute(value: string | undefined, base: URL | null): string {
  if (!value?.trim()) return '';
  try { return new URL(value.trim(), base ?? undefined).href; } catch { return ''; }
}

function parseFeed(body: string, base: URL): Element {
  const path: Element[] = [];
  const parser = new SaxesParser({ xmlns: true });
  let root: Element | undefined;
  let elements = 0;
  parser.on('doctype', () => { throw new Error('INVALID'); });
  parser.on('error', () => { throw new Error('INVALID'); });
  parser.on('opentag', (tag) => {
    elements += 1;
    if (path.length >= MAX_XML_DEPTH || elements > MAX_XML_ELEMENTS) throw new Error('LIMIT');
    const parent = path.at(-1);
    const inherited = parent ? parent.base : base;
    const declared = tag.attributes['xml:base']?.value;
    let elementBase = inherited;
    if (declared) {
      const resolved = absolute(declared, inherited);
      elementBase = resolved ? new URL(resolved) : null;
    }
    const element: Element = { tag, base: elementBase, parts: [] };
    if (parent) parent.parts.push(element);
    else root = element;
    path.push(element);
  });
  const append = (value: string) => { path.at(-1)?.parts.push(value); };
  parser.on('text', append);
  parser.on('cdata', append);
  parser.on('closetag', () => { path.pop(); });
  parser.write(body).close();
  if (!root) throw new Error('INVALID');
  return root;
}

const attr = (node: Element, name: string) => node.tag.attributes[name]?.value;
const children = (node: Element) => node.parts.filter((part): part is Element => typeof part !== 'string');
const select = (node: Element, name: string, uri = node.tag.uri) =>
  children(node).find(({tag}) => tag.local === name && tag.uri === uri);
const xmlText = (node: Element): string => node.parts.map((part) => typeof part === 'string' ? part : xmlText(part)).join('');
const normalized = (value: string): string => value.replace(/\s+/g, ' ').trim();
const HIDDEN = new Set(['script', 'style', 'template', 'noscript']);

function markupOrigin(tag: string, relation: string | undefined, href: string | undefined, cite: string | undefined, base: URL | null): string {
  const rels = relation?.toLowerCase().split(/\s+/) ?? [];
  if ((tag === 'a' || tag === 'link') && rels.some((part) => part === 'canonical' || part === 'via')) return absolute(href, base);
  if (tag === 'blockquote' || tag === 'q') return absolute(cite, base);
  return '';
}

export function readSourceHtml(markup: string, base: URL | null): { text: string; origin: string[] } {
  const pending = [parse5.parseFragment(markup) as unknown as HtmlNode];
  const fragments: string[] = [];
  const origin: string[] = [];
  while (pending.length) {
    const node = pending.pop()!;
    if (HIDDEN.has(node.nodeName ?? '')) continue;
    if (node.nodeName === '#text' && node.value) fragments.push(node.value);
    if (node.tagName) {
      const reference = markupOrigin(node.tagName, htmlAttribute(node, 'rel'), htmlAttribute(node, 'href'), htmlAttribute(node, 'cite'), base);
      if (reference) origin.push(reference);
    }
    for (const child of [...(node.childNodes ?? [])].reverse()) pending.push(child);
  }
  return { text: normalized(fragments.join(' ')), origin };
}

function textConstruct(node: Element | undefined, markup = false): { text: string; origin: string[] } {
  if (!node) return { text: '', origin: [] };
  if (attr(node, 'type') === 'xhtml') {
    const origin: string[] = [];
    function visible(part: Element | string): string {
      if (typeof part === 'string') return part;
      const tag = part.tag.local;
      if (part.tag.uri !== XHTML || HIDDEN.has(tag)) return '';
      const reference = markupOrigin(tag, attr(part, 'rel'), attr(part, 'href'), attr(part, 'cite'), part.base);
      if (reference) origin.push(reference);
      return part.parts.map(visible).join(' ');
    }
    return { text: normalized(node.parts.map(visible).join(' ')), origin };
  }
  return markup || attr(node, 'type') === 'html' ? readSourceHtml(xmlText(node), node.base)
    : { text: normalized(xmlText(node)), origin: [] };
}

function rawField(node: Element, name: string, uri = node.tag.uri): string {
  const field = select(node, name, uri);
  return field ? normalized(xmlText(field)) : '';
}

function urlField(node: Element, name: string): string {
  const field = select(node, name);
  return field ? absolute(xmlText(field), field.base) : '';
}

function atomLinks(node: Element): Element[] {
  return children(node).filter(({ tag }) => tag.local === 'link' && (tag.uri === ATOM || tag.uri === ''));
}
function linkRel(node: Element): string {
  const relation = (attr(node, 'rel')?.trim() || 'alternate').toLowerCase();
  return relation.replace(/^https?:\/\/www\.iana\.org\/assignments\/relation\//, '');
}
const href = (link: Element) => absolute(attr(link, 'href'), link.base);
const originLinks = (node: Element, rels: string[]) => atomLinks(node).filter((link) => rels.includes(linkRel(link))).map(href);

function originMetadata(node: Element): string[] {
  return children(node).flatMap((child) => {
    if (DC.has(child.tag.uri) && child.tag.local === 'source') {
      const resource = Object.values(child.tag.attributes).find(({ local, uri }) => local === 'resource' && uri === RDF);
      return [absolute(resource?.value ?? xmlText(child), child.base)];
    }
    if (child.tag.local !== 'source' || (child.tag.uri !== '' && child.tag.uri !== ATOM)) return [];
    return [absolute(attr(child, 'url'), child.base), urlField(child, 'id'),
      ...originLinks(child, ['canonical', 'via', 'self', 'alternate'])];
  });
}

export function readSyndicatedEntries(body: string, format: 'rss' | 'atom', base: URL): SourceEntry[] {
  const root = parseFeed(body, base);
  const rss = format === 'rss';
  const expectedRoot = rss ? root.tag.local === 'rss' && root.tag.uri === ''
    : ['feed', 'entry'].includes(root.tag.local) && [ATOM, ''].includes(root.tag.uri);
  if (!expectedRoot) throw new Error('INVALID');
  const feed = rss ? select(root, 'channel') : root;
  if (!feed) throw new Error('INVALID');
  const single = !rss && root.tag.local === 'entry';
  if (!single && [urlField(feed, 'id'), ...originLinks(feed, ['canonical', 'via', 'self']),
    ...originMetadata(feed)].some(isSiteOutput)) return [];
  const rows = single ? [root] : children(feed).filter(({ tag }) => tag.local === (rss ? 'item' : 'entry') && tag.uri === feed.tag.uri);
  return rows.slice(0, MAX_FEED_ENTRIES).map((entry) => {
    const entryLink = select(entry, 'link');
    const alternates = atomLinks(entry).filter((link) => linkRel(link) === 'alternate' && href(link));
    const primary = alternates.find((link) => !attr(link, 'hreflang')) ?? alternates[0];
    const guide = select(entry, 'guid');
    const id = rawField(entry, rss ? 'guid' : 'id');
    const url = (rss && entryLink ? absolute(xmlText(entryLink), entryLink.base) : '') || (primary ? href(primary) : '') ||
      (rss && guide && attr(guide, 'isPermaLink') !== 'false' ? absolute(id, null) : '');
    const content = rss ? select(entry, 'encoded', 'http://purl.org/rss/1.0/modules/content/') : select(entry, 'content');
    const summary = select(entry, rss ? 'description' : 'summary');
    const body = textConstruct(summary ?? content, rss);
    const title = textConstruct(select(entry, 'title'), rss);
    const dated = rss ? rawField(entry, 'pubDate') || rawField(entry, 'date', 'http://purl.org/dc/elements/1.1/')
      : rawField(entry, 'updated') || rawField(entry, 'published');
    return { id: absolute(id, null) || id || url, url, title: title.text, summary: body.text, date: dated || null,
      origin: [urlField(entry, rss ? 'guid' : 'id'), ...originLinks(entry, ['canonical', 'via', 'self']), ...originMetadata(entry),
        ...(content ? [absolute(attr(content, 'src'), content.base)] : []),
        ...(summary && content ? textConstruct(content, rss).origin : []), ...title.origin, ...body.origin] };
  });
}
