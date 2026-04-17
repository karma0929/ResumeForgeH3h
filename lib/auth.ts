import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "node:crypto";
import { getSessionSecret, isProductionEnvironment, allowDevelopmentMocks } from "@/lib/env";
import { AuthenticationError } from "@/lib/errors";
import { logEvent } from "@/lib/logger";

export const SESSION_COOKIE = "resumeforge-session";
export const LEGACY_SESSION_EMAIL_COOKIE = "resumeforge-session-email";
export const LEGACY_SESSION_NAME_COOKIE = "resumeforge-session-name";

export interface SessionIdentity {
  userId: string;
  email: string;
  name: string;
  role: "USER" | "ADMIN";
}

interface SessionPayload extends SessionIdentity {
  exp: number;
}

function sign(value: string) {
  return createHmac("sha256", getSessionSecret()).update(value).digest("base64url");
}

function encodeSession(payload: SessionPayload) {
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${body}.${sign(body)}`;
}

function decodeSession(raw: string): SessionIdentity | null {
  try {
    const [body, signature] = raw.split(".");

    if (!body || !signature) {
      return null;
    }

    const expected = sign(body);
    const providedBuffer = Buffer.from(signature, "utf8");
    const expectedBuffer = Buffer.from(expected, "utf8");

    if (providedBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!timingSafeEqual(providedBuffer, expectedBuffer)) {
      return null;
    }

    const payload = JSON.parse(Buffer.from(body, "base64url").toString("utf8")) as SessionPayload;

    if (!payload.exp || payload.exp < Date.now()) {
      return null;
    }

    return {
      userId: payload.userId,
      email: payload.email,
      name: payload.name,
      role: payload.role,
    };
  } catch {
    return null;
  }
}

export async function getSessionIdentity(): Promise<SessionIdentity | null> {
  const store = await cookies();
  const signedSession = store.get(SESSION_COOKIE)?.value;

  if (signedSession) {
    const identity = decodeSession(signedSession);

    if (!identity) {
      logEvent("warn", "Rejected invalid session cookie.");
      return null;
    }

    return identity;
  }

  if (!allowDevelopmentMocks) {
    return null;
  }

  const email = store.get(LEGACY_SESSION_EMAIL_COOKIE)?.value;
  const name = store.get(LEGACY_SESSION_NAME_COOKIE)?.value;

  if (!email) {
    return null;
  }

  return {
    userId: "local-demo-user",
    email,
    name: name ?? email.split("@")[0],
    role: email === "demo@resumeforge.dev" ? "ADMIN" : "USER",
  };
}

export async function createSession(identity: SessionIdentity) {
  const store = await cookies();
  const maxAge = 60 * 60 * 24 * 30;
  const value = encodeSession({
    ...identity,
    exp: Date.now() + maxAge * 1000,
  });

  store.set(SESSION_COOKIE, value, {
    path: "/",
    maxAge,
    sameSite: "lax",
    httpOnly: true,
    secure: isProductionEnvironment,
  });
}

export async function clearSession() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
  store.delete(LEGACY_SESSION_EMAIL_COOKIE);
  store.delete(LEGACY_SESSION_NAME_COOKIE);
}

export async function requireSessionIdentity() {
  const identity = await getSessionIdentity();

  if (!identity) {
    throw new AuthenticationError();
  }

  return identity;
}
