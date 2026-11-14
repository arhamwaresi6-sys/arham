"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "../../components/AuthProvider";

const ROOT_EMAIL = "arhamwaresi6@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const { client } = useAuth();
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sending, setSending] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    if (!client) {
      setError("Supabase isn’t configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local, then restart Next.js.");
      return;
    }
    setSending(true);
    try {
      if (mode === "signup") {
        const { data, error: authError } = await client.auth.signUp({
          email,
          password,
          options: { data: { display_name: name.trim() } },
        });
        if (authError) throw authError;
        if (data.session) router.push("/profile");
        else setMessage("Account created. Check your email to confirm your address, then sign in.");
      } else {
        const { data, error: authError } = await client.auth.signInWithPassword({ email, password });
        if (authError) throw authError;
        router.push(data.user?.email?.trim().toLowerCase() === ROOT_EMAIL ? "/admin" : "/profile");
      }
    } catch (authError) {
      setError(authError.message || "We couldn’t complete that request.");
    } finally {
      setSending(false);
    }
  }

  async function signInWithGoogle() {
    setError("");
    setMessage("");
    if (!client) {
      setError("Supabase isn’t configured. Add NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY) to .env.local, then restart Next.js.");
      return;
    }

    setSending(true);
    try {
      const { error: authError } = await client.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (authError) throw authError;
    } catch (authError) {
      setError(authError.message || "We couldn’t start Google sign-in.");
      setSending(false);
    }
  }

  return (
    <main className="auth-page">
      <section className="auth-card">
        <p className="eyebrow">WELCOME TO RONGKUSHOL</p>
        <h1>{mode === "login" ? "Good to see you." : "Make yourself at home."}</h1>
        <p className="auth-lede">{mode === "login" ? "Sign in to share a review and manage your profile." : "Create an account to make the good stuff yours."}</p>
        <form className="auth-form" onSubmit={submit}>
          {mode === "signup" && (
            <label>
              Name
              <input autoComplete="name" value={name} onChange={(event) => setName(event.target.value)} required maxLength={60} />
            </label>
          )}
          <label>
            Email
            <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
          </label>
          <label>
            Password
            <input type="password" autoComplete={mode === "login" ? "current-password" : "new-password"} value={password} onChange={(event) => setPassword(event.target.value)} minLength={8} required />
          </label>
          {error && <p className="form-message error-message" role="alert">{error}</p>}
          {message && <p className="form-message success-message" role="status">{message}</p>}
          <button className="button button-dark auth-submit" type="submit" disabled={sending}>
            {sending ? "One moment…" : mode === "login" ? "Sign in" : "Create account"}
          </button>
        </form>
        <div className="auth-divider"><span>or</span></div>
        <button className="google-sign-in" type="button" onClick={signInWithGoogle} disabled={sending}>
          <svg viewBox="0 0 48 48" aria-hidden="true">
            <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.7-4.3 6.1v5h7c4.1-3.8 6.4-9.3 6.4-14.8z" />
            <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-7-5.3c-1.9 1.3-4.1 2-6.5 2-5 0-9.2-3.4-10.7-8H6v5.5C9.4 39.8 16.2 44 24 44z" />
            <path fill="#FBBC05" d="M13.3 27.9a12 12 0 0 1 0-7.8v-5.5H6a20 20 0 0 0 0 18.8l7.3-5.5z" />
            <path fill="#EA4335" d="M24 12.1c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.9 29.5 4 24 4 16.2 4 9.4 8.2 6 14.6l7.3 5.5c1.5-4.6 5.7-8 10.7-8z" />
          </svg>
          {sending ? "Connecting to Google…" : "Continue with Google"}
        </button>
        <p className="auth-switch">
          {mode === "login" ? "New around here?" : "Already have an account?"}{" "}
          <button type="button" onClick={() => { setMode(mode === "login" ? "signup" : "login"); setError(""); setMessage(""); }}>
            {mode === "login" ? "Create an account" : "Sign in"}
          </button>
        </p>
        <Link className="text-link" href="/shop">Continue browsing <span>↗</span></Link>
      </section>
    </main>
  );
}
