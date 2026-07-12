import { z } from "zod";

export const CaseStatus = z.enum([
  "intake_received",
  "normal_queue",
  "checkout_pending",
  "paid_pending_start",
  "discovery_active",
  "waiting_for_customer",
  "understanding_review",
  "waiting_for_suleman",
  "blueprint_ready",
  "blueprint_delivered",
  "priority_scheduling",
  "slot_held",
  "balance_payment_pending",
  "session_confirmed",
  "paused_inactive",
  "closed",
  "declined_refund_pending",
  "payment_disputed",
  "failed_requires_attention",
]);
export type CaseStatus = z.infer<typeof CaseStatus>;

export const IntakeInput = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().email().max(254),
  contextType: z.enum(["personal", "professional"]),
  problem: z.string().trim().min(40).max(6000),
  desiredOutcome: z.string().trim().min(20).max(3000),
  priorAttempts: z.string().trim().max(3000).default(""),
  sanitizedLinks: z.array(z.string().url()).max(5),
  path: z.enum(["normal", "priority"]),
  termsAccepted: z.literal(true),
  turnstileToken: z.string().min(1),
  website: z.string().max(0),
});
export type IntakeInput = z.infer<typeof IntakeInput>;
