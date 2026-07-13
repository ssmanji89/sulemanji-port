import type { Env } from "../env";

interface AccessJwk {
  kid?: string;
  kty: string;
  alg?: string;
  use?: string;
  n?: string;
  e?: string;
}

interface AccessJwtHeader {
  alg?: string;
  kid?: string;
}

interface AccessJwtPayload {
  aud?: string | string[];
  email?: string;
  exp?: number;
  iss?: string;
  nbf?: number;
}

export const verifyCloudflareAccessAdmin = async (
  request: Request,
  env: Env,
  fetcher: typeof fetch = fetch,
): Promise<string | null> => {
  if (!env.ACCESS_TEAM_DOMAIN || !env.ACCESS_AUD || !env.ADMIN_EMAIL) {
    return null;
  }

  const token = request.headers.get("cf-access-jwt-assertion");
  if (!token) return null;

  const parts = token.split(".");
  if (parts.length !== 3) return null;
  const [encodedHeader, encodedPayload, encodedSignature] = parts as [
    string,
    string,
    string,
  ];

  const header = parseJwtPart<AccessJwtHeader>(encodedHeader);
  const payload = parseJwtPart<AccessJwtPayload>(encodedPayload);
  if (!header || !payload || header.alg !== "RS256" || !header.kid) {
    return null;
  }

  if (!validAccessClaims(payload, env)) {
    return null;
  }

  const jwk = await accessJwkFor(env.ACCESS_TEAM_DOMAIN, header.kid, fetcher);
  if (!jwk) return null;

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["verify"],
  );
  const signature = base64UrlToBytes(encodedSignature);
  const signed = new TextEncoder().encode(`${encodedHeader}.${encodedPayload}`);
  const verified = await crypto.subtle.verify(
    "RSASSA-PKCS1-v1_5",
    key,
    signature,
    signed,
  );

  return verified ? payload.email ?? null : null;
};

const accessJwkFor = async (
  teamDomain: string,
  kid: string,
  fetcher: typeof fetch,
): Promise<JsonWebKey | null> => {
  const normalizedDomain = teamDomain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const response = await fetcher(
    `https://${normalizedDomain}/cdn-cgi/access/certs`,
  );
  if (!response.ok) return null;

  const body = await response.json<{ keys?: AccessJwk[] }>();
  const key = body.keys?.find((candidate) => candidate.kid === kid);
  if (!key || key.kty !== "RSA" || !key.n || !key.e) return null;

  return {
    ...key,
    alg: key.alg ?? "RS256",
    ext: true,
    key_ops: ["verify"],
  };
};

const validAccessClaims = (payload: AccessJwtPayload, env: Env): boolean => {
  const now = Math.floor(Date.now() / 1000);
  const issuer = `https://${env.ACCESS_TEAM_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}`;

  return (
    payload.email === env.ADMIN_EMAIL &&
    payload.iss === issuer &&
    audienceIncludes(payload.aud, env.ACCESS_AUD) &&
    typeof payload.exp === "number" &&
    payload.exp > now &&
    (typeof payload.nbf !== "number" || payload.nbf <= now)
  );
};

const audienceIncludes = (
  audience: string | string[] | undefined,
  expected: string,
): boolean =>
  Array.isArray(audience) ? audience.includes(expected) : audience === expected;

const parseJwtPart = <T>(part: string): T | null => {
  try {
    return JSON.parse(new TextDecoder().decode(base64UrlToBytes(part))) as T;
  } catch {
    return null;
  }
};

const base64UrlToBytes = (value: string): Uint8Array => {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = `${normalized}${"=".repeat((4 - (normalized.length % 4)) % 4)}`;
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};
