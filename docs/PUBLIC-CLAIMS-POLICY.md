# Agent Claims Policy — Suleman Manji public/professional claims

**Status:** FINAL v1.0 (2026-08-30). Formalized from `do-not-claim.md` (31 entries) per owner directive. This is the normative document; `do-not-claim.md` remains the evidence appendix behind it.
**Binds:** every agent producing, editing, or reviewing content about Suleman Manji's professional work — site pages, resume, PDFs, case studies, field notes, READMEs, PR descriptions, social copy, and any text another person might read.
**Enforcement:** `sulemanji/scripts/verify_public_safety.py` mechanically enforces §4 and parts of §3; everything else is judgment this document settles. A verifier pass is necessary, never sufficient.

## §0. The three-question gate (run before writing any claim)

1. **Provenance** — can you point to the artifact behind the claim (`evidence-ledger.jsonl` id, repo, commit, report)? No artifact → no claim.
2. **State** — is the delivery state stated honestly using the fixed vocabulary: *discussed → planned → prototyped → implemented → tested → released → deployed → adopted → measured*? Never promote a state (a prototype is never "delivered"; a design target is never a result).
3. **Surface** — is the claim allowed on this surface (§6)? Public site < private resume < interview, in ascending permissiveness.

A claim failing any question is either dropped or rewritten until it passes — never softened into vagueness that implies more than the evidence.

## §1. Identity and framing (MUST)

- Voice: **Sr. Services Engineer at a managed IT services provider** (Viyu Network Solutions; vArida/ARW Systems context) who delivers MSP service through agentic-LLM systems he builds. Never founder/owner/product-vendor framing for the MSP work.
- The site is a personal life-profile, not a storefront. The "AI Agent Control Plane" productized framing was tried and reverted by owner decision — do not reintroduce it.
- Implementation honesty: platform work is *materially agent-assisted*; his stated role is architecture, contracts, orchestration, review standards, and evidence judgment. Keep that sentence-shape; never imply hand-typed volume.
- **Work With Me framing (owner-stated 2026-08-30):** he is an FTE at Viyu; the page offers personal help on *home-level/hobby-scale* problems ONLY, and explicitly routes business-grade work to Viyu/vArida/ARW as a referral. Never frame him as a freelancer, consultancy, or agency; never present personal engagement as competing with his employer.

## §2. Attribution (NEVER violate)

- **Upstream projects are not his**: AlgaPSA (Nine Minds) and Hermes Agent (Nous Research) — permitted verbs: *forked, extended, deployed, operates, integrates*. Forbidden: *built, created, authored*.
- **Shared work stays shared**: auvik-ipsec-infrastructure is ~89% a colleague's (contributor framing only); bodhi-teams is contributor + one integration; NinjaOne-Scripts is 100% third-party (claim nothing).
- **hermes-mem0 is private forever** (owner decision 2026-08-30): personal tool, prototype of the "vendor-CLIs-as-their-own-Department" architecture vision, not yet integrated into viyu-agents as envisioned. Never link it, name it as a project, or propose releasing it. The architecture *idea* may be described in prose without the name.

## §3. Numbers policy

**Whitelist — the only figures currently printable, with their mandatory phrasing/provenance:**
| Figure | Required framing | Provenance |
|---|---|---|
| 13 vendor-platform CLIs, 141 commands (14 CLIs total incl. the platform's own), 307 skill modules, 28 agent definitions | "counted from the primary platform repository / generated contract in August 2026"; "13" is correct ONLY with the "vendor-platform" qualifier — bare "13 CLIs" is wrong, the contract enumerates 14 | mechanical count + contract count, 2026-08-30 (raw/cli-command-counts.md) |
| 6,000+ authored commits over ~7 months (viyu-agents) | organic authorship; never total-repo commits (vendored upstream inflates them) | git shortlog 2026-08-30 |
| +15% time-entry compliance (21.0 → 24.25 logged days/month) | "temporally consistent with" the reconciler — never "caused by"; this is the ONLY agent-impact metric | cwm-cli audit, raw/hours-saved-audit.md |
| −1.24% aggregate shadow-billing gap; 40/51 clients within 5% | shadow-validation metric, qualitative billing framing around it | memory-recorded shadow harness |
| 240 tests / 18 commands / released wheel + container (ff-cli) | public repo, freely citable | repo + releases |
| 2,049 role-typed subagent sessions; 670 independent reviewer runs (May–Aug 2026) | session telemetry, date-bounded | codex-sessions stats |

**Blocked until validated** (validation-backlog): 641 users/6,543 GB vs EZMig 600+/6,500+ (conflicting sources — print neither; approved fallback: "a multi-terabyte, several-hundred-user migration platform"); any billing dollar figure (say "six-figure monthly"); per-CLI command totals until Task-4 extraction lands.
**Blocked permanently:** hours-saved/throughput/faster-resolution claims (falsified by the cwm-cli audit — metrics move the wrong direction under mix-shift confounds); trading performance/P&L of any kind; "80% AI cost reduction" as a result (design target only); pre-2025 resume figures may persist as *carried resume claims* but must never be escalated to "verified."

## §4. Confidentiality (mechanically enforced — extend the verifier when this list grows)

- **Never in public text:** client/company names from the engagement corpus (Crebrid, Wildcat, CCC, Medve, BrowningOil, TAG, WNLIC, Jameswood/James Wood, Praesidium, Providence Energy, Peak Trailer, Oden Hughes/OHT, Essential HR, Sterling Personnel, Spectrum Diamonds, FullerLaw, ROMCO, Dunn & Dill, Eagle Metal, 2112 Capital, VisitDallas, AAA Trophy, Soci LP, Ranger Plant, Advance Components — and any newly encountered client); ticket numbers; internal incident IDs (write "an incident in late May", not "INC-2026-05-26"); colleague names in narratives; personnel stories (the departure context behind the billing program is confidential — external framing is "process automation/continuity"); internal domains, IPs, stack numbers, tenant IDs, credentials, or infrastructure identifiers; security-incident specifics (patterns publishable after sanitization; incidents never).
- **Anonymization pattern:** industry + size ("a commercial lending group, ~96 users"), never name + detail.
- The 2026-08-04 secret-exposure incident and this audit's own credential-scrub are never referenced publicly.

## §5. Style floor for public claims

- Show, don't label. Banned filler: passionate, leverage, robust, seamless, delve, journey, game-changer, revolutionize.
- Every quantitative claim carries its date or provenance inline ("counted August 2026", "May–August 2026 telemetry").
- Honest-state labels stay attached: "foundation in progress", "paper research, not a live account", "pilot".
- Understated first-person; the reader should be able to disbelieve nothing.

## §6. Surface rules

- **Public (site, READMEs, posts):** §1–§5 in full; whitelist numbers only; verifier must pass.
- **Private resume/PDF:** same rules, plus carried pre-2025 resume claims allowed as-is (not escalated); client industries may be slightly more specific but still unnamed.
- **Interview conversation:** engagement specifics may be discussed qualitatively under NDA-style discretion; still no personnel stories, no security-incident victims, no trading performance.
- **Never anywhere:** §2 attribution violations, §3 permanently-blocked claims, §4 identifiers.

## §7. Change control

- New claim or number → add it to §3's whitelist WITH provenance in the same change; a claim not in the whitelist is blocked by default.
- New client/entity encountered → add to §4 and to `verify_public_safety.py`'s FORBIDDEN list in the same change.
- Owner decisions recorded in hermes-mem0 override this document until it is revised to match; when in conflict, the newest owner statement wins and this file gets updated.
- This policy is installed into the site repo (AGENTS.md pointer + `docs/PUBLIC-CLAIMS-POLICY.md`) so site-working agents load it; the audit-dir copy is canonical.
