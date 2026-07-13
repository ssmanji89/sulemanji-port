export const remainingBalance = (totalCents: number, creditCents: number): number =>
  Math.max(0, totalCents - creditCents);

export const quoteExpiresAt = (blueprintDeliveredAt: Date): Date =>
  new Date(blueprintDeliveredAt.getTime() + 60 * 86_400_000);

export const holdExpiresAt = (now: Date): Date =>
  new Date(now.getTime() + 15 * 60_000);
