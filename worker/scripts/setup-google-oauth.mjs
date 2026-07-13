#!/usr/bin/env node

import { execFileSync, spawnSync } from "node:child_process";
import { createServer } from "node:http";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(__dirname, "..");

const SCOPES = [
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.freebusy",
];

const args = parseArgs(process.argv.slice(2));

if (args.help || !args.clientFile) {
  printUsage();
  process.exit(args.help ? 0 : 1);
}

if (!args.installWorkerSecrets) {
  fail("Refusing to mint OAuth credentials unless --install-worker-secrets is set.");
}

const sender = args.sender || process.env.GMAIL_SENDER || "ssmanji89@gmail.com";
const labelName = args.label || process.env.GMAIL_CLINIC_LABEL_NAME || "AI Workflow Services";
const client = readOAuthClient(args.clientFile);
const redirect = await waitForOAuthRedirect();

tryOpen(authUrl(client.clientId, redirect.uri, sender));
console.log("Opened Google OAuth consent in the browser.");
console.log("If a browser did not open, paste the following URL into Chrome:");
console.log(redirect.authUrl);

const code = await redirect.code;
const token = await exchangeCode(client, redirect.uri, code);
if (!token.refresh_token) {
  fail(
    "Google did not return a refresh token. Revoke this app grant or create a fresh OAuth client, then rerun.",
  );
}

const profile = await googleJson("https://gmail.googleapis.com/gmail/v1/users/me/profile", {
  accessToken: token.access_token,
});
if (profile.emailAddress?.toLowerCase() !== sender.toLowerCase()) {
  fail(`Authenticated Gmail account did not match expected sender ${sender}.`);
}

const labelId = await ensureGmailLabel(token.access_token, labelName);
await validateCalendar(token.access_token);

installWorkerSecret("GMAIL_CLIENT_ID", client.clientId);
installWorkerSecret("GMAIL_CLIENT_SECRET", client.clientSecret);
installWorkerSecret("GMAIL_REFRESH_TOKEN", token.refresh_token);
installWorkerSecret("GMAIL_CLINIC_LABEL", labelId);
installWorkerSecret("GMAIL_HISTORY_START_ID", profile.historyId);
installWorkerSecret("GOOGLE_CALENDAR_CLIENT_ID", client.clientId);
installWorkerSecret("GOOGLE_CALENDAR_CLIENT_SECRET", client.clientSecret);
installWorkerSecret("GOOGLE_CALENDAR_REFRESH_TOKEN", token.refresh_token);

console.log("Google OAuth, Gmail label, and Gmail history seed were installed as Worker secrets.");
console.log("No OAuth secrets were printed or written to the repository.");

function parseArgs(argv) {
  const parsed = {
    clientFile: "",
    sender: "",
    label: "",
    installWorkerSecrets: false,
    help: false,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--client-file") {
      parsed.clientFile = requireValue(argv, ++index, arg);
    } else if (arg === "--sender") {
      parsed.sender = requireValue(argv, ++index, arg);
    } else if (arg === "--label") {
      parsed.label = requireValue(argv, ++index, arg);
    } else if (arg === "--install-worker-secrets") {
      parsed.installWorkerSecrets = true;
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

function readOAuthClient(path) {
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  const source = parsed.installed || parsed.web || parsed;
  const clientId = source.client_id;
  const clientSecret = source.client_secret;
  if (!clientId || !clientSecret) {
    fail("OAuth client JSON must include client_id and client_secret.");
  }
  return { clientId, clientSecret };
}

async function waitForOAuthRedirect() {
  let server;
  const code = new Promise((resolveCode, rejectCode) => {
    server = createServer((request, response) => {
      try {
        const requestUrl = new URL(request.url || "/", "http://127.0.0.1");
        if (requestUrl.pathname !== "/oauth2callback") {
          response.writeHead(404).end("Not found");
          return;
        }

        const error = requestUrl.searchParams.get("error");
        if (error) {
          response.writeHead(400).end("OAuth failed. You can close this tab.");
          rejectCode(new Error(error));
          return;
        }

        const authCode = requestUrl.searchParams.get("code");
        if (!authCode) {
          response.writeHead(400).end("Missing OAuth code. You can close this tab.");
          rejectCode(new Error("Missing OAuth code"));
          return;
        }

        response.writeHead(200, { "content-type": "text/plain" });
        response.end("OAuth complete. You can close this tab and return to the terminal.");
        resolveCode(authCode);
      } finally {
        server?.close();
      }
    });
  });

  await new Promise((resolveListen) => server.listen(0, "127.0.0.1", resolveListen));
  const address = server.address();
  if (!address || typeof address === "string") fail("Could not allocate local OAuth callback port.");
  const uri = `http://127.0.0.1:${address.port}/oauth2callback`;

  return {
    uri,
    code,
    get authUrl() {
      return authUrl(readOAuthClient(args.clientFile).clientId, uri, sender);
    },
  };
}

function authUrl(clientId, redirectUri, loginHint) {
  const url = new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", SCOPES.join(" "));
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("login_hint", loginHint);
  return url.toString();
}

async function exchangeCode(client, redirectUri, code) {
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: client.clientId,
      client_secret: client.clientSecret,
      redirect_uri: redirectUri,
      code,
      grant_type: "authorization_code",
    }),
  });

  if (!response.ok) {
    fail(`OAuth token exchange failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

async function ensureGmailLabel(accessToken, labelName) {
  const labels = await googleJson("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    accessToken,
  });
  const existing = labels.labels?.find((label) => label.name === labelName);
  if (existing?.id) return existing.id;

  const created = await googleJson("https://gmail.googleapis.com/gmail/v1/users/me/labels", {
    accessToken,
    init: {
      method: "POST",
      body: JSON.stringify({
        name: labelName,
        labelListVisibility: "labelShow",
        messageListVisibility: "show",
      }),
    },
  });
  if (!created.id) fail("Gmail label creation did not return a label id.");
  return created.id;
}

async function validateCalendar(accessToken) {
  const startsAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const endsAt = new Date(startsAt.getTime() + 30 * 60 * 1000);
  await googleJson("https://www.googleapis.com/calendar/v3/freeBusy", {
    accessToken,
    init: {
      method: "POST",
      body: JSON.stringify({
        timeMin: startsAt.toISOString(),
        timeMax: endsAt.toISOString(),
        items: [{ id: "primary" }],
      }),
    },
  });
}

async function googleJson(url, { accessToken, init = {} }) {
  const headers = new Headers(init.headers);
  headers.set("authorization", `Bearer ${accessToken}`);
  if (init.body) headers.set("content-type", "application/json");

  const response = await fetch(url, { ...init, headers });
  if (!response.ok) {
    fail(`Google API request failed: ${response.status} ${await response.text()}`);
  }
  return response.json();
}

function installWorkerSecret(name, value) {
  const result = spawnSync("npx", ["wrangler", "secret", "put", name], {
    cwd: workerRoot,
    input: `${value}\n`,
    stdio: ["pipe", "ignore", "pipe"],
    encoding: "utf8",
  });
  if (result.status !== 0) {
    fail(`Failed to install Worker secret ${name}: ${result.stderr.trim()}`);
  }
  console.log(`Installed Worker secret ${name}.`);
}

function tryOpen(url) {
  try {
    execFileSync("open", [url], { stdio: "ignore" });
  } catch {
    // Printing the URL below is the fallback.
  }
}

function printUsage() {
  console.log(`Usage:
  npm run setup:google-oauth -- --client-file ~/Downloads/client_secret.json --install-worker-secrets

Options:
  --client-file PATH          Google OAuth Desktop client JSON from Cloud Console
  --sender EMAIL              Gmail sender to authorize (default: ssmanji89@gmail.com)
  --label NAME                Gmail label to create/use (default: AI Workflow Services)
  --install-worker-secrets    Required; writes OAuth, label, and history values to Cloudflare secrets

This command prints no OAuth secrets and writes none to the repository.`);
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
