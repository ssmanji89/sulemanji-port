#!/usr/bin/env node

import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const workerRoot = resolve(__dirname, "..");
const repoRoot = resolve(workerRoot, "..");
const schemaPath = resolve(workerRoot, "schemas/agent-decision.schema.json");

const apiBase = envRequired("AI_WORKFLOW_API_BASE").replace(/\/$/, "");
const accessJwt = process.env.CF_ACCESS_JWT_ASSERTION ?? "";
const codexPath = process.env.CODEX_CLI_PATH || "codex";

const headers = {
  "content-type": "application/json",
  ...(accessJwt ? { "cf-access-jwt-assertion": accessJwt } : {}),
};

const claim = await postJson(`${apiBase}/v1/admin/agent/jobs/next`, {});
if (!claim.job) {
  console.log("No local agent jobs are pending.");
  process.exit(0);
}

const decision = runCodexForDecision(claim.job);
await postJson(`${apiBase}/v1/admin/agent/jobs/${claim.job.id}/complete`, {
  decision,
});

console.log(`Completed local agent job ${claim.job.id}.`);

function runCodexForDecision(job) {
  const tempDir = mkdtempSync(resolve(tmpdir(), "ai-workflow-agent-"));
  const outputPath = resolve(tempDir, "decision.json");
  const promptPath = resolve(tempDir, "prompt.md");

  try {
    writeFileSync(promptPath, promptForJob(job), { mode: 0o600 });
    execFileSync(
      codexPath,
      [
        "exec",
        "--ephemeral",
        "--skip-git-repo-check",
        "-C",
        repoRoot,
        "--output-schema",
        schemaPath,
        "-o",
        outputPath,
        "-",
      ],
      {
        input: readFileSync(promptPath),
        stdio: ["pipe", "ignore", "pipe"],
        maxBuffer: 1024 * 1024 * 10,
      },
    );

    return JSON.parse(readFileSync(outputPath, "utf8"));
  } finally {
    rmSync(tempDir, { recursive: true, force: true });
  }
}

function promptForJob(job) {
  return [
    "You are producing one AI Workflow Services discovery decision.",
    "",
    "Return only JSON that matches the provided output schema.",
    "",
    "Rules:",
    "- Use only the intake, state, and latestMessage data in this job.",
    "- Ask exactly one question when more discovery is needed.",
    "- Produce a checkpoint only when the problem appears understood enough for customer confirmation.",
    "- Produce a blueprint only when confirmedUnderstanding is true.",
    "- Return a hold decision for sensitive, ambiguous, regulated, credential, surveillance, high-impact, or high-liability cases.",
    "- Do not request or handle credentials, secrets, attachments, regulated records, or sensitive third-party data.",
    "",
    "Job:",
    JSON.stringify(job, null, 2),
  ].join("\n");
}

async function postJson(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status} ${await response.text()}`);
  }

  return response.json();
}

function envRequired(name) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}
