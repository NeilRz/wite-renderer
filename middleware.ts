/**
 * Edge middleware: gates everything except /login and /api/login.
 *
 * Uses Web Crypto (HMAC-SHA256) since the Node `crypto` module
 * isn't available on the Edge runtime.
 */

import { NextRequest, NextResponse } from "next/server";

const PUBLIC_PATHS = new Set([
  "/login",
  "/api/login",
  "/api/logout",
  "/favicon.ico",
]);

async function hmacHex(secret: string, message: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function timingSafeEq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (
    PUBLIC_PATHS.has(pathname) ||
    pathname.startsWith("/_next/") ||
    pathname.startsWith("/catalog/")
  ) {
    return NextResponse.next();
  }

  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    // Fail closed: misconfigured server should not allow access.
    return new NextResponse("Server misconfigured: AUTH_SECRET missing", {
      status: 500,
    });
  }

  const cookie = req.cookies.get("wite_auth")?.value;
  const expected = await hmacHex(secret, "wite-ok");
  if (cookie && timingSafeEq(cookie, expected)) {
    return NextResponse.next();
  }

  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  // Run on everything except Next internals + static catalog assets.
  matcher: ["/((?!_next/|catalog/|favicon.ico).*)"],
};
