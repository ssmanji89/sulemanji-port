---
writing_schema: 2
layout: writing-article
title: A seasonal outlook is a test calendar, not an incident forecast
description: Turn NOAA's winter outlook into continuity tests, local thresholds, and short-range decision triggers.
permalink: /notes/seasonal-outlook-test-calendar
published: true
published_on: "2026-10-29"
publication_family: professional-analysis
commercial_intent: none
disclosure_required: false
time_horizon: timely
reader: service-leader
topics:
  - infrastructure
  - service-operations
---

A seasonal outlook should change what an organization tests, not tell it which incident will happen. NOAA's 2026–27 U.S. Winter Outlook shifts the odds toward a warmer North and a wetter South and East, but it does not forecast a specific storm, outage, travel closure, or snowfall total. A service leader can use that signal to choose readiness work now, then use local forecasts and warnings to make event decisions later.

I work as a Sr. Services Engineer at Viyu Network Solutions. I developed this analysis with agent-assisted research, then checked it against the public NOAA, National Weather Service, and FEMA sources linked below. It does not describe Viyu systems, products, customers, controls, vendors, architecture, or operating practices.

The practical question is: **how should a service leader act on a seasonal outlook without pretending it predicts an incident?** My answer is a two-clock operating model. Use the seasonal outlook to schedule tests and remove known weaknesses. Use short-range probabilities, watches, and warnings to activate specific actions against local thresholds.

## What does NOAA's winter outlook actually say?

NOAA released its [2026–27 U.S. Winter Outlook](https://www.noaa.gov/news-release/el-nino-looms-large-over-us-winter-outlook) on October 15, 2026. For December through February, it favors warmer-than-average temperatures across much of the northern United States. It favors wetter-than-average conditions across the southern tier and East Coast. It also identifies regions with equal chances of below-, near-, or above-average seasonal conditions.

The word *favors* matters. NOAA's Climate Prediction Center expresses a seasonal outlook as probabilities across three categories: above normal, near normal, and below normal. Those categories divide the 1991–2020 climate distribution into thirds. A colored region means one category has more than its baseline one-third chance. It does not mean that outcome is certain.

An equal-chances region is not a forecast of normal conditions. It means the available evidence does not favor one of the three categories over the others. Treating white space on the map as “nothing to plan for” converts uncertainty into confidence that the outlook never supplied.

The outlook also has a strict time and measurement boundary. NOAA says it covers seasonal mean temperature, seasonal total precipitation, and expected drought change. It does not project seasonal snowfall totals because useful snow forecasts generally do not extend beyond about a week. A wetter-than-average season can arrive through a few disruptive events, many modest events, rain instead of snow, or a mix that differs by location.

## Why is the seasonal map not an incident plan?

An incident plan needs a place, a threshold, a lead time, an owner, and a decision. A seasonal map provides none of those by itself. It cannot say whether a specific office will lose power, whether a road will close during a shift change, whether a carrier will miss a delivery, or whether a remote worker's local connection will fail.

The planning error is to move directly from a regional tendency to a single operational conclusion. “Warmer than average” does not remove extreme cold. “Wetter than average” does not identify the day, form, or amount of precipitation. “Equal chances” does not remove risk. The categories describe a season relative to a climate baseline, not the worst event inside that season.

The better use is to ask which dependencies become expensive when winter conditions cross a threshold. FEMA's [Continuity Guidance Circular](https://www.fema.gov/sites/default/files/documents/fema_continuity-guidance-circular_082024.pdf) recommends identifying essential functions, the activities and resources that support them, interdependencies, and the consequences of disruption. A seasonal outlook can help choose which of those dependency paths to test first. It cannot prove that the path will fail.

## How do the two clocks work?

The operating model needs two clocks because preparedness and activation use different evidence. The seasonal clock asks which capabilities deserve testing before winter. The event clock asks whether a current local forecast has crossed a threshold that starts an action. Keeping the clocks separate prevents a long-range tendency from becoming a false alarm or a false assurance.

### Clock one: schedule readiness work

Use the seasonal outlook to set a bounded readiness window. Review the locations and functions exposed to precipitation, cold, ice, travel limits, or power interruption. Select a small number of dependency tests whose failure would affect an essential service.

Good readiness questions are specific enough to test:

1. Can the essential function continue if the primary site loses power for the approved planning period?
2. Can the assigned staff perform the function if travel becomes unsafe or a location closes?
3. Can people receive and acknowledge an operational notice through a separate communication path?
4. Can a critical supplier or carrier state its own trigger, fallback, and recovery contact?
5. Can the organization verify the restored service before normal work resumes?

These questions do not assume that a storm will occur. They expose whether the organization has an owned decision and observable evidence if one does.

### Clock two: activate local decisions

Use current local forecasts, watches, and warnings for activation. NOAA's new [Probabilistic Precipitation Portal](https://www.weather.gov/mfl/winter) presents low-end, expected, and high-end amounts for rain, snow, and ice over the next 72 hours. It also shows the probability that precipitation will exceed selected thresholds.

That format supports a decision better than a single expected value. The low end shows a plausible floor. The high end shows a reasonable upper scenario. Exceedance probabilities let an owner ask the useful question: what is the chance that conditions cross the point where this action becomes necessary?

The threshold must come from the decision, not from the weather map. One site may act before ice reaches a limit for safe access. Another function may depend on a power, staffing, transport, or supplier threshold. The forecast supplies a probability. The owner supplies the consequence and action.

## What should the decision record contain?

The decision record should connect a public warning signal to one owned action. Keep the fields separate so that a confident forecast cannot hide a weak continuity plan.

| Field | Question | Evidence to retain |
| --- | --- | --- |
| Essential function | What must continue, and how long can it pause? | Approved function and recovery requirement |
| Dependency | Which person, facility, utility, connection, supplier, or route can stop it? | Current dependency owner and contact |
| Local threshold | Which observed or forecast condition requires a decision? | Unit, location, probability, and source |
| Action | What starts, stops, moves, or changes when the threshold is met? | Named owner and authorized action |
| Verification | What proves the alternate path or recovery works? | Timestamped test or service observation |
| Expiration | When must the decision be checked again? | Next forecast, warning update, or fixed review time |

Avoid vague thresholds such as “bad weather” or “high risk.” A threshold should be observable and tied to a consequence. It may use a watch or warning, an exceedance probability, a utility notice, a site condition, or a supplier status. The record should state which source controls when signals disagree.

The record also needs an off-ramp. State when the action ends, who confirms recovery, and what evidence returns the function to normal operation. A start condition without a stop condition can keep an emergency mode active after its benefit ends.

## What should the readiness exercise test?

Test one essential function across the complete dependency path. A tabletop that ends after “staff work remotely” has only named an intention. It has not shown that staff can authenticate, reach the required service, communicate with the decision owner, complete the critical transaction, or verify the result.

Use one plausible scenario, but do not claim that the seasonal outlook predicts it. For example: local authorities issue an ice storm warning, travel becomes unsafe before the next shift, and commercial power is interrupted. The exercise should then follow the actual decision record from signal to activation, service operation, communication, recovery, and verification.

Record where the exercise stops. A missing contact, an untested alternate connection, an inaccessible procedure, or an unclear recovery owner is a useful finding. Convert each finding into one owner, one correction, one evidence requirement, and one due date.

FEMA provides [continuity exercise starter kits](https://preptoolkit.fema.gov/web/em-toolkits/continuity-of-essential-functions) that organizations can adapt for tabletop exercises. The useful measure is not whether the discussion finished. It is whether the exercise produced evidence for the essential function and exposed decisions that still lack an owner or test.

## When does this model not apply?

This model does not replace emergency instructions. Life-safety warnings, evacuation orders, utility directions, and local emergency-management guidance control when they apply. An organization should not delay a required action while it builds a better planning record.

It also does not justify spending solely because a region appears in a favored category. A seasonal probability is not evidence that a specific asset needs replacement. Use it to schedule inspection, testing, and decision review. Use asset condition, service requirements, local exposure, and test results to approve a change.

The model is also too broad for immediate incident response. Once an event begins, use current observations, local warnings, service state, and the established response authority. The seasonal outlook has already done its job if it caused the organization to test the dependency and define the trigger before the event.

## What should happen next?

Choose one essential function and one location. Write the maximum tolerable pause, list the people and resources it depends on, and name one winter condition that could interrupt it. Then define the local signal, threshold, owner, action, verification step, and expiration.

Run a short tabletop before the next seasonal update on November 19. Use a scenario that tests power, access, communications, and one external dependency. Keep the scenario generic enough to avoid predicting a storm, but concrete enough that every participant must make a decision.

A seasonal outlook earns its place in operations when it changes the test calendar before an incident. It becomes dangerous when a regional probability is treated as a local promise. Prepare on the long clock, decide on the short clock, and keep the evidence for both.

*Primary NOAA, National Weather Service, and FEMA sources reviewed October 29, 2026. Seasonal outlooks, local forecasts, and warning products change. Recheck the current official sources before making an operational or safety decision.*
