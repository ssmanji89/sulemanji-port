import { bytesDigest, CANONICAL_SITE_ORIGIN, MAX_SITE_DOCUMENT_BYTES, readBoundedSiteBytes } from './site-readback.js';

type ReleaseManifest = { asset_digest: string; built_at: string; files: Record<string, string> };
export type ReleaseDigests = (sourceCommit: string) => Promise<readonly string[]>;

export async function readVerifiedReleaseManifest(sourceCommit: string, fetcher: typeof fetch, readback: 'public' | 'private-binding',
  readDigests: ReleaseDigests): Promise<ReleaseManifest> {
  const deployedDigests = await readDigests(sourceCommit);
  if (!deployedDigests.length) throw new Error('verified site deployment manifest digest is missing');
  const url = new URL('/release.json', CANONICAL_SITE_ORIGIN);
  const response = await fetcher(url, { redirect: 'manual' });
  if (!response.ok || (response.url ? response.url !== url.href : readback !== 'private-binding') ||
      response.headers.get('x-site-source-commit') !== sourceCommit) throw new Error('release manifest is unavailable for the reviewed source');
  const bytes = await readBoundedSiteBytes(response, MAX_SITE_DOCUMENT_BYTES, 'release manifest');
  if (!deployedDigests.includes(await bytesDigest(bytes))) {
    throw new Error('release manifest does not match the verified deployment digest');
  }
  const manifest = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes)) as Partial<ReleaseManifest> & {
    schema_version?: number; source_commit?: string;
  };
  if (manifest?.schema_version !== 1 || manifest.source_commit !== sourceCommit ||
      !manifest.files || typeof manifest.files !== 'object' || Array.isArray(manifest.files) ||
      typeof manifest.asset_digest !== 'string' || typeof manifest.built_at !== 'string' ||
      response.headers.get('x-site-asset-digest') !== manifest.asset_digest ||
      response.headers.get('x-site-built-at') !== manifest.built_at) throw new Error('reviewed release manifest identity is invalid');
  return { asset_digest: manifest.asset_digest, built_at: manifest.built_at, files: manifest.files };
}
