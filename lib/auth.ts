/**
 * Hand-rolled shared-password auth. Keeps the dependency surface tiny.
 *
 * On successful login we set a signed cookie `wite_auth` whose value
 * is `HMAC_SHA256(AUTH_SECRET, "wite-ok")`. Middleware just recomputes
 * the HMAC and compares — constant-time. No DB, no NextAuth.
 */

import { createHmac, timingSafeEqual } from "node:crypto";

const COOKIE_NAME = "wite_auth";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

function signature(): string {
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error("AUTH_SECRET not set");
  return createHmac("sha256", secret).update("wite-ok").digest("hex");
}

export function expectedCookieValue(): string {
  return signature();
}

export function cookieIsValid(value: string | undefined): boolean {
  if (!value) return false;
  const expected = signature();
  if (value.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(value), Buffer.from(expected));
}

export function passwordMatches(submitted: string): boolean {
  const expected = process.env.APP_PASSWORD ?? "";
  if (!expected) return false;
  if (submitted.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(submitted), Buffer.from(expected));
}

export const AUTH_COOKIE = {
  name: COOKIE_NAME,
  maxAge: COOKIE_MAX_AGE,
};
