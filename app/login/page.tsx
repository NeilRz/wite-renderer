import { redirect } from "next/navigation";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const sp = await searchParams;
  const next = sp.next ?? "/";
  const error = sp.error;

  async function login(formData: FormData) {
    "use server";
    const { passwordMatches, expectedCookieValue, AUTH_COOKIE } = await import(
      "@/lib/auth"
    );
    const { cookies } = await import("next/headers");

    const submitted = String(formData.get("password") ?? "");
    if (!passwordMatches(submitted)) {
      redirect(`/login?next=${encodeURIComponent(next)}&error=1`);
    }
    const jar = await cookies();
    jar.set(AUTH_COOKIE.name, expectedCookieValue(), {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: AUTH_COOKIE.maxAge,
    });
    redirect(next);
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <h1 className="text-4xl font-light tracking-tight">WITE</h1>
        <p className="mt-1 text-xs uppercase tracking-[0.25em] text-stone-500">
          Accès interne
        </p>
        <form action={login} className="mt-10 space-y-4">
          <label className="block">
            <span className="text-xs uppercase tracking-wider text-stone-500">
              Mot de passe
            </span>
            <input
              type="password"
              name="password"
              autoComplete="current-password"
              autoFocus
              required
              className="mt-1 w-full rounded border border-stone-300 bg-white px-3 py-2"
            />
          </label>
          {error && (
            <p className="text-sm text-red-700">Mot de passe incorrect.</p>
          )}
          <button
            type="submit"
            className="w-full rounded bg-stone-900 px-4 py-3 text-sm uppercase tracking-wider text-white hover:bg-stone-700"
          >
            Entrer
          </button>
        </form>
      </div>
    </main>
  );
}
