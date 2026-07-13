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

export const WorkshopCategory = z.enum([
  "github_codebase_review",
  "ai_business_operations",
  "home_personal_automation",
  "not_sure_other",
]);
export type WorkshopCategory = z.infer<typeof WorkshopCategory>;

export const WORKSHOP_CATEGORY_LABELS: Record<WorkshopCategory, string> = {
  github_codebase_review: "GitHub / Codebase Review",
  ai_business_operations: "AI Business Operations",
  home_personal_automation: "Home + Personal Automation",
  not_sure_other: "Not sure / Other",
};

export const normalizeWorkshopCategory = (value: unknown): WorkshopCategory => {
  const parsed = WorkshopCategory.safeParse(value);
  return parsed.success ? parsed.data : "not_sure_other";
};

export const IntakeInput = z.preprocess(
  (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return value;
    }

    const raw = value as Record<string, unknown>;
    return {
      ...raw,
      workshopCategory: normalizeWorkshopCategory(raw.workshopCategory),
    };
  },
  z.object({
    name: z.string().trim().min(2).max(120),
    email: z.string().email().max(254),
    contextType: z.enum(["personal", "professional"]),
    workshopCategory: WorkshopCategory,
    problem: z.string().trim().min(40).max(6000),
    desiredOutcome: z.string().trim().min(20).max(3000),
    priorAttempts: z.string().trim().max(3000).default(""),
    sanitizedLinks: z.array(z.string().url()).max(5),
    path: z.enum(["normal", "priority"]),
    termsAccepted: z.literal(true),
    turnstileToken: z.string().min(1),
    website: z.string().max(0),
  }),
);
export type IntakeInput = z.infer<typeof IntakeInput>;
