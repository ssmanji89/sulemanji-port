export const CANONICAL_SITE_ORIGIN = 'https://www.sulemanji.com';

export type EditorialFixtureSite = Pick<Fetcher, 'fetch'>;

export function fixtureSiteFetcher(binding: EditorialFixtureSite | undefined): typeof fetch {
  return async (input, init) => {
    if (!binding) throw new Error('EDITORIAL_FIXTURE_SITE_NOT_BOUND');
    const request = new Request(input, { ...init, redirect: 'manual' });
    const url = new URL(request.url);
    if (request.method !== 'GET' || url.origin !== CANONICAL_SITE_ORIGIN ||
        url.username || url.password || url.search || url.hash) {
      throw new Error('EDITORIAL_FIXTURE_SITE_REQUEST_REJECTED');
    }
    return binding.fetch(request);
  };
}
