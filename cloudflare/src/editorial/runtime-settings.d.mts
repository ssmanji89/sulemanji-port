import type { ModelConfig } from './models.js';

type PublisherSettings = { repository: string; required_checks: string[]; default_branch: string };

export declare function isOpenAIChatEndpoint(url: URL): boolean;

export declare function parseEditorialRuntimeSettings(rawModel: string | undefined, rawPublisher: string | undefined,
  environment: 'staging' | 'production', pricingRevision: string): {
  model: Omit<ModelConfig, 'api_key'>;
  publisher: PublisherSettings;
} | null;
