---
writing_schema: 2
layout: writing-article
title: "Treat ERCOT disclosure as a project-state release"
description: "Decide whether to authorize ERCOT disclosure by reconciling project identity, load, water, construction, staffing, and noise forecasts first."
permalink: /notes/ercot-data-center-disclosure-project-state
published: true
published_on: "2026-11-25"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - infrastructure
  - service-operations
---

ERCOT's disclosure authorization is a public project-state release, not a routine administrative consent. Its November 20 notice gives data center developers until December 4, 2026, to authorize publication of selected project information, including identity, coordinates, requested interconnection capacity, expected load, generation, water, construction, staffing, land, and noise fields. ([ERCOT disclosure notice](https://www.ercot.com/services/comm/mkt_notices/M-B112026-01))

I work as a Sr. Services Engineer at Viyu Network Solutions. This analysis uses public ERCOT material and does not describe a Viyu implementation, customer, internal workflow, product, architecture, control, exposure, or roadmap.

The useful decision is not whether transparency is good in the abstract. A developer needs to decide whether the named fields are internally reconciled, whether each forecast carries an honest maturity label, and whether the organization is prepared for outsiders to compare the release with later filings and outcomes.

## What would ERCOT be allowed to disclose?

The authorization covers a bounded subset of the earlier State and Community Impact Request for Information. ERCOT says it will keep other submitted information confidential under its applicable obligations, and it will not disclose the selected project-level information without written developer authorization. ([ERCOT disclosure notice](https://www.ercot.com/services/comm/mkt_notices/M-B112026-01))

The selected fields form one public story even though they come from several disciplines:

| Field family | Examples in the notice | Likely public question |
| --- | --- | --- |
| Project identity | Project, developer, owner, latitude, longitude | Who is proposing what, and where? |
| Power | Requested interconnection capacity, requested energization date, annual demand forecast | How large is the request, and when might demand arrive? |
| On-site generation | Presence, fuel, nameplate capacity, expected commissioning date | How much generation is proposed, and what kind? |
| Water | Projected withdrawal, projected consumption, source mix, wastewater destination | What local water claim accompanies full buildout? |
| Delivery | Construction duration, start and completion dates, land area | How mature is the schedule? |
| Community effects | Construction and operating staffing, expected noise | What local benefit and burden is being forecast? |

The underlying RFI is broader. ERCOT's public reference guide covers financial assistance, power self-sufficiency, water, cooling, community effects, ownership, and controlling interests for qualifying, not-yet-energized data center projects. The disclosure authorization does not make that entire response public. ([ERCOT RFI reference guide](https://www.ercot.com/files/docs/2026/09/18/State-and-Community-Impact-RFI_Question-Reference-9.18.26.pdf))

That boundary matters in both directions. Authorization is not blanket publication of every RFI answer, but the selected fields are not trivial metadata. Coordinates, owners, resource forecasts, and dates can be combined into a durable account of a project's stated condition.

## Should a developer authorize disclosure?

A developer should authorize only after treating the selected fields as one controlled release. The decision should pause when the project, legal, power, water, construction, community, and communications owners cannot all defend the same dated record.

Authorization is most defensible when three conditions hold:

1. **The record is internally consistent.** The requested load, demand ramp, on-site generation, water assumptions, schedule, land, staffing, and noise estimates describe the same project version.
2. **The record preserves maturity.** Requested, projected, expected, estimated, and actual values remain visibly different. A target date is not rewritten as a commitment merely because it will become public.
3. **The record has an update owner.** Someone is responsible for identifying material changes and deciding whether later public statements need correction or explanation.

A pause is reasonable when location or ownership data remains disputed, when one forecast was copied from a superseded design, or when public explanation would require inventing certainty that the source response did not contain. A pause is not the same as a judgment against transparency; it means the release packet is not ready.

ERCOT's preliminary November 5 update reinforces the maturity problem. It says projects with later planned energization dates used “N/A or unable to answer” more often, consistent with lower project maturity, and labels the analysis preliminary and subject to change. ([ERCOT preliminary RFI update](https://www.ercot.com/files/docs/2026/11/05/Community-Impact-RFI-PUC-Update.pdf)) A public dataset should preserve that uncertainty instead of flattening every row into an equally mature project.

## Why is requested capacity not operating load?

Requested interconnection capacity is evidence of a request. It is not proof that the project has completed studies, executed every required agreement, received approval to energize, reached its forecast demand, or even kept the same design.

ERCOT publishes the State and Community Impact RFI separately from its Large Load Integration resources. The integration page describes verification before final Batch Zero classifications and also identifies an energization request that must be approved before a new standalone Large Load is energized. ([ERCOT Large Load Integration](https://www.ercot.com/services/rq/large-load-integration)) The Planning Guide separately describes interconnection studies, agreements, modeling, telemetry, stability work, and a current load commissioning plan among the conditions surrounding initial energization. ([ERCOT Planning Guide, Section 9](https://www.ercot.com/files/docs/2026/10/27/October-29-2026-Planning-Guide.pdf))

The clean public vocabulary is therefore staged:

| Statement | Evidence it supports | Evidence it does not support |
| --- | --- | --- |
| Developer submitted an RFI response | A response exists for the covered project | The project is approved or will be built |
| Developer authorized disclosure | ERCOT may publish the selected fields | Every RFI answer is public or independently verified |
| Project requested a capacity and date | Those values were requested at the recorded time | Capacity is available, reserved, energized, or consumed |
| Project forecast demand or water use | The project supplied a forward estimate | The estimate has occurred or will occur as stated |
| Project received approval to energize | A later interconnection milestone has been reached | The project has reached full buildout or forecast demand |

This is the same discipline behind the observation that [an AI acceleration estimate is not a capacity plan](/notes/ai-acceleration-estimate-capacity-plan): a forecast can guide a decision without becoming a measured result. It also resembles [a cyber risk register not being an executive decision](/notes/cyber-risk-register-executive-decision): the record informs governance, while an accountable person still owns the choice.

## What should the release packet contain?

The release packet should be small enough to review before December 4 and strong enough to explain the decision months later.

1. **Freeze the candidate fields.** Export the exact values covered by the authorization and attach the extraction time, RFI version, project identifier used internally for reconciliation, and a content hash. Keep that private identifier out of public commentary unless ERCOT includes it in the authorized fields.
2. **Assign an evidence owner to each family.** Legal owns entity and authorization questions; power and engineering own load and generation; water and environmental leads own water and wastewater; delivery owns dates, land, staffing, and construction; community relations owns the explanation of local effects.
3. **Label state in the value.** Preserve words such as requested, projected, expected, estimated, and actual. Add an “as of” date to the private approval packet even when the public field has no date column.
4. **Reconcile dependencies.** A changed cooling design can affect water, generation, schedule, land, and noise. A changed energization plan can affect the annual demand ramp. Review the linked assumptions rather than approving each cell in isolation.
5. **Record the decision and trigger.** Name the person authorized to approve disclosure, the fields reviewed, known limitations, the date of approval, and the change that would require a fresh public explanation.

The packet should not publish private contracts, security designs, detailed site protections, or supporting material outside ERCOT's selected field list. Its purpose is to make the authorization accountable, not to expand it.

## How should public readers use the released data?

Public readers should treat any released dataset as a dated portfolio of developer statements. It can improve questions about geographic concentration, requested load, water sources, construction timing, staffing, and community effects. It cannot answer whether every project will proceed, whether every forecast is accurate, or how much load will be operating on a particular day.

Useful analysis keeps at least four columns beside every value: project, field, stated state, and source date. A requested energization date belongs in a different category from an actual construction start. Projected full-buildout water consumption belongs in a different category from measured consumption. A requested megawatt figure belongs in a different category from approved or energized demand.

ERCOT says its final State and Community Impact report is targeted for December 10, 2026, and the disclosure notice says the report will identify how many developers authorized release. The public dataset may follow after compilation, accompanied by another market notice. ([ERCOT Data Center Impact RFI](https://www.ercot.com/about/legal/data-center-impact-rfi)) That sequence makes the first publication a baseline, not a timeless inventory.

The practical response is bounded. Developers should reconcile the selected fields as one release, preserve forecast maturity, name an approval owner, and prepare a correction trigger. Public readers should separate disclosure, interconnection, approval, energization, and measured operation. Transparency becomes more useful when it carries the limits of what the record can prove.

*Public ERCOT sources reviewed November 24–25, 2026, around midnight America/Chicago. The authorization deadline, report timing, field set, project data, and interconnection requirements can change; verify the linked ERCOT sources before submitting an authorization or relying on a released dataset.*
