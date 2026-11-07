# MSP Field Notes — Approved architecture (2026-11-06)

## Approved decisions
- Hybrid MSP Field Notes editorial publication anchored by Suleman Manji's professional identity.
- No personal face, voice, synthetic likeness or voice clone.
- Synthetic narration for explainers; silent, caption-led short clips.
- DigitalOcean cloud-first, containerized, CPU-first; authenticated Tailnet for operator access.
- Business-scale managed IT, cloud, security and M365 enquiries route to Viyu, not a competing freelance consultancy.
- Reuse existing sulemanji-port Writing/publication program (#21), editorial safety contracts and guarded publisher. Do not add a duplicate article scheduler.
- Integrate upstream calesthio/OpenMontage via its documented pipeline manifests, stage directors, preflight, decision log, storyboard review and export contract; preserve AGPLv3 obligations.

## Observed baseline
- DigitalOcean account returned zero Droplets on inventory query. Other resources and billing remain to be inventoried.
- Existing site is Jekyll/GitHub Pages with Cloudflare Worker. Existing Writing program is GitHub issue #21.
- OpenMontage agent guide mandates pipeline selection and creative checkpoints. Local export bundle is not a network publisher.
- Viyu memory recorded a November 6 private publishing worktree conflict. Preserve and reconcile existing article; never reset/overwrite it.
- The GitHub App installation was corrected on November 6 and the branch docs/msp-field-notes-cloud-design was successfully created.

## Logical components
1. Discovery inputs: public research, approved editorial notes, existing published articles and private Viyu context.
2. Editorial selection: one reader, one useful question, novelty, source authority, expected value, duplicate check.
3. Public-safe evidence manifest: provenance, claim classification, source rights, permitted scope, redaction.
4. OpenMontage production adapter: selected manifest, narration mode, 16:9 explainer / 9:16 silent clip, provider/cost policy.
5. Review: independent claims/privacy/licensing checks and render verification; honor OpenMontage creative gates.
6. Publication: reuse Sulemanji guarded workflow; platform-specific network publishers only after authorized integration.
7. Receipt: immutable source hashes, script and asset versions, render hashes, cost, review and public URLs.

## Production deployment
- Begin with one isolated CPU-first DigitalOcean Droplet only after full inventory, capacity, budget and security review.
- Containerize application runtime and OpenMontage; use persistent storage for manifests and artifacts, queue with idempotency keys, backups and bounded retries.
- Separate the public site from the private production network; Tailnet operator access, least-privilege workload credentials and no public viyu-memory endpoint.
- ChatGPT subscription is interactive/editorial, not a server API credential. Unattended model calls require separately budgeted supported APIs or local tools.
- No direct confidential Viyu memory content enters prompts for public media without a public-safe transformation and evidence gate.

## First vertical slice
- Source: already-published Intune policy-verification article.
- Deliverables: 4–6 minute synthetic narrated explainer and 35–50 second silent vertical companion.
- Evidence: manifest + claims matrix, playable files, subtitle/audio/frame checks, cost report, independent review, publication URLs and verified readback.
- Failure replay: restart after interruption without duplicated paid generation or damaged worktree.

## Non-goals
- New general-purpose CMS, second discovery scheduler, competing MSP consultancy, private-client footage, GPU-first hosting, fabricated case-study results or unverified platform uploads.
