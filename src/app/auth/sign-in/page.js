"use client";

import Link from "next/link";
import { signIn } from "@/app/actions/auth-actions";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { useDispatch } from "react-redux";
import { setCredentials } from "@/store/features/auth/authSlice";

export default function SignInPage() {
  const router = useRouter();
  const dispatch = useDispatch();

  const handleSignIn = async (prevState, formData) => {
    const result = await signIn(prevState, formData);
    if (result?.user) {
      dispatch(setCredentials({ user: result.user }));
      router.push("/");
    }
    return result;
  };
  const [state, action, isPending] = useActionState(handleSignIn, null); // TODO: handle error state
  return (
    <main className="relative min-h-screen flex items-center justify-center overflow-hidden bg-[#09090b] text-white">
      {/* Background decoration */}
      <div className="absolute inset-0 z-0">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(59,130,246,0.1),transparent_50%)]" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        <div className="mb-8 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-2xl font-bold tracking-tighter text-white mb-6"
          >
            <div className="h-8 w-8 rounded-lg bg-blue-500" />
            PlayChess
          </Link>
          <h1 className="text-3xl font-bold">Sign In</h1>
          <p className="mt-2 text-gray-400">Welcome back, Grandmaster</p>
        </div>

        <div className="rounded-2xl border border-white/10 bg-white/5 p-8 backdrop-blur-md shadow-2xl">
          <form action={action} className="space-y-6">
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="text-sm font-medium text-gray-300"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="you@example.com"
              />
            </div>

            <div className="space-y-2">
              <label
                htmlFor="password"
                className="text-sm font-medium text-gray-300"
              >
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-3 text-white placeholder-gray-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all"
                placeholder="••••••••"
              />
            </div>
            {state?.error && (
              <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-400 border border-red-500/20">
                {state.error}
              </div>
            )}

            {state?.success && (
              <div className="rounded-lg bg-green-500/10 p-3 text-sm text-green-400 border border-green-500/20">
                {state.success}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white transition-all hover:bg-blue-500 hover:shadow-lg hover:shadow-blue-500/25 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? "Signing in..." : "Sign In"}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Don't have an account?{" "}
            <Link
              href="/auth/sign-up"
              className="text-blue-400 hover:text-blue-300 transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
