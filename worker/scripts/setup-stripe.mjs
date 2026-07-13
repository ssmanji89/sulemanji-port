#!/usr/bin/env node

import { spawnSync } from "node:child_process";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(__dirname, "..");

const DEFAULT_WEBHOOK_URL =
  "https://sulemanji-work-with-me.ssmanji89.workers.dev/v1/webhooks/stripe";
const WEBHOOK_EVENT = "checkout.session.completed";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  printUsage();
  process.exit(0);
}

if (!args.installWorkerSecrets && !args.storeKeychain) {
  fail("Use --install-worker-secrets and/or --store-keychain.");
}

const stripeSecretKey = readSecret({
  envName: args.secretKeyEnv,
  keychainService: args.secretKeyService,
  keychainAccount: args.secretKeyAccount,
  label: "Stripe secret key",
});

if (!stripeSecretKey.startsWith("sk_") && !stripeSecretKey.startsWith("rk_")) {
  fail("Stripe secret key must start with sk_ or rk_.");
}

const account = await stripeJson("/v1/account", {
  stripeSecretKey,
  method: "GET",
});

let webhookSecret = readOptionalSecret({
  envName: args.webhookSecretEnv,
  keychainService: args.webhookSecretService,
  keychainAccount: args.webhookSecretAccount,
});

let webhookCreated = false;
let matchingWebhookCount = 0;
if (args.createWebhook) {
  const existing = await stripeJson("/v1/webhook_endpoints?limit=100", {
    stripeSecretKey,
    method: "GET",
  });
  const matching = existing.data?.filter((endpoint) => endpoint.url === args.webhookUrl) ?? [];
  matchingWebhookCount = matching.length;

  if (matching.length > 0 && !webhookSecret) {
    fail(
      "A matching Stripe webhook endpoint already exists, but Stripe only returns its signing secret when the endpoint is first created. Provide STRIPE_WEBHOOK_SECRET from the Dashboard or Keychain.",
    );
  }

  if (matching.length === 0) {
    const created = await stripeJson("/v1/webhook_endpoints", {
      stripeSecretKey,
      method: "POST",
      idempotencyKey: args.idempotencyKey,
      body: new URLSearchParams({
        url: args.webhookUrl,
        description: "Sulemanji AI Workflow Services Priority Discovery deposit webhook",
        "enabled_events[]": WEBHOOK_EVENT,
      }),
    });
    webhookSecret = created.secret;
    webhookCreated = true;
    matchingWebhookCount = 1;
  }
}

if (!webhookSecret) {
  fail("Provide STRIPE_WEBHOOK_SECRET or use --create-webhook with a key that can create webhook endpoints.");
}

if (!webhookSecret.startsWith("whsec_")) {
  fail("Stripe webhook secret must start with whsec_.");
}

if (args.storeKeychain) {
  storeSecret({
    service: args.secretKeyService,
    account: args.secretKeyAccount,
    value: stripeSecretKey,
    label: "Stripe secret key",
  });
  storeSecret({
    service: args.webhookSecretService,
    account: args.webhookSecretAccount,
    value: webhookSecret,
    label: "Stripe webhook signing secret",
  });
}

if (args.installWorkerSecrets) {
  installWorkerSecret("STRIPE_SECRET_KEY", stripeSecretKey);
  installWorkerSecret("STRIPE_WEBHOOK_SECRET", webhookSecret);
}

console.log(
  JSON.stringify(
    {
      stripeAccountValidated: Boolean(account.id),
      livemode: account.livemode === true,
      webhookUrl: args.webhookUrl,
      webhookEvent: WEBHOOK_EVENT,
      webhookCreated,
      matchingWebhookCount,
      storedKeychain: args.storeKeychain,
      installedWorkerSecrets: args.installWorkerSecrets
        ? ["STRIPE_SECRET_KEY", "STRIPE_WEBHOOK_SECRET"]
        : [],
    },
    null,
    2,
  ),
);
console.log("No Stripe secret values were printed or written to the repository.");

function parseArgs(argv) {
  const parsed = {
    createWebhook: false,
    help: false,
    idempotencyKey: "sulemanji-ai-workflow-worker-webhook-2026-07-13-v1",
    installWorkerSecrets: false,
    secretKeyAccount: "stripe-live-secret-key",
    secretKeyEnv: "STRIPE_SECRET_KEY",
    secretKeyService: "sulemanji.stripe.worker-secret-key",
    storeKeychain: false,
    webhookSecretAccount: "stripe-live-webhook-secret",
    webhookSecretEnv: "STRIPE_WEBHOOK_SECRET",
    webhookSecretService: "sulemanji.stripe.worker-webhook-secret",
    webhookUrl: DEFAULT_WEBHOOK_URL,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--create-webhook") {
      parsed.createWebhook = true;
    } else if (arg === "--install-worker-secrets") {
      parsed.installWorkerSecrets = true;
    } else if (arg === "--store-keychain") {
      parsed.storeKeychain = true;
    } else if (arg === "--webhook-url") {
      parsed.webhookUrl = requireValue(argv, ++index, arg);
    } else if (arg === "--secret-key-env") {
      parsed.secretKeyEnv = requireValue(argv, ++index, arg);
    } else if (arg === "--webhook-secret-env") {
      parsed.webhookSecretEnv = requireValue(argv, ++index, arg);
    } else if (arg === "--secret-key-service") {
      parsed.secretKeyService = requireValue(argv, ++index, arg);
    } else if (arg === "--secret-key-account") {
      parsed.secretKeyAccount = requireValue(argv, ++index, arg);
    } else if (arg === "--webhook-secret-service") {
      parsed.webhookSecretService = requireValue(argv, ++index, arg);
    } else if (arg === "--webhook-secret-account") {
      parsed.webhookSecretAccount = requireValue(argv, ++index, arg);
    } else if (arg === "--idempotency-key") {
      parsed.idempotencyKey = requireValue(argv, ++index, arg);
    } else {
      fail(`Unknown argument: ${arg}`);
    }
  }

  return parsed;
}

function requireValue(argv, index, flag) {
  const value = argv[index];
  if (!value || value.startsWith("--")) fail(`${flag} requires a value.`);
  return value;
}

function readSecret({ envName, keychainService, keychainAccount, label }) {
  const value = readOptionalSecret({ envName, keychainService, keychainAccount });
  if (!value) {
    fail(
      `${label} not found. Set ${envName} in the local process environment or store it in Keychain service ${keychainService}.`,
    );
  }
  return value;
}

function readOptionalSecret({ envName, keychainService, keychainAccount }) {
  const envValue = process.env[envName];
  if (envValue) return envValue;

  const result = spawnSync(
    "security",
    ["find-generic-password", "-w", "-a", keychainAccount, "-s", keychainService],
    { encoding: "utf8" },
  );
  if (result.status === 0) return result.stdout.trim();
  return "";
}

function storeSecret({ service, account, value, label }) {
  const result = spawnSync(
    "security",
    ["add-generic-password", "-U", "-a", account, "-s", service, "-w", value],
    { encoding: "utf8" },
  );
  if (result.status !== 0) {
    fail(`Could not store ${label} in macOS Keychain. Unlock login Keychain and retry.`);
  }
}

async function stripeJson(path, { stripeSecretKey, method, body, idempotencyKey }) {
  const headers = {
    authorization: `Basic ${Buffer.from(`${stripeSecretKey}:`).toString("base64")}`,
  };
  if (body) headers["content-type"] = "application/x-www-form-urlencoded";
  if (idempotencyKey) headers["idempotency-key"] = idempotencyKey;

  const response = await fetch(`https://api.stripe.com${path}`, {
    method,
    headers,
    body,
  });
  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const message = payload.error?.message || response.statusText;
    fail(`Stripe API request failed (${response.status}): ${message}`);
  }
  return payload;
}

function installWorkerSecret(name, value) {
  const result = spawnSync("npx", ["wrangler", "secret", "put", name], {
    cwd: workerRoot,
    input: `${value}\n`,
    encoding: "utf8",
  });

  if (result.status !== 0) {
    fail(`wrangler secret put ${name} failed.`);
  }
}

function printUsage() {
  console.log(`Usage:
  STRIPE_SECRET_KEY="$(security find-generic-password -w -a stripe-live-secret-key -s sulemanji.stripe.worker-secret-key)" \\
  STRIPE_WEBHOOK_SECRET="$(security find-generic-password -w -a stripe-live-webhook-secret -s sulemanji.stripe.worker-webhook-secret)" \\
  npm run setup:stripe -- --install-worker-secrets

  STRIPE_SECRET_KEY=... npm run setup:stripe -- --create-webhook --store-keychain --install-worker-secrets

Options:
  --create-webhook              Create the live webhook endpoint if none exists for the URL
  --install-worker-secrets      Install STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET into Cloudflare Worker secrets
  --store-keychain              Store both Stripe secrets in macOS Keychain
  --webhook-url URL             Webhook URL (default: ${DEFAULT_WEBHOOK_URL})
  --secret-key-env NAME         Environment variable for Stripe API key (default: STRIPE_SECRET_KEY)
  --webhook-secret-env NAME     Environment variable for webhook secret (default: STRIPE_WEBHOOK_SECRET)
  --secret-key-service NAME     Keychain service for Stripe API key
  --secret-key-account NAME     Keychain account for Stripe API key
  --webhook-secret-service NAME Keychain service for webhook secret
  --webhook-secret-account NAME Keychain account for webhook secret
  --idempotency-key VALUE       Stripe idempotency key for webhook creation

This command prints no Stripe secrets and writes none to the repository.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
