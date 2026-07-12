import type { CaseStatus } from "./case";

const allowed: Record<CaseStatus, readonly CaseStatus[]> = {
  intake_received: ["normal_queue", "checkout_pending"],
  normal_queue: ["closed"],
  checkout_pending: ["paid_pending_start", "closed"],
  paid_pending_start: [
    "discovery_active",
    "declined_refund_pending",
    "failed_requires_attention",
  ],
  discovery_active: [
    "waiting_for_customer",
    "waiting_for_suleman",
    "paused_inactive",
  ],
  waiting_for_customer: [
    "discovery_active",
    "understanding_review",
    "paused_inactive",
  ],
  understanding_review: [
    "discovery_active",
    "waiting_for_suleman",
    "blueprint_ready",
  ],
  waiting_for_suleman: [
    "discovery_active",
    "understanding_review",
    "blueprint_ready",
    "declined_refund_pending",
  ],
  blueprint_ready: ["blueprint_delivered", "waiting_for_suleman"],
  blueprint_delivered: ["priority_scheduling", "closed"],
  priority_scheduling: ["slot_held", "closed"],
  slot_held: ["balance_payment_pending", "priority_scheduling"],
  balance_payment_pending: [
    "session_confirmed",
    "priority_scheduling",
    "failed_requires_attention",
  ],
  session_confirmed: ["closed"],
  paused_inactive: ["discovery_active", "closed"],
  closed: [],
  declined_refund_pending: ["closed", "failed_requires_attention"],
  payment_disputed: ["closed", "failed_requires_attention"],
  failed_requires_attention: [
    "discovery_active",
    "waiting_for_suleman",
    "closed",
  ],
};

export const canTransition = (from: CaseStatus, to: CaseStatus) =>
  allowed[from].includes(to);
