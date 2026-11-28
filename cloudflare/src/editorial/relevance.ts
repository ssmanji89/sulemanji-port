import type { ActionDecision, Candidate, CatalogItem, PublicKnowledge, RecentHistory, Signal } from './contracts.js';

import { articleSourcePath } from './review.js';
import { isRecycledSignal } from './evidence-origin.js';
import { isDotnetSupport, type DotnetRefresh } from './dotnet-support.js';

function normalizeTitle(title: string): string {
  return title.normalize('NFKC').toLowerCase().replace(/\s+/g, ' ').trim();
}

function editorialConnection(signal: Signal, relevant: CatalogItem[], catalog: CatalogItem[]) {
  const normalizedTitles = new Map<string, CatalogItem | null>();
  for (const item of catalog) {
    if (!articleSourcePath(item.url)) continue;
    const title = normalizeTitle(item.title);
    normalizedTitles.set(title, normalizedTitles.has(title) ? null : item);
  }
  const relevantIds = new Set(relevant.map(({ id }) => id));
  const pairs = new Map<string, { from: CatalogItem; to: CatalogItem }>();
  const clauses = signal.summary.match(/[^.!?;\n]+[.!?;]?/g) ?? [];
  for (const clause of [signal.title, ...clauses]) {
    const statement = normalizeTitle(clause);
    if (statement.endsWith('?')) continue;
    const parts = statement.replace(/[.!;]$/, '').split(/ (?:integrates with|depends on|requires) /);
    if (parts.length !== 2) continue;
    const from = normalizedTitles.get(parts[0]);
    const to = normalizedTitles.get(parts[1]);
    if (from && to && from.id !== to.id && articleSourcePath(from.url) !== articleSourcePath(to.url) &&
        (relevantIds.has(from.id) || relevantIds.has(to.id))) {
      pairs.set(JSON.stringify([from.id, to.id]), { from, to });
    }
  }
  return pairs.size === 1 ? Array.from(pairs.values())[0] : null;
}

export function chooseAction(signal: Signal, catalog: CatalogItem[], _context: PublicKnowledge[], history: RecentHistory, now = new Date(),
  refresh?: DotnetRefresh): ActionDecision {
  if (Date.parse(signal.expires_at) <= now.getTime()) return { action: 'NO_CHANGE', reason: 'The evidence is outside its source-authorized freshness window.', signal_ids: [signal.id] };
  if (!isDotnetSupport(signal) && (history.source_revisions.includes(signal.source_revision) || history.episode_ids.includes(signal.episode_id) ||
      history.candidates.some((item) => item.signal_ids.includes(signal.id)))) {
    return { action: 'NO_CHANGE', reason: 'This evidence episode or source revision was already considered.', signal_ids: [signal.id] };
  }
  if (!signal.evidence.length || signal.evidence.some((item) => item.url.startsWith('http://'))) {
    return { action: 'NO_CHANGE', reason: 'The signal has no qualified public evidence.', signal_ids: [signal.id] };
  }
  if (isRecycledSignal(signal, catalog)) {
    return { action: 'NO_CHANGE', reason: 'A published site article cannot serve as independent evidence.', signal_ids: [signal.id] };
  }
  if (isDotnetSupport(signal)) {
    if (refresh?.action !== 'REFRESH') return { action: 'NO_CHANGE',
      reason: refresh?.reason ?? 'No exact published claim was established for the .NET observation.', signal_ids: [signal.id] };
    const { target, base_commit, article_digest } = refresh;
    const id = `refresh:${article_digest.slice(0, 14)}:${signal.id.slice(0, 24)}:${target.id}`;
    if (history.candidates.some((item) => item.id === id)) return { action: 'NO_CHANGE',
      reason: 'This published claim and source revision were already considered.', signal_ids: [signal.id] };
    return { action: 'REFRESH', candidate: { id, signal_ids: [signal.id], target_id: target.id, action: 'REFRESH',
      refresh_base_commit: base_commit, reader: '.NET maintainers', question: 'Which support phase applies to .NET 8 and .NET 9?',
      benefit: 'Keeps migration decisions aligned with the effective support status.',
      source_digest: signal.source_revision, policy_revision: 'editorial-policy-unbound', knowledge_revision: 'none', state: 'DISCOVERED' } };
  }
  const topics = new Set(signal.topic_ids);
  const ranked = catalog.map((item) => ({ item, overlap: item.topics.filter((topic) => topics.has(topic)).length }))
    .filter(({ overlap }) => overlap > 0).sort((a, b) => b.overlap - a.overlap || a.item.id.localeCompare(b.item.id));
  if (!ranked.length) return { action: 'NO_CHANGE', reason: 'No current site material gives this event a clear reader context.', signal_ids: [signal.id] };

  if (signal.source_id === 'nasa-skywatching') {
    const edition = signal.title.match(/^What['’]s Up: ([A-Za-z]+) (\d{4}) Skywatching Tips from NASA$/);
    const issue = edition ? `${edition[1].toLowerCase()}-${edition[2]}` : '';
    const expectedUrl = `https://science.nasa.gov/solar-system/skywatching/whats-up-${issue}-skywatching-tips-from-nasa/`;
    const viewingWindow = /\b(?:before|after|at) (?:dawn|dusk|sunrise|sunset|moonrise|moonset|twilight|midnight)\b|\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|sept|oct|nov|dec)[a-z]*\.?\s+\d{1,2}\b/i;
    const observableTarget = /\b(meteors?|moon|supermoon|eclipse|planets?|saturn|jupiter|mars|venus|mercury|constellations?)\b/i;
    const qualifiedHighlight = signal.summary.split('\n').some((line) => observableTarget.test(line) && viewingWindow.test(line));
    if (!edition || signal.evidence.length !== 1 || signal.evidence[0].url !== expectedUrl || !qualifiedHighlight) {
      return { action: 'NO_CHANGE', reason: 'The NASA release lacks a concrete skywatching observation to explain.', signal_ids: [signal.id] };
    }
    return { action: 'CREATE', candidate: {
      id: `create:${signal.id.slice(0, 24)}:skywatching`, signal_ids: [signal.id], target_id: null,
      action: 'CREATE', reader: 'Skywatchers',
      question: 'What does this dated NASA guide explain about deciding what to observe and when?',
      benefit: 'Helps a skywatcher plan an observation and understand which conditions affect what they can see.',
      source_digest: signal.source_revision, policy_revision: 'editorial-policy-unbound',
      knowledge_revision: 'none', state: 'DISCOVERED',
    } };
  }

  const connection = editorialConnection(signal, ranked.map(({ item }) => item), catalog);
  if (!connection) return { action: 'NO_CHANGE', reason: 'The evidence establishes neither a changed published claim nor an exact relationship between articles.', signal_ids: [signal.id] };
  const target = connection.from;
  const candidate: Candidate = {
    id: `connect:${signal.id.slice(0, 24)}:${target.id}`,
    signal_ids: [signal.id],
    target_id: target.id,
    related_id: connection.to.id,
    action: 'CONNECT',
    reader: `Readers exploring ${target.topics[0] ?? 'related work'}`,
    question: `What relationship does this dated evidence establish between ${target.title} and ${connection.to.title}?`,
    benefit: `Helps readers of ${target.title} understand when ${connection.to.title} applies.`,
    source_digest: signal.source_revision,
    policy_revision: 'editorial-policy-unbound',
    knowledge_revision: 'none',
    state: 'DISCOVERED',
  };
  return { action: 'CONNECT', candidate };
}
