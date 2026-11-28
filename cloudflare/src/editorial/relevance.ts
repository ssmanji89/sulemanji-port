import type { ActionDecision, Candidate, CatalogItem, PublicKnowledge, RecentHistory, Signal } from './contracts.js';

export function chooseAction(signal: Signal, catalog: CatalogItem[], context: PublicKnowledge[], history: RecentHistory, now = new Date()): ActionDecision {
  if (Date.parse(signal.expires_at) <= now.getTime()) return { action: 'NO_CHANGE', reason: 'The evidence is outside its source-authorized freshness window.', signal_ids: [signal.id] };
  if (history.source_revisions.includes(signal.source_revision) || history.episode_ids.includes(signal.episode_id) ||
      history.candidates.some((item) => item.signal_ids.includes(signal.id))) {
    return { action: 'NO_CHANGE', reason: 'This evidence episode or source revision was already considered.', signal_ids: [signal.id] };
  }
  if (!signal.evidence.length || signal.evidence.some((item) => item.url.startsWith('http://'))) {
    return { action: 'NO_CHANGE', reason: 'The signal has no qualified public evidence.', signal_ids: [signal.id] };
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

  const target = ranked[0].item;
  const words = `${signal.title} ${signal.summary}`.toLowerCase();
  const asksForUpdate = /\b(release|released|version|update|updated|deprecat|security|api|workflow|package|standard|policy)\b/.test(words);
  const sameTopicItems = ranked.filter(({ item }) => item.topics.some((topic) => target.topics.includes(topic)));
  const action: Candidate['action'] = asksForUpdate ? 'REFRESH' : sameTopicItems.length > 1 ? 'CONNECT' : 'PROPOSE';
  const use = context.find((item) => item.allowed_uses.includes('factual-update') && target.topics.some((topic) => words.includes(topic.replace(/-/g, ' '))));
  const knowledgeRevision = use ? `subject:${use.subject_id}` : 'none';
  const candidate: Candidate = {
    id: `${action.toLowerCase()}:${signal.id.slice(0, 24)}:${target.id}`,
    signal_ids: [signal.id],
    target_id: target.id,
    action,
    reader: `Readers exploring ${target.topics[0] ?? 'related work'}`,
    question: `Does this dated evidence change what ${target.title} explains?`,
    benefit: `Keeps ${target.title} useful when the evidence materially affects its guidance.`,
    source_digest: signal.source_revision,
    policy_revision: 'editorial-policy-unbound',
    knowledge_revision: knowledgeRevision,
    state: 'DISCOVERED',
  };
  return { action, candidate };
}
