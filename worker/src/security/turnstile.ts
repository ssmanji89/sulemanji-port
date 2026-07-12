import type { Env } from "../env";

export async function verifyTurnstile(
  env: Env,
  token: string,
  ip?: string,
): Promise<boolean> {
  if (env.TURNSTILE_TEST_BYPASS && token === env.TURNSTILE_TEST_BYPASS) {
    return true;
  }

  if (!env.TURNSTILE_SECRET) {
    return false;
  }

  const body = new URLSearchParams({
    secret: env.TURNSTILE_SECRET,
    response: token,
  });
  if (ip) body.set("remoteip", ip);

  try {
    const response = await fetch(
      "https://challenges.cloudflare.com/turnstile/v0/siteverify",
      { method: "POST", body },
    );
    const result = (await response.json()) as { success?: boolean };
    return response.ok && Boolean(result.success);
  } catch {
    return false;
  }
}
