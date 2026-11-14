"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../../components/AuthProvider";

const ROOT_EMAIL = "arhamwaresi6@gmail.com";

export default function AuthCallbackPage() {
  const router = useRouter();
  const { client } = useAuth();
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    async function finishSignIn() {
      if (!client) {
        setError("Supabase isn’t configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local, then restart Next.js.");
        return;
      }

      try {
        const { data, error: sessionError } = await client.auth.getSession();
        if (sessionError) throw sessionError;
        const user = data.session?.user;
        if (!user) throw new Error("Google sign-in did not return an active session.");
        if (!active) return;
        router.replace(user.email?.trim().toLowerCase() === ROOT_EMAIL ? "/admin" : "/profile");
      } catch (authError) {
        if (active) setError(authError.message || "Google sign-in could not be completed.");
      }
    }

    finishSignIn();
    return () => {
      active = false;
    };
  }, [client, router]);

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">GOOGLE SIGN-IN</p>
        <h1>{error ? "Let’s try that again." : "Finishing up."}</h1>
        {error ? (
          <>
            <p className="form-message error-message" role="alert">{error}</p>
            <Link className="button button-dark auth-submit" href="/login">Back to sign in</Link>
          </>
        ) : (
          <p className="auth-lede" role="status">Confirming your account and getting your space ready…</p>
        )}
      </section>
    </main>
  );
}
