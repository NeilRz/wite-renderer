import { NextResponse } from "next/server";
import { AUTH_COOKIE } from "@/lib/auth";

export async function POST(req: Request) {
  const url = new URL("/login", req.url);
  const res = NextResponse.redirect(url, { status: 303 });
  res.cookies.delete(AUTH_COOKIE.name);
  return res;
}
