import type { AgentInput } from "../agent/contracts";

export interface RiskDecision {
  hold: boolean;
  reasons: string[];
}

export const evaluateRisk = (input: AgentInput): RiskDecision => {
  const text = [
    input.intake.problem,
    input.intake.desiredOutcome,
    input.intake.priorAttempts,
    input.latestMessage ?? "",
    ...input.state.knownFacts,
    ...input.state.openQuestions,
  ]
    .join("\n")
    .toLowerCase();

  const reasons = new Set<string>();
  addIf(reasons, "regulated_advice", /\b(prescription|medical|insurance claim|legal advice|financial advice)\b/.test(text));
  addIf(reasons, "employee_surveillance", /\b(employee|staff|worker).*(monitor|surveillance|score|rank|fire|fired|terminate|productivity)\b/.test(text));
  addIf(
    reasons,
    "credentials_or_secrets",
    /\b(passwords?|api[_ -]?keys?|login[_ -]?tokens?|tokens?|credentials?|secret[_ -]?keys?)\b/.test(text),
  );
  addIf(reasons, "sensitive_third_party_data", /\b(tax record|medical note|private third-party|private client|client records?|identifier)\b/.test(text));
  addIf(reasons, "destructive_action", /\b(delete production|delete records?|close customer accounts?|remove records?)\b/.test(text));
  addIf(reasons, "high_impact_decision", /\b(housing|credit|essential services?|eligibility|access to essential)\b/.test(text));
  addIf(reasons, "unclear_authorization", /\b(without permission|without authorization|unauthorized|authorization is unclear|unclear authorization)\b/.test(text));
  addIf(reasons, "unsupported_claims", /\b(guarantee|certify|prove compliance)\b/.test(text));
  addIf(reasons, "contradiction", /\b(contradict|actually not|opposite|not .* anymore)\b/.test(text));
  addIf(reasons, "topic_expansion", input.topicExpansionDetected === true);
  addIf(
    reasons,
    "low_confidence_thread_mapping",
    input.lowConfidenceThreadMapping === true,
  );

  return { hold: reasons.size > 0, reasons: [...reasons] };
};

const addIf = (reasons: Set<string>, reason: string, condition: boolean): void => {
  if (condition) reasons.add(reason);
};
