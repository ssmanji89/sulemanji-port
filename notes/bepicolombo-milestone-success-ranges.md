---
writing_schema: 2
layout: writing-article
title: "BepiColombo shows why milestone success needs ranges"
description: "Use BepiColombo's partial orbit-insertion miss to define target, recoverable, and stop states before a critical engineering change."
permalink: /notes/bepicolombo-milestone-success-ranges
published: true
published_on: "2026-11-25"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: architect
topics:
  - astronomy
  - infrastructure
  - service-operations
---

BepiColombo reached orbit around Mercury on November 21, 2026, but not in the orbit its team originally planned. A thruster burn ended early after a software problem, the spacecraft entered safe mode, and the resulting orbit took 75 hours instead of the planned 58. ESA nevertheless reported the spacecraft safe and the next separation milestone on track. ([ESA arrival update](https://www.esa.int/articles/about-us/directorates/science/bepicolombo/latest-updates-bepicolombo-s-arrival-at-mercury), [JAXA arrival update](https://www.isas.jaxa.jp/topics/004695.html))

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this analysis with agent-assisted research and checked its factual core against public ESA and JAXA sources. It does not describe Viyu systems, products, customers, controls, vendors, architecture, operating practices, or roadmap.

The useful question for an architect is: **when a critical step misses its exact target, what evidence makes the result recoverable rather than failed?** My answer is to define three outcome ranges before execution: the target state, an acceptable recovery state, and a stop state. A milestone should be judged by observed safety, preserved downstream options, and current evidence, not by the planned number alone.

## What happened during Mercury orbit insertion?

Mercury orbit insertion began at 18:24 UTC on November 21. The spacecraft temporarily lost contact with Earth as planned while it turned and executed commands autonomously. When contact returned, the control team found it in safe mode. ESA says a software glitch caused the thruster burn to stop earlier than expected. ([ESA arrival update](https://www.esa.int/articles/about-us/directorates/science/bepicolombo/latest-updates-bepicolombo-s-arrival-at-mercury))

The deviation was material. BepiColombo entered a 75-hour orbit rather than the planned 58-hour orbit. JAXA independently reported that the spacecraft reached a higher orbit than planned after the shortened burn, remained healthy, and was still expected to release its Mio orbiter on December 10 in Japan. ([JAXA arrival update](https://www.isas.jaxa.jp/topics/004695.html))

The milestone was also incomplete by design. BepiColombo is a composite mission with ESA's Mercury Planetary Orbiter and JAXA's Mio spacecraft still attached. The orbiters are scheduled to separate on December 9–10, Mio's sunshield is scheduled to separate on December 16, the European orbiter is expected to reach its final orbit in March 2027, and the science phase is scheduled to begin in April. ([ESA separation and orbit schedule](https://www.esa.int/articles/about-us/directorates/operations/bepicolombo-safely-in-mercury-orbit-despite-unexpected-challenge))

Those dates are plans, not completed results. As of this review, the public evidence supports a narrower statement: orbit capture succeeded, the expected intermediate orbit was missed, the spacecraft was safe, and the teams said the downstream separation and final-orbit objectives remained achievable.

## Why was the higher orbit not automatically a failure?

ESA says the orbit-insertion sequence was designed to adapt after each burn. With the actual trajectory known, the remaining maneuvers could be recalculated without adding thruster burns. That flexibility preserved the December separation and the path to the planned science orbit, according to the agency's November 23 update.

That does not make the 58-hour target unimportant. The target encoded the intended result of the burn and exposed the deviation immediately. But the target was not the mission's only boundary. Spacecraft health, stable capture, fuel, the ability to release Mio, and the ability to reach the final science orbit were also consequential.

The distinction is useful because engineering plans often collapse all of those concerns into one expected value. When that value is missed, the team is pushed toward one of two bad declarations: call the change a failure even though a controlled recovery remains available, or call it a success and hide the work still required. Outcome ranges give the team a more precise language.

## What should the three outcome ranges contain?

The labels below are my analytical framework, not ESA or JAXA terminology. Their value is in forcing a team to decide what a deviation means before schedule pressure and sunk cost enter the conversation.

| Range | Required evidence | Decision |
| --- | --- | --- |
| Target state | The intended state is observed, hard boundaries remain intact, and the next step can proceed | Continue under the planned path |
| Acceptable recovery state | The target was missed, but the system is safe, downstream objectives remain achievable, and a bounded recovery path is supported by current evidence | Pause, approve the revised path, and verify again |
| Stop state | A safety, authorization, integrity, resource, or observability boundary is crossed, or the team cannot prove which state it is in | Stop, contain, or roll back before continuing |

An acceptable recovery state is not a euphemism for “close enough.” It requires a new decision. The team must name the deviation, show which hard boundaries still hold, calculate the effect on later steps, and identify what evidence will move the system back toward the intended path.

The stop state matters just as much. A team that defines only success and recovery can rationalize almost any result. Some boundaries should end the attempt: an unverified backup, lost authorization, unexplained data corruption, exhausted resource margin, or a monitoring gap that prevents reliable state classification.

## Define success before the change begins

A useful change record can express the three ranges in five fields:

1. **Target observation:** State the result that must be measured after the change, not merely the command that should run.
2. **Hard boundaries:** Name the safety, authority, integrity, resource, and time limits that cannot be traded away.
3. **Recoverable variance:** Define which shortfalls can be accepted temporarily and which downstream options must remain possible.
4. **Stop condition:** Specify the evidence that requires containment, rollback, or escalation.
5. **Next decision:** Name who can approve a revised path and what fresh evidence that person needs.

The third field deserves particular attention. “Rollback if it fails” assumes the system will land cleanly in either the target state or the old state. Real changes can end in an intermediate state: partially migrated, degraded but stable, safe but outside the intended capacity, or functional with an unresolved cause. That state needs a named owner and a bounded decision, not an improvised success label.

This complements the idea of a [designed wait state](/notes/escapade-designed-wait-state). A wait state explains how work remains controlled while an external condition is unresolved. An acceptable recovery state explains how to classify a result after the system itself deviates from the plan. Both depend on explicit boundaries and evidence for the next irreversible step.

## A recovery decision needs more than one green signal

Three proofs should support a decision to continue from a recovery state.

First, prove the present state. Read the system that changed and confirm its health, integrity, and operating limits. A completed command or configuration value is not enough when the resulting state can differ from the request.

Second, prove that the next required option remains available. BepiColombo's public update did not stop at “orbit achieved.” It addressed the upcoming spacecraft separation and the ability to reach the final science orbit. For an ordinary engineering change, the equivalent might be a rollback path, a later migration stage, a capacity threshold, or continued access through a supported interface.

Third, preserve the unresolved cause separately from the recovery decision. A stable workaround can justify a bounded next step without proving that the defect is gone. The handoff should say what happened, what is known, what remains uncertain, and where the evidence can be checked. That is the same discipline described in [The work should outlast the agent session](/notes/work-outlasts-agent-session).

## When does this framework not apply?

Some misses are binary. A violated legal boundary, an unauthorized disclosure, corrupted evidence, or an irreversible safety breach cannot be converted into an acceptable result merely because the service still responds. The hard boundary controls the classification.

Some systems also lack enough observability to support a recovery range. If the team cannot tell whether data is complete, authority is preserved, or downstream state remains reachable, “recoverable” is speculation. The correct classification is the stop state until evidence improves.

BepiColombo is not a template for ordinary infrastructure operations. Its trajectory, propulsion, autonomy, and mission-control practices are specific to a planetary spacecraft. The transferable lesson is narrower: one planned value does not fully define a milestone, and a partial miss is acceptable only when current evidence shows that hard boundaries and the next important options remain intact.

The mission's status can still change. Mio has not yet separated, the final science orbit has not yet been reached, and science operations have not yet begun. Calling the November orbit insertion recoverable does not predeclare those later milestones successful.

## What should an architect do with a partial miss?

Do not start with the label. Start with the observed state. Compare it with the target, the hard boundaries, and the predeclared recovery range. If the result fits the recovery range, require a new approval for the revised path and record the evidence that preserves the next decision.

If no recovery range was defined, do not invent one under pressure. Treat the result as unclassified, pause the next irreversible action, and establish the missing boundaries with the people who own safety, authority, data, and operations.

BepiColombo's current state is useful because it resists a simple headline. The planned intermediate orbit was missed, yet stable capture and the next mission options remained. Good milestone design makes room for that distinction without weakening the stop conditions that protect the system.

*Public ESA and JAXA sources reviewed November 25, 2026, at approximately 1:30 a.m. America/Chicago. Mission state and future dates can change; verify the linked mission updates before relying on a current status claim.*
